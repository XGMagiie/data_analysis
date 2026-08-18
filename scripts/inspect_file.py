from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from typing import Any

import pandas as pd
from charset_normalizer import from_bytes

from utils import SUPPORTED_SUFFIXES, classify_series, load_config, make_unique_columns, json_safe


def _cell_kind(v: Any) -> str:
    if v is None or (isinstance(v, float) and math.isnan(v)) or pd.isna(v):
        return "empty"
    s = str(v).strip()
    if not s:
        return "empty"
    try:
        float(s.replace(",", ""))
        return "numeric"
    except Exception:
        pass
    try:
        parsed = pd.to_datetime([s], errors="coerce")
        if parsed.notna().all() and any(ch in s for ch in "-/:年月日"):
            return "datetime"
    except Exception:
        pass
    return "text"


def detect_header(preview: pd.DataFrame, config: dict[str, Any]) -> dict[str, Any]:
    if preview.empty or preview.shape[1] == 0:
        return {"header_detected": False, "header_row": None, "header_confidence": 0.0, "scores": []}
    candidates = min(config["header_candidate_rows"], len(preview))
    scores = []
    for r in range(candidates):
        row = preview.iloc[r]
        vals = [v for v in row.tolist() if not pd.isna(v) and str(v).strip()]
        if not vals:
            scores.append({"row": r, "score": 0.0})
            continue
        kinds = [_cell_kind(v) for v in vals]
        text_frac = kinds.count("text") / len(kinds)
        numeric_frac = kinds.count("numeric") / len(kinds)
        nonempty_frac = len(vals) / max(1, preview.shape[1])
        unique_frac = len(set(map(str, vals))) / len(vals)

        following = preview.iloc[r + 1 : min(len(preview), r + 6)]
        contrast = 0.0
        if not following.empty:
            per_col = []
            for c in range(preview.shape[1]):
                head_kind = _cell_kind(row.iloc[c])
                data_kinds = [_cell_kind(x) for x in following.iloc[:, c].tolist()]
                data_kinds = [k for k in data_kinds if k != "empty"]
                if data_kinds and head_kind != max(set(data_kinds), key=data_kinds.count):
                    per_col.append(1.0)
                elif data_kinds:
                    per_col.append(0.0)
            contrast = sum(per_col) / len(per_col) if per_col else 0.0
        score = 0.30 * text_frac + 0.25 * nonempty_frac + 0.20 * unique_frac + 0.25 * contrast - 0.15 * numeric_frac
        score = max(0.0, min(1.0, score))
        scores.append({"row": r, "score": round(score, 4)})

    best = max(scores, key=lambda x: x["score"])
    detected = best["score"] >= 0.45
    return {
        "header_detected": detected,
        "header_row": best["row"] if detected else None,
        "header_confidence": best["score"],
        "scores": scores,
        "needs_confirmation": detected and best["score"] < config["header_confidence_threshold"],
    }


def detect_csv(path: Path, config: dict[str, Any]) -> dict[str, Any]:
    raw = path.read_bytes()[: min(path.stat().st_size, 1024 * 1024)]
    best = from_bytes(raw).best()
    encoding = best.encoding if best else "utf-8"
    encoding_conf = getattr(best, "percent_coherence", None) if best else None
    try:
        text = raw.decode(encoding or "utf-8", errors="replace")
    except Exception:
        encoding = "utf-8"
        text = raw.decode("utf-8", errors="replace")
    sample = text[:100_000]
    delimiter = None
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except csv.Error:
        counts = {d: sample.count(d) for d in [",", ";", "\t", "|"]}
        delimiter = max(counts, key=counts.get) if max(counts.values()) > 0 else ","

    preview = pd.read_csv(path, sep=delimiter, encoding=encoding, header=None, nrows=config["header_preview_rows"], engine="python")
    header = detect_header(preview, config)
    return {
        "format": "csv",
        "encoding": encoding,
        "encoding_coherence": encoding_conf,
        "delimiter": delimiter,
        "preview": preview.fillna("").astype(str).values.tolist(),
        "header": header,
    }


def inspect_excel(path: Path, config: dict[str, Any], sheet: str | None = None) -> dict[str, Any]:
    suffix = path.suffix.lower()
    if suffix == ".xls":
        try:
            __import__("xlrd")
        except Exception as exc:
            raise RuntimeError("Legacy .xls files require xlrd. Obtain user permission before installing it.") from exc
    engine = "openpyxl" if suffix in {".xlsx", ".xlsm"} else None
    xls = pd.ExcelFile(path, engine=engine)
    sheet_names = list(xls.sheet_names)
    if sheet is None and len(sheet_names) > 1:
        return {
            "format": "excel",
            "sheet_names": sheet_names,
            "requires_sheet_selection": True,
            "message": "Multiple sheets found; select a sheet or explicitly request all-sheet handling.",
        }
    selected = sheet or sheet_names[0]
    if selected not in sheet_names:
        raise ValueError(f"Unknown sheet: {selected}. Available sheets: {sheet_names}")
    preview = pd.read_excel(path, sheet_name=selected, header=None, nrows=config["header_preview_rows"], engine=engine)
    header = detect_header(preview, config)
    merged_ranges = []
    if suffix in {".xlsx", ".xlsm"} and path.stat().st_size < config.get("large_file_bytes", 134217728):
        try:
            from openpyxl import load_workbook
            wb = load_workbook(path, read_only=False, data_only=True, keep_links=False)
            ws = wb[selected]
            merged_ranges = [str(r) for r in list(ws.merged_cells.ranges)[:100]]
            wb.close()
        except Exception:
            merged_ranges = []
    return {
        "format": "excel",
        "sheet_names": sheet_names,
        "sheet": selected,
        "requires_sheet_selection": False,
        "preview": preview.fillna("").astype(str).values.tolist(),
        "header": header,
        "merged_range_count": len(merged_ranges),
        "merged_ranges_preview": merged_ranges[:20],
    }


