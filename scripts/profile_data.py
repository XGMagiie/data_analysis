from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from utils import finite_numeric, json_safe


def _numeric_profile(series: pd.Series) -> dict[str, Any]:
    raw_num = pd.to_numeric(series, errors="coerce")
    pos_inf = int(np.isposinf(raw_num).sum())
    neg_inf = int(np.isneginf(raw_num).sum())
    finite = raw_num.replace([np.inf, -np.inf], np.nan).dropna()
    q1 = finite.quantile(0.25) if len(finite) else None
    q3 = finite.quantile(0.75) if len(finite) else None
    iqr = (q3 - q1) if q1 is not None and q3 is not None else None
    outlier_count = 0
    if iqr is not None and pd.notna(iqr) and iqr > 0:
        low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outlier_count = int(((finite < low) | (finite > high)).sum())
    return json_safe({
        "count": int(series.notna().sum()),
        "missing_count": int(series.isna().sum()),
        "missing_rate": float(series.isna().mean()),
        "finite_count": int(len(finite)),
        "positive_infinity_count": pos_inf,
        "negative_infinity_count": neg_inf,
        "mean": finite.mean() if len(finite) else None,
        "median": finite.median() if len(finite) else None,
        "min": finite.min() if len(finite) else None,
        "max": finite.max() if len(finite) else None,
        "std": finite.std(ddof=1) if len(finite) > 1 else None,
        "variance": finite.var(ddof=1) if len(finite) > 1 else None,
        "q1": q1,
        "q3": q3,
        "iqr": iqr,
        "skewness": finite.skew() if len(finite) > 2 else None,
        "kurtosis": finite.kurt() if len(finite) > 3 else None,
        "zero_count": int((finite == 0).sum()),
        "zero_rate": float((finite == 0).mean()) if len(finite) else None,
        "potential_outlier_count_iqr": outlier_count,
        "potential_outlier_rate_iqr": outlier_count / len(finite) if len(finite) else None,
    })


def _categorical_profile(series: pd.Series, top_k: int) -> dict[str, Any]:
    non_null = series.dropna()
    vc = non_null.astype(str).value_counts().head(top_k)
    top_value = vc.index[0] if len(vc) else None
    top_count = int(vc.iloc[0]) if len(vc) else 0
    return {
        "count": int(series.notna().sum()),
        "missing_count": int(series.isna().sum()),
        "missing_rate": float(series.isna().mean()),
        "unique_count": int(non_null.nunique(dropna=True)),
        "unique_ratio": float(non_null.nunique(dropna=True) / len(non_null)) if len(non_null) else 0.0,
        "top_value": top_value,
        "top_count": top_count,
        "top_share": top_count / len(non_null) if len(non_null) else None,
        "top_values": [{"value": str(k), "count": int(v), "share": int(v) / len(non_null)} for k, v in vc.items()],
    }


def _datetime_profile(series: pd.Series) -> dict[str, Any]:
    dt = pd.to_datetime(series, errors="coerce", utc=False)
    valid = dt.dropna().sort_values()
    diffs = valid.diff().dropna()
    return json_safe({
        "count": int(dt.notna().sum()),
        "missing_count": int(dt.isna().sum()),
        "missing_rate": float(dt.isna().mean()),
        "earliest": valid.min() if len(valid) else None,
        "latest": valid.max() if len(valid) else None,
        "span": valid.max() - valid.min() if len(valid) > 1 else None,
        "duplicate_timestamp_count": int(valid.duplicated().sum()),
        "monotonic_increasing": bool(dt.dropna().is_monotonic_increasing) if len(valid) else None,
        "median_interval": diffs.median() if len(diffs) else None,
    })


def _long_text_ratio(series: pd.Series, min_len: int = 20) -> float:
    non_null = series.dropna()
    if not len(non_null):
        return 0.0
    text = non_null.astype(str).str.strip()
    return float((text.str.len() > min_len).mean())


def _numeric_parse_ratio(series: pd.Series) -> float:
    non_null = series.dropna()
    if not len(non_null):
        return 0.0
    numeric = pd.to_numeric(non_null.astype(str).str.replace(",", "", regex=False), errors="coerce")
    return float(numeric.notna().mean())


