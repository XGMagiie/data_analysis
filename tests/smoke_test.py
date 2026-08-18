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
    proc = subprocess.run([PY, *map(str,args)], cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed: {args}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")
    return proc


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        standard = tmp/"standard.csv"
        pd.DataFrame({"time":pd.date_range("2026-01-01", periods=50, freq="h"),"temperature":np.linspace(10,20,50),"pressure":np.linspace(100,110,50)+np.random.default_rng(42).normal(0,.3,50),"category":["A","B"]*25}).to_csv(standard,index=False)
        noheader = tmp/"noheader.csv"
        pd.DataFrame([[1,2],[3,4],[5,6]]).to_csv(noheader,index=False,header=False)
        mixed = tmp/"mixed.csv"
        pd.DataFrame({"id":[f"ID-{i:03d}" for i in range(20)],"value":[1,2,np.nan,4]*5,"flag":[True,False]*10,"label":["x","y","x","z"]*5}).to_csv(mixed,index=False)
        excel = tmp/"book.xlsx"
        with pd.ExcelWriter(excel,engine="openpyxl") as writer:
            pd.DataFrame({"a":[1,2,3],"b":[4,5,6]}).to_excel(writer,index=False,sheet_name="Data")
            pd.DataFrame({"x":[7,8],"y":[9,10]}).to_excel(writer,index=False,sheet_name="Other")

        run("scripts/inspect_file.py", standard)
        run("scripts/inspect_file.py", noheader, "--header", "none")
        inspect_excel = subprocess.run([PY,"scripts/inspect_file.py",str(excel)],cwd=ROOT,capture_output=True,text=True)
        if inspect_excel.returncode != 0:
            raise RuntimeError(inspect_excel.stderr)
        info = json.loads(inspect_excel.stdout)
        assert info.get("requires_sheet_selection") is True

        work = tmp/"work"
        run("scripts/run_analysis.py", standard, "--pair", "temperature", "pressure", "--output", work)
        result = json.loads((work/"analysis_result.json").read_text(encoding="utf-8"))
        assert result["profile"]["dataset"]["rows"] == 50
        assert (work/"assets"/"images").exists()

        report = tmp/"report"
        run("scripts/generate_report.py", "--analysis", work/"analysis_result.json", "--output", report)
        for rel in ["index.html","html/overview.html","html/data_quality.html","html/distributions.html","html/relationships.html","html/correlations.html","css/report.css","js/report.js","assets/data/analysis_result.json"]:
            assert (report/rel).exists(), rel
        html = (report/"index.html").read_text(encoding="utf-8")
        assert "skill-root" not in html
        print("SMOKE TEST PASSED")
        print(report/"index.html")

if __name__ == "__main__":
    main()
