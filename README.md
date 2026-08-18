# Data Initial Analysis Skill

中文说明见 [`README.zh-CN.md`](README.zh-CN.md)。

A publishable V1 Skill for initial analysis of CSV and Excel files. It validates the runtime and input file, infers headers and semantic column types, profiles data quality and descriptive statistics, creates appropriate visualizations, computes Pearson/Spearman correlations, and produces an offline multi-page HTML report.

## What this V1 does

- Supports CSV, XLSX, XLS, and read-only XLSM data access.
- Detects CSV encoding and delimiter when possible.
- Detects candidate headers; generates `X1`, `X2`, ... when no header is used.
- Identifies numeric, categorical, datetime, boolean, text, ID-like, constant, and unknown fields.
- Reports missing values, duplicates, infinities, constants, high-cardinality fields, and basic outlier candidates.
- Creates histograms, box plots, category bars, time coverage plots, and user-selected pairwise charts.
- Computes Pearson and Spearman correlation matrices.
- Creates correlation heatmaps, a reproducible random subset of up to 10 numeric features, and thresholded correlation networks.
- Produces a portable offline HTML report with copied CSS/JS/image assets.
- Never modifies the source file.

## Directory layout

```text
csv_excel_analysis_skill/
├── SKILL.md
├── README.md
├── references/
├── scripts/
├── assets/
│   ├── requirements.txt
│   ├── default_config.json
│   ├── templates/
│   ├── css/
│   └── js/
└── tests/
```

## Requirements

Python 3.10+ is recommended. Required packages are listed in `assets/requirements.txt`.

Before installing anything, inspect the environment:

```bash
python scripts/check_environment.py
```

If dependencies are missing, review the output first. Installation should only be performed with the user's explicit permission:

```bash
python -m pip install -r assets/requirements.txt
```

For legacy `.xls` files, `xlrd` is required. Other formats do not require it.

## Quick start: inspect a file

```bash
python scripts/inspect_file.py /path/to/data.csv
```

For an Excel workbook:

```bash
python scripts/inspect_file.py /path/to/data.xlsx
```

If multiple sheets are present, the inspector returns the sheet names and indicates that a selection is required.

## Run the analysis

CSV example:

```bash
python scripts/run_analysis.py /path/to/data.csv --output /path/to/report-work
```

Excel example with a selected sheet:

```bash
python scripts/run_analysis.py /path/to/data.xlsx --sheet Sheet1 --output /path/to/report-work
```

Explicitly declare that a file has no header:

```bash
python scripts/run_analysis.py /path/to/data.csv --header none --output /path/to/report-work
```

Explicitly select a zero-based header row:

```bash
python scripts/run_analysis.py /path/to/data.xlsx --sheet Sheet1 --header 2 --output /path/to/report-work
```

Request pairwise charts:

```bash
python scripts/run_analysis.py data.csv \
  --pair Temperature Pressure \
  --pair Category Temperature \
  --output report-work
```

Change correlation settings:

```bash
python scripts/run_analysis.py data.csv \
  --correlation-method spearman \
  --correlation-threshold 0.8 \
  --output report-work
```

The command writes `analysis_result.json` and chart assets into the working output directory.

## AI commentary step

The preferred Skill workflow separates calculation from interpretation:

1. Python writes factual results to `analysis_result.json`.
2. The AI reads `references/interpretation_guidelines.md` and creates `analysis_commentary.json`.
3. The report generator combines the two.

A minimal commentary file can look like:

```json
{
  "summary": [
    {
      "level": "Fact",
      "text": "The dataset contains 10,000 rows and 25 columns."
    },
    {
      "level": "Attention",
      "text": "Column X7 has a missing rate above 40% and should be reviewed before downstream use."
    }
  ],
  "limitations": [
    "Correlation does not establish causality."
  ]
}
```

If no commentary file is supplied, the report generator uses a conservative factual fallback rather than inventing business conclusions.

## Generate the HTML report

```bash
python scripts/generate_report.py \
  --analysis /path/to/report-work/analysis_result.json \
  --commentary /path/to/report-work/analysis_commentary.json \
  --output /path/to/final-report
```

If `--commentary` is omitted, factual fallback commentary is used.

The final directory contains:

```text
final-report/
├── index.html
├── html/
│   ├── overview.html
│   ├── data_quality.html
│   ├── distributions.html
│   ├── relationships.html
│   └── correlations.html
├── css/
├── js/
└── assets/
    ├── images/
    └── data/
```

Open `index.html` in a browser. No CDN or internet connection is required.

To follow the Skill's default publishing workflow and place `index.html`, `html/`, `css/`, `js/`, and `assets/` beside the user's source file, set `--output` to the source file's parent directory. The generator checks only these managed report paths for conflicts; unrelated files in that directory are left untouched.

## Publishing / installing as a Skill

The exact installation mechanism depends on the AI/agent platform. Publish or upload the whole `csv_excel_analysis_skill` directory (or its ZIP archive), preserving the directory structure and `SKILL.md` at the package root.

Do not publish only `SKILL.md`: the scripts, references, configuration, templates, and static assets are required at runtime.

## Safety and data handling

- Source files are read-only.
- Excel macros are never executed.
- User-provided text is HTML-escaped before report rendering.
- Generated asset filenames use safe internal IDs rather than raw column names.
- No external CDN resources are used.
- Existing report files are not overwritten unless `--force` is explicitly supplied.

## Important V1 limitations

This version does not perform automatic cleaning, ML modeling, PCA, clustering, causal inference, NLP, multi-file joins, database access, or streaming analysis. Very large files are profiled with memory-aware behavior where practical, but a dataset that cannot fit the available environment may still require user-selected sampling or a future chunked-analysis version.

## Development smoke test

Run:

```bash
python tests/smoke_test.py
```

The test creates temporary CSV/XLSX fixtures, runs inspection, analysis, and report generation, verifies key output files, and then cleans up its temporary data.

## License

No license is bundled. Before public distribution, choose and add a license appropriate for your intended use.
