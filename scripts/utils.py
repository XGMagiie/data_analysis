from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd

SKILL_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = SKILL_ROOT / "assets" / "default_config.json"
SUPPORTED_SUFFIXES = {".csv", ".xlsx", ".xls", ".xlsm"}


def load_config(path: str | Path | None = None) -> dict[str, Any]:
    cfg_path = Path(path) if path else DEFAULT_CONFIG_PATH
    with cfg_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        v = float(value)
        return v if math.isfinite(v) else None
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat() if not pd.isna(value) else None
    if isinstance(value, (pd.Timedelta,)):
        return str(value)
    if isinstance(value, np.ndarray):
        return [json_safe(x) for x in value.tolist()]
    if isinstance(value, pd.Series):
        return [json_safe(x) for x in value.tolist()]
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(x) for x in value]
    if pd.isna(value):
        return None
    return value


def write_json(path: str | Path, data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as f:
        json.dump(json_safe(data), f, ensure_ascii=False, indent=2, allow_nan=False)


def make_unique_columns(columns: Iterable[Any]) -> tuple[list[str], list[dict[str, Any]]]:
    seen: dict[str, int] = {}
    unique: list[str] = []
    mapping: list[dict[str, Any]] = []
    for idx, raw in enumerate(columns, 1):
        name = "" if raw is None else str(raw).strip()
        if not name or name.lower().startswith("unnamed:"):
            name = f"X{idx}"
        count = seen.get(name, 0) + 1
        seen[name] = count
        final = name if count == 1 else f"{name}__{count}"
        unique.append(final)
        mapping.append({"position": idx - 1, "original": None if raw is None else str(raw), "normalized": final})
    return unique, mapping


def safe_asset_id(prefix: str, index: int, suffix: str = "svg") -> str:
    safe_prefix = re.sub(r"[^a-zA-Z0-9_-]+", "_", prefix).strip("_") or "asset"
    return f"{safe_prefix}_{index:03d}.{suffix}"


def sample_frame(df: pd.DataFrame, n: int, seed: int) -> tuple[pd.DataFrame, bool]:
    if len(df) <= n:
        return df, False
    return df.sample(n=n, random_state=seed), True


def finite_numeric(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    return numeric.replace([np.inf, -np.inf], np.nan).dropna()


def bool_like(series: pd.Series) -> bool:
    values = {str(x).strip().lower() for x in series.dropna().unique()[:50]}
    accepted = {"true", "false", "yes", "no", "y", "n", "0", "1", "是", "否"}
    return bool(values) and values.issubset(accepted)


def classify_series(series: pd.Series, name: str, config: dict[str, Any]) -> dict[str, Any]:
    non_null = series.dropna()
    n = len(series)
    non_null_n = len(non_null)
    unique_n = int(non_null.nunique(dropna=True)) if non_null_n else 0
    unique_ratio = unique_n / non_null_n if non_null_n else 0.0

    if non_null_n == 0:
        return {"semantic_type": "unknown", "confidence": 1.0, "reason": "all values are missing"}
    if unique_n <= 1:
        return {"semantic_type": "constant", "confidence": 1.0, "reason": "one or fewer distinct non-null values"}
    if pd.api.types.is_bool_dtype(series) or bool_like(series):
        return {"semantic_type": "boolean", "confidence": 0.98, "reason": "boolean dtype or boolean-like values"}

    name_l = name.lower()
    id_hint = bool(re.search(r"(^|[_\s-])(id|uuid|guid|serial|code|编号|序号|编码)($|[_\s-])", name_l))

    if pd.api.types.is_numeric_dtype(series):
        if id_hint and unique_ratio >= config["id_unique_ratio"]:
            return {"semantic_type": "id_like", "confidence": 0.90, "reason": "identifier-like name and high uniqueness"}
        return {"semantic_type": "numeric", "confidence": 0.99, "reason": "native numeric dtype"}

    as_text = non_null.astype(str).str.strip()
    zero_padded_ratio = float(as_text.str.match(r"^0\d+$").mean()) if len(as_text) else 0.0
    numeric = pd.to_numeric(as_text.str.replace(",", "", regex=False), errors="coerce")
    numeric_ratio = float(numeric.notna().mean())
    if numeric_ratio >= config["numeric_parse_ratio"] and zero_padded_ratio < 0.2 and not id_hint:
        return {"semantic_type": "numeric", "confidence": numeric_ratio, "reason": "high numeric parse ratio"}

    # Datetime inference is intentionally conservative.
    date_hint = bool(re.search(r"date|time|timestamp|datetime|日期|时间", name_l))
    sample = as_text.iloc[: min(500, len(as_text))]
    parsed_dt = pd.to_datetime(sample, errors="coerce", utc=False)
    dt_ratio = float(parsed_dt.notna().mean()) if len(sample) else 0.0
    if dt_ratio >= config["datetime_parse_ratio"] and (date_hint or numeric_ratio < 0.5):
        return {"semantic_type": "datetime", "confidence": dt_ratio, "reason": "high datetime parse ratio"}

    if id_hint and unique_ratio >= config["id_unique_ratio"]:
        return {"semantic_type": "id_like", "confidence": 0.92, "reason": "identifier-like name and high uniqueness"}

    avg_len = float(as_text.str.len().mean()) if len(as_text) else 0.0
    if unique_n <= config["max_category_count"] or unique_ratio < 0.1:
        return {"semantic_type": "categorical", "confidence": 0.86, "reason": "low cardinality"}
    if avg_len >= 40 or unique_ratio > 0.5:
        return {"semantic_type": "text", "confidence": 0.75, "reason": "high uniqueness or longer strings"}
    return {"semantic_type": "categorical", "confidence": 0.65, "reason": "moderate-cardinality string values"}


def convert_semantic_types(df: pd.DataFrame, type_info: dict[str, dict[str, Any]]) -> pd.DataFrame:
    out = df.copy()
    for col, info in type_info.items():
        t = info.get("semantic_type")
        if t == "numeric":
            out[col] = pd.to_numeric(out[col].astype(str).str.replace(",", "", regex=False), errors="coerce")
        elif t == "datetime":
            out[col] = pd.to_datetime(out[col], errors="coerce", utc=False)
    return out


def ensure_output_dir(path: Path, force: bool = False) -> None:
    if path.exists() and any(path.iterdir()) and not force:
        raise FileExistsError(f"Output directory is not empty: {path}. Use --force only after overwrite is approved.")
    path.mkdir(parents=True, exist_ok=True)
