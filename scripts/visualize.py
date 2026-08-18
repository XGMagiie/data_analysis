from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg", force=True)
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from utils import safe_asset_id, sample_frame


def _save(fig, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, format="svg", bbox_inches="tight")
    plt.close(fig)


def generate_univariate(df: pd.DataFrame, type_info: dict[str, dict[str, Any]], output_images: Path, config: dict[str, Any]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    candidates = [c for c in df.columns if type_info[c]["semantic_type"] in {"numeric", "categorical", "boolean", "datetime"}]
    candidates = candidates[: config["max_auto_visualized_features"]]
    seed = config["random_seed"]
    idx = 1
    for col in candidates:
        t = type_info[col]["semantic_type"]
        s = df[col]
        if t == "numeric":
            vals = pd.to_numeric(s, errors="coerce").replace([np.inf, -np.inf], np.nan).dropna()
            if not len(vals):
                continue
            plotted, sampled = sample_frame(vals.to_frame(name=col), config["plot_sample_size"], seed)
            vals_plot = plotted[col]
            fig, ax = plt.subplots(figsize=(7.2, 4.2))
            ax.hist(vals_plot, bins="auto")
            ax.set_title(f"Distribution: {col}")
            ax.set_xlabel(col); ax.set_ylabel("Count")
            name = safe_asset_id("numeric_hist", idx); idx += 1
            _save(fig, output_images/name)
            records.append({"kind":"histogram","columns":[col],"path":f"assets/images/{name}","original_count":int(len(vals)),"plotted_count":int(len(vals_plot)),"sampled":sampled})

            fig, ax = plt.subplots(figsize=(7.2, 2.8))
            ax.boxplot(vals_plot.to_numpy(), vert=False, showfliers=True)
            ax.set_title(f"Box plot: {col}"); ax.set_xlabel(col)
            name = safe_asset_id("numeric_box", idx); idx += 1
            _save(fig, output_images/name)
            records.append({"kind":"boxplot","columns":[col],"path":f"assets/images/{name}","original_count":int(len(vals)),"plotted_count":int(len(vals_plot)),"sampled":sampled})
        elif t in {"categorical", "boolean"}:
            vc = s.dropna().astype(str).value_counts().head(config["top_k_categories"])
            if not len(vc):
                continue
            fig, ax = plt.subplots(figsize=(7.2, max(3.6, len(vc)*0.35)))
            vc.sort_values().plot(kind="barh", ax=ax)
            ax.set_title(f"Top categories: {col}"); ax.set_xlabel("Count"); ax.set_ylabel(col)
            name = safe_asset_id("category_bar", idx); idx += 1
            _save(fig, output_images/name)
            records.append({"kind":"bar","columns":[col],"path":f"assets/images/{name}","original_count":int(s.notna().sum()),"plotted_count":int(vc.sum()),"sampled":False,"top_k":int(config["top_k_categories"])})
        elif t == "datetime":
            dt = pd.to_datetime(s, errors="coerce").dropna()
            if len(dt) < 2:
                continue
            counts = dt.dt.to_period("D").value_counts().sort_index()
            fig, ax = plt.subplots(figsize=(7.2, 4.2))
            ax.plot(counts.index.astype(str), counts.values)
            ax.set_title(f"Records over time: {col}"); ax.set_xlabel(col); ax.set_ylabel("Records")
            if len(counts) > 20:
                ax.tick_params(axis="x", labelrotation=60)
                for label in ax.get_xticklabels(): label.set_visible(False)
            name = safe_asset_id("datetime_count", idx); idx += 1
            _save(fig, output_images/name)
            records.append({"kind":"time_count","columns":[col],"path":f"assets/images/{name}","original_count":int(len(dt)),"plotted_count":int(len(counts)),"sampled":False})
    return records


def generate_pairwise(df: pd.DataFrame, type_info: dict[str, dict[str, Any]], pairs: list[list[str]], output_images: Path, config: dict[str, Any]) -> list[dict[str, Any]]:
    records = []
    seed = config["random_seed"]
    for idx, pair in enumerate(pairs, 1):
        a, b = pair
        if a not in df.columns or b not in df.columns:
            records.append({"kind":"skipped","columns":[a,b],"reason":"column not found"}); continue
        ta, tb = type_info[a]["semantic_type"], type_info[b]["semantic_type"]
        work = df[[a,b]].dropna().copy()
        if not len(work):
            records.append({"kind":"skipped","columns":[a,b],"reason":"no complete pairs"}); continue
        name = safe_asset_id("pair", idx)
        path = output_images/name
        if ta == "numeric" and tb == "numeric":
            work[a] = pd.to_numeric(work[a], errors="coerce"); work[b] = pd.to_numeric(work[b], errors="coerce")
            work = work.replace([np.inf,-np.inf], np.nan).dropna()
            original = len(work)
            sampled_df, sampled = sample_frame(work, config["plot_sample_size"], seed)
            fig, ax = plt.subplots(figsize=(6.8, 5.0))
            if original >= config["scatter_hexbin_threshold"]:
                ax.hexbin(sampled_df[a], sampled_df[b], gridsize=35, mincnt=1)
                kind = "hexbin"
            else:
                ax.scatter(sampled_df[a], sampled_df[b], s=10, alpha=0.6)
                kind = "scatter"
            ax.set_xlabel(a); ax.set_ylabel(b); ax.set_title(f"{a} vs {b}")
            _save(fig, path)
            records.append({"kind":kind,"columns":[a,b],"path":f"assets/images/{name}","original_count":original,"plotted_count":len(sampled_df),"sampled":sampled})
        elif {ta, tb} & {"categorical","boolean"} and {ta, tb} & {"numeric"}:
            cat = a if ta in {"categorical","boolean"} else b
            num = b if cat == a else a
            top = work[cat].astype(str).value_counts().head(config["top_k_categories"]).index
            filtered = work[work[cat].astype(str).isin(top)].copy()
            filtered[num] = pd.to_numeric(filtered[num], errors="coerce")
            groups = [filtered.loc[filtered[cat].astype(str)==v, num].dropna().to_numpy() for v in top]
            labels = [str(v) for v in top]
            fig, ax = plt.subplots(figsize=(7.2, max(4.2, len(labels)*0.3)))
            if groups:
                ax.boxplot(groups, labels=labels, vert=False)
            ax.set_title(f"{num} by {cat}"); ax.set_xlabel(num); ax.set_ylabel(cat)
            _save(fig, path)
            records.append({"kind":"group_boxplot","columns":[a,b],"path":f"assets/images/{name}","original_count":len(work),"plotted_count":len(filtered),"sampled":False})
        elif ta in {"categorical","boolean"} and tb in {"categorical","boolean"}:
            ua, ub = work[a].nunique(), work[b].nunique()
            if ua > config["max_category_count"] or ub > config["max_category_count"]:
                records.append({"kind":"skipped","columns":[a,b],"reason":"categorical cardinality too high"}); continue
            ct = pd.crosstab(work[a].astype(str), work[b].astype(str))
            fig, ax = plt.subplots(figsize=(7.2, 5.2))
            im = ax.imshow(ct.values, aspect="auto")
            fig.colorbar(im, ax=ax, label="Count")
            ax.set_xticks(range(len(ct.columns))); ax.set_xticklabels(ct.columns, rotation=60, ha="right")
            ax.set_yticks(range(len(ct.index))); ax.set_yticklabels(ct.index)
            ax.set_xlabel(b); ax.set_ylabel(a); ax.set_title(f"Contingency: {a} vs {b}")
            _save(fig, path)
            records.append({"kind":"contingency_heatmap","columns":[a,b],"path":f"assets/images/{name}","original_count":len(work),"plotted_count":len(work),"sampled":False})
        elif (ta == "datetime" and tb == "numeric") or (tb == "datetime" and ta == "numeric"):
            dtc = a if ta == "datetime" else b; num = b if dtc == a else a
            work[dtc] = pd.to_datetime(work[dtc], errors="coerce"); work[num] = pd.to_numeric(work[num], errors="coerce")
            work = work.replace([np.inf,-np.inf], np.nan).dropna().sort_values(dtc)
            original = len(work); sampled_df, sampled = sample_frame(work, config["plot_sample_size"], seed)
            sampled_df = sampled_df.sort_values(dtc)
            fig, ax = plt.subplots(figsize=(7.4,4.4)); ax.plot(sampled_df[dtc], sampled_df[num])
            ax.set_title(f"{num} over {dtc}"); ax.set_xlabel(dtc); ax.set_ylabel(num)
            _save(fig, path)
            records.append({"kind":"time_series","columns":[a,b],"path":f"assets/images/{name}","original_count":original,"plotted_count":len(sampled_df),"sampled":sampled})
        else:
            records.append({"kind":"skipped","columns":[a,b],"reason":f"unsupported V1 pair type: {ta} + {tb}"})
    return records
