from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg", force=True)
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import pandas as pd

from utils import safe_asset_id, json_safe


def _usable_numeric(df: pd.DataFrame, type_info: dict[str, dict[str, Any]]) -> list[str]:
    cols = []
    for c in df.columns:
        if type_info[c]["semantic_type"] != "numeric":
            continue
        s = pd.to_numeric(df[c], errors="coerce").replace([np.inf,-np.inf], np.nan).dropna()
        if len(s) >= 3 and s.nunique() > 1:
            cols.append(c)
    return cols


def _save_heatmap(matrix: pd.DataFrame, path: Path, title: str):
    if matrix.empty:
        return
    fig, ax = plt.subplots(figsize=(max(6.0, len(matrix.columns)*0.38), max(5.2, len(matrix.index)*0.36)))
    im = ax.imshow(matrix.values.astype(float), vmin=-1, vmax=1, aspect="auto")
    fig.colorbar(im, ax=ax, label="Correlation")
    ax.set_xticks(range(len(matrix.columns))); ax.set_xticklabels(matrix.columns, rotation=70, ha="right", fontsize=8)
    ax.set_yticks(range(len(matrix.index))); ax.set_yticklabels(matrix.index, fontsize=8)
    ax.set_title(title); fig.tight_layout(); path.parent.mkdir(parents=True, exist_ok=True); fig.savefig(path, format="svg", bbox_inches="tight"); plt.close(fig)


def _network(matrix: pd.DataFrame, threshold: float, path: Path, title: str, seed: int) -> dict[str, Any]:
    G = nx.Graph()
    for c in matrix.columns: G.add_node(c)
    edges = []
    cols = list(matrix.columns)
    for i, a in enumerate(cols):
        for b in cols[i+1:]:
            r = matrix.loc[a,b]
            if pd.notna(r) and abs(float(r)) >= threshold:
                G.add_edge(a,b,weight=abs(float(r)),correlation=float(r))
                edges.append({"source":a,"target":b,"correlation":float(r)})
    if edges:
        fig, ax = plt.subplots(figsize=(8.0,6.2))
        pos = nx.spring_layout(G, seed=seed, weight="weight")
        degree = dict(G.degree())
        sizes = [400 + 120*degree[n] for n in G.nodes]
        nx.draw_networkx_nodes(G,pos,node_size=sizes,ax=ax)
        nx.draw_networkx_labels(G,pos,font_size=8,ax=ax)
        widths = [1 + 3*G[u][v]["weight"] for u,v in G.edges]
        nx.draw_networkx_edges(G,pos,width=widths,alpha=0.65,ax=ax)
        ax.set_title(title); ax.axis("off")
        path.parent.mkdir(parents=True, exist_ok=True); fig.tight_layout(); fig.savefig(path, format="svg", bbox_inches="tight"); plt.close(fig)
    return {"edge_count":len(edges),"edges":edges,"path":f"assets/images/{path.name}" if edges else None}


def analyze_correlations(df: pd.DataFrame, type_info: dict[str, dict[str, Any]], output_images: Path, config: dict[str, Any], preferred_method: str | None = None, threshold: float | None = None) -> dict[str, Any]:
    usable = _usable_numeric(df, type_info)
    max_features = config["correlation_max_features"]
    bounded = usable[:max_features]
    truncated = len(usable) > max_features
    num = df[bounded].apply(pd.to_numeric, errors="coerce").replace([np.inf,-np.inf], np.nan) if bounded else pd.DataFrame()
    result: dict[str, Any] = {"usable_numeric_features":usable,"matrix_features":bounded,"truncated":truncated,"methods":{}}
    thr = config["correlation_threshold"] if threshold is None else threshold
    for method in ["pearson","spearman"]:
        matrix = num.corr(method=method) if len(bounded) else pd.DataFrame()
        heat_name = f"corr_{method}.svg"
        if not matrix.empty: _save_heatmap(matrix, output_images/heat_name, f"{method.title()} correlation")
        net_name = f"corr_network_{method}.svg"
        network = _network(matrix, thr, output_images/net_name, f"{method.title()} network | |r| ≥ {thr:.2f}", config["random_seed"]) if not matrix.empty else {"edge_count":0,"edges":[],"path":None}
        result["methods"][method] = {
            "matrix": matrix.to_dict(orient="index") if not matrix.empty else {},
            "heatmap_path": f"assets/images/{heat_name}" if not matrix.empty else None,
            "network": network,
        }

    rng = np.random.default_rng(config["random_seed"])
    k = min(config["random_feature_count"], len(usable))
    random_features = list(rng.choice(usable, size=k, replace=False)) if k else []
    random_features = [str(x) for x in random_features]
    result["random_subset"] = {"features":random_features,"seed":config["random_seed"]}
    if random_features:
        rnum = df[random_features].apply(pd.to_numeric, errors="coerce").replace([np.inf,-np.inf], np.nan)
        rmatrix = rnum.corr(method=preferred_method or "pearson")
        random_name = "corr_random_subset.svg"
        _save_heatmap(rmatrix, output_images/random_name, f"Random subset ({preferred_method or 'pearson'})")
        result["random_subset"]["heatmap_path"] = f"assets/images/{random_name}"
        result["random_subset"]["method"] = preferred_method or "pearson"
    return json_safe(result)