def inspect_file(path: str | Path, sheet: str | None = None, config_path: str | Path | None = None) -> dict[str, Any]:
    config = load_config(config_path)
    p = Path(path).expanduser().resolve()
    result: dict[str, Any] = {
        "path": str(p),
        "exists": p.exists(),
        "suffix": p.suffix.lower(),
    }
    if not p.exists() or not p.is_file():
        raise FileNotFoundError(f"Input file not found: {p}")
    if p.suffix.lower() not in SUPPORTED_SUFFIXES:
        raise ValueError(f"Unsupported file type {p.suffix}. V1 supports CSV and Excel files only.")
    result["size_bytes"] = p.stat().st_size
    if result["size_bytes"] == 0:
        raise ValueError("Input file is empty.")

    detail = detect_csv(p, config) if p.suffix.lower() == ".csv" else inspect_excel(p, config, sheet)
    result.update(detail)
    return json_safe(result)


def _read_with_header(path: Path, inspection: dict[str, Any], header_mode: str, sheet: str | None) -> tuple[pd.DataFrame, dict[str, Any]]:
    suffix = path.suffix.lower()
    detected = inspection.get("header", {})
    if header_mode == "auto":
        if detected.get("needs_confirmation"):
            raise RuntimeError("Header detection confidence is low. Confirm the header row or use --header none/N before analysis.")
        header_row = detected.get("header_row") if detected.get("header_detected") else None
    elif header_mode == "none":
        header_row = None
    else:
        try:
            header_row = int(header_mode)
        except ValueError as exc:
            raise ValueError("--header must be auto, none, or a zero-based row number") from exc

    if suffix == ".csv":
        df = pd.read_csv(path, sep=inspection["delimiter"], encoding=inspection["encoding"], header=header_row, engine="python")
    else:
        engine = "openpyxl" if suffix in {".xlsx", ".xlsm"} else None
        df = pd.read_excel(path, sheet_name=sheet or inspection.get("sheet"), header=header_row, engine=engine)
    original_columns = list(df.columns)
    if header_row is None:
        df.columns = [f"X{i+1}" for i in range(df.shape[1])]
        mapping = [{"position": i, "original": None, "normalized": col} for i, col in enumerate(df.columns)]
    else:
        cols, mapping = make_unique_columns(original_columns)
        df.columns = cols
    meta = {"header_row": header_row, "column_mapping": mapping}
    return df, meta


def load_validated_dataframe(path: str | Path, sheet: str | None = None, header_mode: str = "auto", config_path: str | Path | None = None):
    p = Path(path).expanduser().resolve()
    config = load_config(config_path)
    if p.stat().st_size > config.get("max_auto_load_bytes", 536870912):
        raise RuntimeError(
            f"Input file is {p.stat().st_size / 1048576:.1f} MB, above the V1 automatic-load limit. "
            "Do not risk an out-of-memory failure; ask the user to provide a smaller extract or explicitly use a future chunked-analysis workflow."
        )
    inspection = inspect_file(p, sheet=sheet, config_path=config_path)
    if inspection.get("requires_sheet_selection"):
        raise RuntimeError("Multiple Excel sheets found. Select one with --sheet before analysis.")
    df, meta = _read_with_header(p, inspection, header_mode, sheet)
    if df.shape[1] == 0:
        raise ValueError("No columns were found after parsing the file.")
    type_info = {col: classify_series(df[col], col, config) for col in df.columns}
    inspection["data_shape"] = {"rows": int(len(df)), "columns": int(df.shape[1])}
    inspection["schema"] = [{"name": col, **type_info[col]} for col in df.columns]
    inspection.update(meta)
    return df, type_info, inspection


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and inspect a CSV/Excel file without modifying it.")
    parser.add_argument("file")
    parser.add_argument("--sheet")
    parser.add_argument("--header", default="auto", help="auto, none, or zero-based row index")
    parser.add_argument("--config")
    args = parser.parse_args()
    try:
        result = inspect_file(args.file, sheet=args.sheet, config_path=args.config)
        if not result.get("requires_sheet_selection") and args.header != "auto":
            df, types, result = load_validated_dataframe(args.file, sheet=args.sheet, header_mode=args.header, config_path=args.config)
        print(json.dumps(json_safe(result), ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
