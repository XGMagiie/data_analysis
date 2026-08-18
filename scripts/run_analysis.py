from __future__ import annotations

import argparse
import sys
from pathlib import Path

from correlation import analyze_correlations
from inspect_file import load_validated_dataframe
from profile_data import profile_dataframe
from utils import load_config, write_json
from visualize import export_plot_data


def run_analysis(
    file: str,
    output: str,
    sheet: str | None = None,
    header: str = "auto",
    pairs: list[list[str]] | None = None,
    correlation_method: str = "pearson",
    correlation_threshold: float | None = None,
    config_path: str | None = None,
    force: bool = False,
) -> Path:
    config = load_config(config_path)
    out = Path(output).expanduser().resolve()
    if out.exists() and any(out.iterdir()) and not force:
        raise FileExistsError(f"Output directory is not empty: {out}. Use --force only after overwrite is approved.")
    out.mkdir(parents=True, exist_ok=True)

    df, type_info, inspection = load_validated_dataframe(file, sheet=sheet, header_mode=header, config_path=config_path)
    profile = profile_dataframe(df, type_info, config)
    usable_columns = profile.get("usable_columns") or list(df.columns)
    plot_data = export_plot_data(df, type_info, config, usable_columns)
    correlations = analyze_correlations(df, type_info, config, preferred_method=correlation_method, threshold=correlation_threshold, usable_columns=usable_columns)

    # Default pairwise selection for the interactive Relationships page.
    default_pair = None
    if pairs:
        for pair in pairs:
            if len(pair) == 2 and pair[0] in usable_columns and pair[1] in usable_columns:
                default_pair = pair
                break
    if default_pair is None:
        types = type_info
        numeric_cols = [c for c in usable_columns if types[c]["semantic_type"] in {"numeric"}]
        other_cols = [c for c in usable_columns if c not in numeric_cols]
        candidates = numeric_cols + other_cols
        if len(candidates) >= 2:
            default_pair = [candidates[0], candidates[1]]

    warnings = []
    if len(df) >= config["large_row_threshold"]:
        warnings.append({"code": "large_dataset", "message": f"Dataset has {len(df):,} rows; chart data was sampled for the interactive views."})
    if df.shape[1] >= config["wide_table_threshold"]:
        warnings.append({"code": "wide_dataset", "message": f"Dataset has {df.shape[1]} columns; correlation matrices are bounded for readability."})
    if correlations.get("truncated"):
        warnings.append({"code": "correlation_truncated", "message": "Correlation matrix feature count exceeded the configured display limit."})
    if profile["quality_summary"]["critical"]:
        warnings.append({
            "code": "critical_quality_flags",
            "message": f"{profile['quality_summary']['critical']} column(s) carry critical quality flags (e.g., all-missing or stray content). Review the Data Quality page.",
        })

    result = {
        "source": {"file": str(Path(file).expanduser().resolve()), "sheet": sheet, "header_mode": header},
        "inspection": inspection,
        "profile": profile,
        "data": plot_data,
        "pairs": {"default": default_pair},
        "correlations": correlations,
        "warnings": warnings,
        "config_used": config,
    }
    result_path = out / "analysis_result.json"
    write_json(result_path, result)
    return result_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run initial CSV/Excel analysis and produce machine-readable results plus interactive plot data.")
    parser.add_argument("file")
    parser.add_argument("--output", required=True)
    parser.add_argument("--sheet")
    parser.add_argument("--header", default="auto", help="auto, none, or zero-based header row")
    parser.add_argument("--pair", nargs=2, action="append", default=[], help="Optional default feature pair for the interactive Relationships page")
    parser.add_argument("--correlation-method", choices=["pearson", "spearman"], default="pearson")
    parser.add_argument("--correlation-threshold", type=float)
    parser.add_argument("--config")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    try:
        if args.correlation_threshold is not None and not 0 <= args.correlation_threshold <= 1:
            raise ValueError("Correlation threshold must be between 0 and 1.")
        path = run_analysis(args.file, args.output, args.sheet, args.header, args.pair, args.correlation_method, args.correlation_threshold, args.config, args.force)
        print(path)
        return 0
    except Exception as exc:
        print(f"[ERROR] {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
