from __future__ import annotations

import argparse
import sys
from pathlib import Path

from correlation import analyze_correlations
from inspect_file import load_validated_dataframe
from profile_data import profile_dataframe
from utils import load_config, write_json
from visualize import generate_pairwise, generate_univariate


def run_analysis(file: str, output: str, sheet: str | None = None, header: str = "auto", pairs: list[list[str]] | None = None, correlation_method: str = "pearson", correlation_threshold: float | None = None, config_path: str | None = None, force: bool = False) -> Path:
    config = load_config(config_path)
    out = Path(output).expanduser().resolve()
    if out.exists() and any(out.iterdir()) and not force:
        raise FileExistsError(f"Output directory is not empty: {out}. Use --force only after overwrite is approved.")
    out.mkdir(parents=True, exist_ok=True)
    images = out / "assets" / "images"
    images.mkdir(parents=True, exist_ok=True)

    df, type_info, inspection = load_validated_dataframe(file, sheet=sheet, header_mode=header, config_path=config_path)
    profile = profile_dataframe(df, type_info, config)
    univariate = generate_univariate(df, type_info, images, config)
    relationships = generate_pairwise(df, type_info, pairs or [], images, config)
    correlations = analyze_correlations(df, type_info, images, config, preferred_method=correlation_method, threshold=correlation_threshold)

    warnings = []
    if len(df) >= config["large_row_threshold"]:
        warnings.append({"code":"large_dataset","message":f"Dataset has {len(df):,} rows; plot sampling limits were applied where needed."})
    if df.shape[1] >= config["wide_table_threshold"]:
        warnings.append({"code":"wide_dataset","message":f"Dataset has {df.shape[1]} columns; automatic plots/correlations are bounded for readability."})
    if correlations.get("truncated"):
        warnings.append({"code":"correlation_truncated","message":"Correlation matrix feature count exceeded the configured display limit."})

    result = {
        "source": {"file": str(Path(file).expanduser().resolve()), "sheet": sheet, "header_mode": header},
        "inspection": inspection,
        "profile": profile,
        "visualizations": {"univariate": univariate, "relationships": relationships},
        "correlations": correlations,
        "warnings": warnings,
        "config_used": config,
    }
    result_path = out / "analysis_result.json"
    write_json(result_path, result)
    return result_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run initial CSV/Excel analysis and produce machine-readable results and charts.")
    parser.add_argument("file")
    parser.add_argument("--output", required=True)
    parser.add_argument("--sheet")
    parser.add_argument("--header", default="auto", help="auto, none, or zero-based header row")
    parser.add_argument("--pair", nargs=2, action="append", default=[])
    parser.add_argument("--correlation-method", choices=["pearson","spearman"], default="pearson")
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
