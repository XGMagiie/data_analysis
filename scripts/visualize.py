from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from utils import json_safe

# V2: charts are rendered client-side (vanilla JS/SVG) for interactivity.
# This module only exports bounded, reproducible plot data into
# analysis_result.json. No static images are produced.
#
# All columns share the SAME sampled row indices, so client-side pair charts
# and time-axis line charts stay row-aligned. A shared time axis is exported
# when the dataset has a datetime column.


def _sample_indices(n: int, max_rows: int, seed: int) -> tuple[np.ndarray, bool]:
    if n <= max_rows:
        return np.arange(n), False
    rng = np.random.default_rng(seed)
    return np.sort(rng.choice(n, size=max_rows, replace=False)), True


def _export_numeric(series: pd.Series) -> dict[str, Any]:
    vals = pd.to_numeric(series, errors="coerce").replace([np.inf, -np.inf], np.nan)
    return {
        "type": "numeric",
        "values": json_safe(list(vals)),
    }


def _export_categorical(full_series: pd.Series, sampled_series: pd.Series, top_k: int) -> dict[str, Any]:
    """Category values come from the sampled (aligned) rows, but counts are
    computed on the FULL column so percentages reflect all data."""
    vc = full_series.dropna().astype(str).value_counts().head(top_k)
    return {
        "type": "categorical",
        "values": json_safe(list(sampled_series.astype(str))),
        "counts": [{"label": str(k), "count": int(v)} for k, v in vc.items()],
    }


def _export_datetime(series: pd.Series) -> dict[str, Any]:
    dt = pd.to_datetime(series, errors="coerce", utc=False)
    return {"type": "datetime", "values": json_safe(list(dt))}


def export_plot_data(
    df: pd.DataFrame,
    type_info: dict[str, dict[str, Any]],
    config: dict[str, Any],
    usable_columns: list[str] | None = None,
) -> dict[str, Any]:
    """Export bounded per-column series for client-side interactive charts.

    All columns are sampled on the same row indices so charts stay aligned.
    A shared `x_axis` (the first datetime column, if any) is exported for
    time-based line charts. Excluded columns are kept separately.
    """
    seed = config["random_seed"]
    usable = set(usable_columns) if usable_columns is not None else set(df.columns)

    idx, sampled = _sample_indices(len(df), config["plot_sample_size"], seed)
    sampled_df = df.iloc[idx]

    x_axis = None
    dt_col = next((c for c in df.columns if type_info[c]["semantic_type"] == "datetime"), None)
    if dt_col is not None:
        dt = pd.to_datetime(sampled_df[dt_col], errors="coerce", utc=False)
        x_axis = {"name": dt_col, "values": json_safe(list(dt))}

    series: dict[str, dict[str, Any]] = {}
    excluded: list[dict[str, Any]] = []
    order: list[str] = []
    top_k = config["top_k_categories"]

    for col in df.columns:
        t = type_info[col]["semantic_type"]
        s = sampled_df[col]
        if t == "numeric":
            exported = _export_numeric(s)
        elif t in {"categorical", "boolean"}:
            exported = _export_categorical(df[col], s, top_k)
        elif t == "datetime":
            exported = _export_datetime(s)
        else:
            non_null = s.dropna().astype(str)
            vc = df[col].dropna().astype(str).value_counts().head(top_k)
            exported = {
                "type": t,
                "values": json_safe(list(s.astype(str))),
                "counts": [{"label": str(k), "count": int(v)} for k, v in vc.items()],
            }
        # Full-data value counts for low-cardinality columns, so the UI can
        # compute shares from ALL rows even when a column is re-typed to
        # categorical client-side.
        full = df[col].dropna()
        if full.nunique() <= config["full_counts_max_cardinality"]:
            full_vc = full.astype(str).value_counts().head(top_k)
            exported["full_counts"] = [{"label": str(k), "count": int(v)} for k, v in full_vc.items()]
        if col in usable:
            series[col] = exported
            order.append(col)
        else:
            excluded.append({"name": col, "type": t, "series": exported})

    return {
        "columns": order,
        "series": series,
        "excluded": excluded,
        "x_axis": x_axis,
        "sampled": sampled,
        "original_count": int(len(df)),
        "plotted_count": int(len(idx)),
    }
