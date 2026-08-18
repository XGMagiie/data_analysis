---
name: data-analysis
description: Read-only initial analysis of CSV and Excel files with environment/input validation, schema/type inference, data-quality profiling, descriptive statistics, type-aware visualizations, Pearson/Spearman correlations, AI-grounded commentary, and a portable offline HTML report.
---

# Data Initial Analysis & HTML Report

## Purpose

Use this Skill when a user provides a `.csv`, `.xlsx`, `.xls`, or non-macro-executed `.xlsm` file and wants an initial data audit, descriptive statistics, basic visualization, pairwise exploration, Pearson/Spearman correlation analysis, and an offline HTML report.

V1 is intentionally read-only. It does not clean, overwrite, or modify source data and does not perform machine learning, causal analysis, NLP, or automated business diagnosis.

## Main workflow

1. Read `references/environment_check.md`, then run `scripts/check_environment.py`.
   - If required packages are missing, tell the user exactly what is missing and ask for permission before installing anything.
   - Never execute `pip install` without explicit user approval.
2. Read `references/file_validation.md`, then run `scripts/inspect_file.py` against the selected input file.
   - Reject unsupported formats.
   - If an Excel workbook has multiple sheets and the user did not select one, show the sheet names and ask which sheet(s) to analyze.
   - If header detection confidence is below the configured threshold, show the preview/detection result and ask the user whether the candidate header is correct.
3. After validation, run `scripts/run_analysis.py` to produce `analysis_result.json` and chart assets.
   - Read `references/data_profiling.md`, `references/visualization_rules.md`, `references/correlation_analysis.md`, and `references/edge_cases.md` when the corresponding part of the analysis is needed.
4. Read `references/interpretation_guidelines.md`. Create `analysis_commentary.json` from the facts in `analysis_result.json`.
   - Separate `Fact`, `Observation`, `Attention`, and `Limitation`.
   - Do not invent units, normal ranges, causal claims, or domain diagnoses.
   - If evidence is insufficient, say so explicitly.
5. Read `references/report_design.md`, then run `scripts/generate_report.py` with the analysis result and commentary.
   - The report must be self-contained in the user's report directory and must not reference this Skill's internal assets.
   - If output files already exist, ask before overwriting or choose a separate destination requested by the user.
6. Return the generated `index.html` location and summarize major findings and limitations.

## Supported inputs

- `.csv`
- `.xlsx`
- `.xls` (requires a compatible engine such as `xlrd`)
- `.xlsm` can be read only as data; never execute macros.

## Important interaction points

Ask the user before proceeding when:

- dependency installation is required;
- an Excel workbook has multiple sheets and no sheet was selected;
- header detection confidence is low;
- the requested output would overwrite existing files;
- the file structure has multiple plausible interpretations.

Use defaults from `assets/default_config.json` for ordinary plotting, sampling, Top-K, correlation thresholds, and reproducible random selection unless the user overrides them.

## Script entry points

- `scripts/check_environment.py` — environment/dependency/writeability checks.
- `scripts/inspect_file.py` — input validation, sheet/header/type inspection.
- `scripts/profile_data.py` — dataset and column profiling.
- `scripts/visualize.py` — single-variable and user-selected pairwise charts.
- `scripts/correlation.py` — Pearson/Spearman matrices, heatmaps, random subset, network graph.
- `scripts/run_analysis.py` — orchestrates inspection/profile/visualization/correlation and writes `analysis_result.json`.
- `scripts/generate_report.py` — renders the offline HTML report.

## Output contract

A complete report directory contains at least:

```text
index.html
html/
css/
js/
assets/
  images/
  data/
```

The original source data remains unchanged.
