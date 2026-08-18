from __future__ import annotations

import argparse
import importlib
import json
import os
import sys
import tempfile
from pathlib import Path

from packaging.version import Version

from utils import SKILL_ROOT, load_config

REQUIRED = {
    "pandas": "CSV/Excel parsing and tabular analysis",
    "numpy": "numeric calculations",
    "openpyxl": "XLSX/XLSM reading",
    "matplotlib": "offline chart rendering",
    "jinja2": "HTML template rendering",
    "networkx": "correlation network layout",
    "charset_normalizer": "CSV encoding detection",
    "packaging": "version comparison",
}


def check_environment(output_dir: str | Path | None = None) -> dict:
    cfg = load_config()
    result = {
        "python": {"executable": sys.executable, "version": sys.version.split()[0], "ok": True},
        "packages": [],
        "matplotlib_agg": False,
        "output_writable": None,
        "requirements_file": str(SKILL_ROOT / "assets" / "requirements.txt"),
    }
    if Version(result["python"]["version"]) < Version(cfg["python_min_version"]):
        result["python"]["ok"] = False

    for module_name, purpose in REQUIRED.items():
        try:
            mod = importlib.import_module(module_name)
            version = getattr(mod, "__version__", "unknown")
            result["packages"].append({"name": module_name, "installed": True, "version": version, "purpose": purpose})
        except Exception as exc:
            result["packages"].append({"name": module_name, "installed": False, "version": None, "purpose": purpose, "error": str(exc)})

    try:
        import matplotlib
        matplotlib.use("Agg", force=True)
        import matplotlib.pyplot as plt
        fig = plt.figure()
        plt.plot([0, 1], [0, 1])
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        fig.savefig(tmp_path)
        plt.close(fig)
        os.unlink(tmp_path)
        result["matplotlib_agg"] = True
    except Exception as exc:
        result["matplotlib_error"] = str(exc)

    if output_dir:
        try:
            target = Path(output_dir).resolve()
            target.mkdir(parents=True, exist_ok=True)
            test = target / ".write_test"
            test.write_text("ok", encoding="utf-8")
            test.unlink()
            result["output_writable"] = True
        except Exception as exc:
            result["output_writable"] = False
            result["output_error"] = str(exc)

    result["missing_required"] = [p["name"] for p in result["packages"] if not p["installed"]]
    result["ok"] = result["python"]["ok"] and not result["missing_required"] and result["matplotlib_agg"] and result["output_writable"] is not False
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Check runtime requirements without installing anything.")
    parser.add_argument("--output-dir", help="Optional directory to test for write access")
    args = parser.parse_args()
    result = check_environment(args.output_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["missing_required"]:
        print("\nMissing packages detected. Do not install automatically; obtain explicit user permission first.", file=sys.stderr)
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
