from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from utils import SKILL_ROOT


CSS_FILES = ["base.css", "layout.css", "components.css", "charts.css", "print.css"]
JS_FILES = [
    "core.js",
    "i18n.js",
    "charts/histogram.js",
    "charts/density.js",
    "charts/line.js",
    "charts/boxplot.js",
    "charts/barchart.js",
    "charts/qq.js",
    "charts/autocorr.js",
    "charts/scatter.js",
    "charts/heatmap.js",
    "charts/network.js",
    "charts/pie.js",
    "charts/grouped.js",
    "pages/distributions.js",
    "pages/relationships.js",
    "pages/correlations.js",
    "pages/overview.js",
    "pages/data_quality.js",
    "main.js",
]


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def fallback_commentary(analysis: dict[str, Any]) -> dict[str, Any]:
    ds = analysis["profile"]["dataset"]
    flags = analysis["profile"].get("quality_flags", [])
    qs = analysis["profile"].get("quality_summary", {})
    summary = [
        {"level": "Fact", "text": f"The dataset contains {ds['rows']:,} rows and {ds['columns']:,} columns."},
        {"level": "Fact", "text": f"Overall missing-cell rate is {ds['missing_rate']:.2%}; duplicate-row rate is {ds['duplicate_rate']:.2%}."},
    ]
    if qs.get("critical"):
        summary.append({"level": "Attention", "text": f"{qs['critical']} column(s) carry critical quality flags (all-missing or stray content). Review the Data Quality page."})
    elif flags:
        summary.append({"level": "Attention", "text": f"{len(flags)} column-level quality flags were detected. Review the Data Quality page before downstream use."})
    if analysis.get("warnings"):
        summary.append({"level": "Limitation", "text": "One or more size/readability limits were applied. See report notes for details."})
    return {
        "summary": summary,
        "dataset": [],
        "quality": [],
        "correlation": [],
        "limitations": ["Correlation does not establish causality.", "IQR outlier candidates are statistical signals, not proof of erroneous data.", "No business-specific normal ranges or units were assumed."],
    }


def _js_string(payload: Any) -> str:
    """Serialize JSON into a safe JS assignment (avoids `</script` breakout)."""
    body = json.dumps(payload, ensure_ascii=False, allow_nan=False)
    return body.replace("<", "\\u003c")


def copy_analysis_assets(analysis_path: Path, output: Path):
    src_assets = analysis_path.parent / "assets"
    if src_assets.exists():
        shutil.copytree(src_assets, output / "assets", dirs_exist_ok=True)
    (output / "assets" / "data").mkdir(parents=True, exist_ok=True)
    shutil.copy2(analysis_path, output / "assets" / "data" / "analysis_result.json")


def generate_report(analysis_path: str, output: str, commentary_path: str | None = None, force: bool = False) -> Path:
    analysis_file = Path(analysis_path).expanduser().resolve()
    out = Path(output).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    managed_targets = [out / "index.html", out / "html", out / "css", out / "js", out / "assets"]
    conflicts = [str(p) for p in managed_targets if p.exists()]
    if conflicts and not force:
        raise FileExistsError(
            "Report output conflicts with existing managed paths: " + ", ".join(conflicts) +
            ". Ask the user before overwriting, or choose a separate report directory."
        )
    analysis = load_json(analysis_file)
    commentary = load_json(Path(commentary_path).expanduser().resolve()) if commentary_path else fallback_commentary(analysis)

    templates = SKILL_ROOT / "assets" / "templates"
    env = Environment(loader=FileSystemLoader(str(templates)), autoescape=select_autoescape(["html","xml"]))
    env.filters["pct"] = lambda v: "—" if v is None else f"{float(v):.2%}"
    env.filters["num"] = lambda v: "—" if v is None else f"{float(v):,.4g}" if isinstance(v,(int,float)) else str(v)

    (out / "html").mkdir(parents=True, exist_ok=True)
    (out / "css").mkdir(parents=True, exist_ok=True)
    (out / "js").mkdir(parents=True, exist_ok=True)
    (out / "js" / "charts").mkdir(parents=True, exist_ok=True)
    (out / "js" / "pages").mkdir(parents=True, exist_ok=True)
    for css_name in CSS_FILES:
        shutil.copy2(SKILL_ROOT / "assets" / "css" / css_name, out / "css" / css_name)
    shutil.copy2(SKILL_ROOT / "assets" / "favicon.ico", out / "favicon.ico")
    for js_name in JS_FILES:
        src = SKILL_ROOT / "assets" / "js" / js_name
        dst = out / "js" / js_name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    # Single self-contained data payload (avoids file:// fetch CORS issues).
    payload = {"analysis": analysis, "commentary": commentary}
    (out / "js" / "data.js").write_text(
        f"window.DA = window.DA || {{}}; window.DA.DATA = {_js_string(payload)};\n",
        encoding="utf-8",
    )
    copy_analysis_assets(analysis_file, out)
    if commentary_path:
        shutil.copy2(Path(commentary_path).expanduser().resolve(), out/"assets"/"data"/"analysis_commentary.json")

    ctx = {"analysis":analysis,"commentary":commentary}
    pages = {
        "index.html":"index.html",
        "html/overview.html":"overview.html",
        "html/data_quality.html":"data_quality.html",
        "html/distributions.html":"distributions.html",
        "html/relationships.html":"relationships.html",
        "html/correlations.html":"correlations.html",
    }
    for dest, template_name in pages.items():
        target = out/dest
        target.write_text(env.get_template(template_name).render(**ctx, page_path=dest), encoding="utf-8")
    return out/"index.html"


def main() -> int:
    parser = argparse.ArgumentParser(description="Render a portable offline HTML report from analysis_result.json.")
    parser.add_argument("--analysis", required=True)
    parser.add_argument("--commentary")
    parser.add_argument("--output", required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    try:
        path = generate_report(args.analysis, args.output, args.commentary, args.force)
        print(path)
        return 0
    except Exception as exc:
        print(f"[ERROR] {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
