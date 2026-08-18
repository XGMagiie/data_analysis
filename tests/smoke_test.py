from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PY = sys.executable


def run(*args):
    proc = subprocess.run([PY, *map(str, args)], cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed: {args}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")
    return proc


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        standard = tmp / "standard.csv"
        pd.DataFrame({
            "time": pd.date_range("2026-01-01", periods=50, freq="h"),
            "temperature": np.linspace(10, 20, 50),
            "pressure": np.linspace(100, 110, 50) + np.random.default_rng(42).normal(0, .3, 50),
            "category": ["A", "B"] * 25,
        }).to_csv(standard, index=False)

        noheader = tmp / "noheader.csv"
        pd.DataFrame([[1, 2], [3, 4], [5, 6]]).to_csv(noheader, index=False, header=False)

        mixed = tmp / "mixed.csv"
        pd.DataFrame({
            "id": [f"ID-{i:03d}" for i in range(20)],
            "value": [1, 2, np.nan, 4] * 5,
            "flag": [True, False] * 10,
            "label": ["x", "y", "x", "z"] * 5,
        }).to_csv(mixed, index=False)

        # Stray-content fixture: high-missing columns with heading-like text.
        stray = tmp / "stray.csv"
        n = 100
        df = pd.DataFrame({"a": np.linspace(0, 10, n), "b": np.linspace(20, 30, n)})
        notes = [None] * n
        for i, txt in enumerate(["Solutions of Questions", "Distribution Of Each Species", "Average Sepal Length of Each Species", "Largest Petal Area of Each Species"]):
            notes[i] = txt
        df["X8"] = notes
        df["X9"] = [None] * (n - 9) + [50.0, 5.006, 5.936, 6.588, 0.96, 8.64, 15.87, 0.9627, 42.0]
        df.to_csv(stray, index=False)

        excel = tmp / "book.xlsx"
        with pd.ExcelWriter(excel, engine="openpyxl") as writer:
            pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]}).to_excel(writer, index=False, sheet_name="Data")
            pd.DataFrame({"x": [7, 8], "y": [9, 10]}).to_excel(writer, index=False, sheet_name="Other")

        run("scripts/inspect_file.py", standard)
        run("scripts/inspect_file.py", noheader, "--header", "none")
        inspect_excel = subprocess.run([PY, "scripts/inspect_file.py", str(excel)], cwd=ROOT, capture_output=True, text=True)
        if inspect_excel.returncode != 0:
            raise RuntimeError(inspect_excel.stderr)
        info = json.loads(inspect_excel.stdout)
        assert info.get("requires_sheet_selection") is True

        work = tmp / "work"
        run("scripts/run_analysis.py", standard, "--pair", "temperature", "pressure", "--output", work)
        result = json.loads((work / "analysis_result.json").read_text(encoding="utf-8"))
        assert result["profile"]["dataset"]["rows"] == 50
        assert "series" in result["data"]
        assert result["pairs"]["default"] == ["temperature", "pressure"]
        assert result["correlations"]["methods"]["pearson"]["matrix"]

        # Stray detection
        stray_work = tmp / "stray_work"
        run("scripts/run_analysis.py", stray, "--output", stray_work)
        stray_result = json.loads((stray_work / "analysis_result.json").read_text(encoding="utf-8"))
        stray_flags = {f["column"]: f["flag"] for f in stray_result["profile"]["quality_flags"]}
        assert stray_flags.get("X8") == "stray_content_candidate", stray_flags
        assert stray_flags.get("X9") == "stray_content_candidate", stray_flags
        assert stray_result["profile"]["quality_summary"]["critical"] >= 2

        report = tmp / "report"
        run("scripts/generate_report.py", "--analysis", work / "analysis_result.json", "--output", report)
        expected = [
            "index.html",
            "html/overview.html", "html/data_quality.html", "html/distributions.html",
            "html/relationships.html", "html/correlations.html",
            "css/base.css", "css/layout.css", "css/components.css", "css/charts.css", "css/print.css",
            "favicon.ico",
            "js/core.js", "js/i18n.js", "js/data.js", "js/main.js",
            "js/charts/histogram.js", "js/charts/density.js", "js/charts/line.js", "js/charts/boxplot.js", "js/charts/barchart.js",
            "js/charts/qq.js", "js/charts/autocorr.js",
            "js/charts/scatter.js", "js/charts/heatmap.js", "js/charts/network.js", "js/charts/pie.js", "js/charts/grouped.js",
            "js/pages/distributions.js", "js/pages/relationships.js", "js/pages/correlations.js", "js/pages/overview.js", "js/pages/data_quality.js",
            "assets/data/analysis_result.json",
        ]
        for rel in expected:
            assert (report / rel).exists(), rel
        html = (report / "index.html").read_text(encoding="utf-8")
        assert "skill-root" not in html
        data_js = (report / "js" / "data.js").read_text(encoding="utf-8")
        assert data_js.startswith("window.DA = window.DA || {}; window.DA.DATA = ")
        assert "</script" not in data_js.lower()
        print("SMOKE TEST PASSED")
        print(report / "index.html")


if __name__ == "__main__":
    main()