def _stray_like(series: pd.Series, missing_rate: float, nrows: int, config: dict[str, Any]) -> bool:
    """Detect columns that look like stray workbook content merged into the data
    table (e.g., question-solution blocks, per-group notes) rather than real
    analytical variables. Rules are conservative and only fire on combinations
    of high missingness and structurally inconsistent non-null content."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return False
    if missing_rate < config["high_missing_rate"]:
        return False
    long_text = _long_text_ratio(series) >= 0.3
    num_ratio = _numeric_parse_ratio(series)
    mixed_types = 0.2 < num_ratio < 0.8
    island = missing_rate >= 0.7 and len(non_null) <= max(10, int(0.05 * nrows))
    return bool(long_text or mixed_types or island)


def _flag_severity(flag: str, missing_rate: float, config: dict[str, Any]) -> str:
    if flag in {"all_missing", "stray_content_candidate"}:
        return "critical"
    if flag == "high_missing":
        return "critical" if missing_rate >= config["high_missing_critical_rate"] else "warning"
    if flag == "has_missing":
        return "info"
    if flag in {"constant", "high_cardinality", "infinity", "near_constant"}:
        return "warning"
    if flag == "id_like":
        return "info"
    return "warning"


_FLAG_DESCRIPTIONS = {
    "all_missing": "Column contains no non-missing values at all.",
    "constant": "Column has one or fewer distinct non-null values.",
    "near_constant": "Column is dominated by a single value.",
    "high_missing": "Missing rate is at or above the configured threshold.",
    "has_missing": "Column contains a small number of missing values (below the high-missing threshold).",
    "high_cardinality": "Category field has too many distinct values for reliable grouping.",
    "id_like": "Column looks like an identifier, not a measured variable.",
    "infinity": "Column contains positive or negative infinity values.",
    "stray_content_candidate": "High missingness combined with content that does not look like regular data (long titles, mixed types, or a tiny detached island). Likely stray workbook content merged into the table.",
}


def profile_dataframe(df: pd.DataFrame, type_info: dict[str, dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    nrows, ncols = df.shape
    missing_cells = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum()) if nrows else 0
    type_counts: dict[str, int] = {}
    columns = []
    quality_flags = []
    severity_counts = {"critical": 0, "warning": 0, "info": 0}

    for col in df.columns:
        t = type_info[col]["semantic_type"]
        type_counts[t] = type_counts.get(t, 0) + 1
        series = df[col]
        if t == "numeric":
            stats = _numeric_profile(series)
        elif t == "datetime":
            stats = _datetime_profile(series)
        else:
            stats = _categorical_profile(series, config["top_k_categories"])
        missing_rate = float(series.isna().mean()) if nrows else 0.0
        non_null = series.dropna()
        unique_count = int(non_null.nunique(dropna=True)) if len(non_null) else 0
        unique_ratio = unique_count / len(non_null) if len(non_null) else 0.0
        flags = []
        if len(non_null) == 0:
            flags.append("all_missing")
        if unique_count <= 1 and len(non_null) > 0:
            flags.append("constant")
        if missing_rate >= config["high_missing_rate"] and "all_missing" not in flags:
            flags.append("high_missing")
        elif missing_rate > 0 and "all_missing" not in flags:
            flags.append("has_missing")
        if missing_rate >= config["high_missing_rate"] and t not in {"datetime", "text", "unknown"}:
            if _stray_like(series, missing_rate, nrows, config):
                flags.append("stray_content_candidate")
        if t in {"categorical", "text"} and unique_ratio >= config["high_cardinality_ratio"] and unique_count > config["max_category_count"]:
            flags.append("high_cardinality")
        if t == "id_like":
            flags.append("id_like")
        if t == "numeric" and (stats.get("positive_infinity_count", 0) or stats.get("negative_infinity_count", 0)):
            flags.append("infinity")
        if missing_rate >= config["near_constant_ratio"] and t not in {"unknown"} and len(non_null) > 0 and unique_count <= 1:
            flags.append("near_constant")

        flagged = []
        for flag in flags:
            severity = _flag_severity(flag, missing_rate, config)
            severity_counts[severity] += 1
            flagged.append({
                "flag": flag,
                "severity": severity,
                "description": _FLAG_DESCRIPTIONS.get(flag, ""),
            })
            quality_flags.append({"column": col, "flag": flag, "severity": severity, "description": _FLAG_DESCRIPTIONS.get(flag, "")})
        columns.append({
            "name": col,
            "semantic_type": t,
            "type_confidence": type_info[col].get("confidence"),
            "type_reason": type_info[col].get("reason"),
            "flags": flagged,
            "statistics": stats,
        })

    result = {
        "dataset": {
            "rows": int(nrows),
            "columns": int(ncols),
            "type_counts": type_counts,
            "missing_cells": missing_cells,
            "missing_rate": missing_cells / (nrows * ncols) if nrows and ncols else 0.0,
            "duplicate_rows": duplicate_rows,
            "duplicate_rate": duplicate_rows / nrows if nrows else 0.0,
            "fully_empty_rows": int(df.isna().all(axis=1).sum()) if nrows else 0,
            "fully_empty_columns": int(df.isna().all(axis=0).sum()) if ncols else 0,
            "memory_bytes": int(df.memory_usage(deep=True).sum()),
        },
        "quality_summary": {
            "critical": severity_counts["critical"],
            "warning": severity_counts["warning"],
            "info": severity_counts["info"],
            "total_flags": len(quality_flags),
            "clean_columns": sum(1 for c in columns if not c["flags"]),
        },
        "columns": columns,
        "quality_flags": quality_flags,
    }

    # Feature selection: columns carrying critical flags or constant columns are
    # excluded from the usable analysis set (stray workbook content, all-missing
    # columns, or columns with no information content).
    usable_columns: list[str] = []
    excluded_columns: list[dict[str, Any]] = []
    for c in columns:
        flag_names = [f["flag"] for f in c["flags"]]
        is_critical = any(f["severity"] == "critical" for f in c["flags"])
        is_constant = c["semantic_type"] == "constant" or "near_constant" in flag_names
        if is_critical or is_constant:
            excluded_columns.append({
                "name": c["name"],
                "type": c["semantic_type"],
                "reasons": flag_names or ["constant"],
            })
        else:
            usable_columns.append(c["name"])
    result["usable_columns"] = usable_columns
    result["excluded_columns"] = excluded_columns
    return json_safe(result)
