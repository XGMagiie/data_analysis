from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

from packaging.version import Version

from utils import SKILL_ROOT, load_config

REQUIRED = {
    "pandas": "CSV/Excel parsing and tabular analysis",
    "numpy": "numeric calculations",
    "openpyxl": "XLSX/XLSM reading",
    "jinja2": "HTML template rendering",
    "charset_normalizer": "CSV encoding detection",
    "packaging": "version comparison",
}

# V2 charts are rendered client-side (vanilla JS/SVG); matplotlib and networkx
# are therefore optional and only reported for information.
OPTIONAL = {
    "matplotlib": "optional: previously used for static charts",
    "networkx": "optional: previously used for static network layouts",
}


def check_environment(output_dir: str | Path | None = None) -> dict:
    cfg = load_config()
    result = {
        "python": {"executable": sys.executable, "version": sys.version.split()[0], "ok": True},
        "packages": [],
        "optional_packages": [],
        "output_writable": None,
        "requirements_file": str(SKILL_ROOT / "assets" / "requirements.txt"),
    }
    if Version(result["python"]["version"]) < Version(cfg["python_min_version"]):
        result["python"]["ok"] = False

    def _probe(module_name: str, purpose: str) -> dict:
        try:
            mod = importlib.import_module(module_name)
            version = getattr(mod, "__version__", "unknown")
            return {"name": module_name, "installed": True, "version": version, "purpose": purpose}
        except Exception as exc:
            return {"name": module_name, "installed": False, "version": None, "purpose": purpose, "error": str(exc)}

    for module_name, purpose in REQUIRED.items():
        result["packages"].append(_probe(module_name, purpose))
    for module_name, purpose in OPTIONAL.items():
        result["optional_packages"].append(_probe(module_name, purpose))

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
    result["ok"] = result["python"]["ok"] and not result["missing_required"] and result["output_writable"] is not False
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
