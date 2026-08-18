from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from utils import json_safe

# V2: correlation matrices are exported as JSON; heatmaps and threshold
# networks are rendered and re-filtered client-side (with a live threshold
# slider). No static chart images are produced.


def _usable_numeric(df: pd.DataFrame, type_info: dict[str, dict[str, Any]]) -> list[str]:
    cols = []
    for c in df.columns:
        if type_info[c]["semantic_type"] != "numeric":
            continue
        s = pd.to_numeric(df[c], errors="coerce").replace([np.inf, -np.inf], np.nan).dropna()
        if len(s) >= 3 and s.nunique() > 1:
            cols.append(c)
    return cols


def _matrix_dict(matrix: pd.DataFrame) -> dict[str, dict[str, float]]:
    if matrix.empty:
        return {}
    return json_safe(matrix.to_dict(orient="index"))


def analyze_correlations(
    df: pd.DataFrame,
    type_info: dict[str, dict[str, Any]],
    config: dict[str, Any],
    preferred_method: str | None = None,
    threshold: float | None = None,
    usable_columns: list[str] | None = None,
) -> dict[str, Any]:
    usable = _usable_numeric(df, type_info)
    if usable_columns is not None:
        usable = [c for c in usable if c in set(usable_columns)]
    max_features = config["correlation_max_features"]
    bounded = usable[:max_features]
    truncated = len(usable) > max_features
    num = df[bounded].apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan) if bounded else pd.DataFrame()

    result: dict[str, Any] = {
        "usable_numeric_features": usable,
        "matrix_features": bounded,
        "truncated": truncated,
        "methods": {},
    }
    for method in ["pearson", "spearman"]:
        matrix = num.corr(method=method) if len(bounded) else pd.DataFrame()
        result["methods"][method] = {"matrix": _matrix_dict(matrix)}

    rng = np.random.default_rng(config["random_seed"])
    k = min(config["random_feature_count"], len(usable))
    random_features = [str(x) for x in rng.choice(usable, size=k, replace=False)] if k else []
    subset: dict[str, Any] = {"features": random_features, "seed": config["random_seed"]}
    if random_features:
        rnum = df[random_features].apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)
        rmatrix = rnum.corr(method=preferred_method or "pearson")
        subset["matrix"] = _matrix_dict(rmatrix)
        subset["method"] = preferred_method or "pearson"
    result["random_subset"] = subset
    return json_safe(result)
