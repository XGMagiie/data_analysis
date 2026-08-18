# Data Initial Analysis Skill

中文说明见 [`README.zh-CN.md`](README.zh-CN.md)。

A publishable V2 Skill for initial analysis of CSV and Excel files. It validates the runtime and input file, infers headers and semantic column types, profiles data quality (severity-scored flags, stray-content and has_missing detection, automatic feature filtering), computes descriptive statistics, exports bounded row-aligned plot data plus full-data category counts, computes Pearson/Spearman correlations, and produces a portable offline HTML report whose charts are **interactive vanilla JS/SVG** — no static images, no CDN, no network requests, fully bilingual (EN/中文) with light/dark themes.

## What this V2 does

- Supports CSV, XLSX, XLS, and read-only XLSM data access.
- Detects CSV encoding and delimiter when possible.
- Detects candidate headers; generates `X1`, `X2`, ... when no header is used.
- Identifies numeric, categorical, datetime, boolean, text, ID-like, constant, and unknown fields.
- Reports missing values, duplicates, infinities, constants, high-cardinality fields, and basic outlier candidates.
- Flags quality issues with severity (`critical` / `warning` / `info`); detects **stray workbook content** (`stray_content_candidate`) and flags **any** column with missing values (`has_missing`).
- Exports bounded, seeded, row-aligned plot data plus `full_counts` for low-cardinality columns, so the browser can compute category shares from ALL rows — even after client-side type overrides.
- **Filters features**: columns with critical flags (all-missing, stray content) or constant columns are automatically excluded from the usable analysis set — distributions, pairwise explorer, and correlation matrices ignore them by default.
- **Light/dark theme toggle** (no flash on navigation) and **EN/中文 language toggle** in the top bar (preferences persist).
- **Dataset Overview** — metric cards, live semantic-type counts, and a per-column "Treat as" type-override selector (numeric / categorical / datetime / text / ignored) whose changes persist and apply globally to Distributions, Relationships, and Correlations.
- **Distributions page analyzes numeric features**: line (full-width), KDE + horizontal box plot; chart-type checkboxes sit beside the feature selector with a fixed width; features re-typed numeric in Overview are selectable (including previously excluded columns); the Field statistics table renders client-side and highlights the active feature.
- **Data Quality** — Column health honors type overrides: clean non-categorical columns are hidden, flagged columns are listed, and each categorical column embeds top-5 category charts (vertical bar with horizontal labels + centered donut pie without legend/titles, remainder grouped as "Other") beneath its health row using FULL-data shares; the missingness table lists only columns with missing values.
- **Correlations page defaults to 10 features, max 20**: a feature picker selects which numeric features appear in the heatmap and network; the counter enforces the cap; re-typed numeric features join with client-computed correlations.
- **Correlations page has a live threshold slider**: drag it to add/remove network edges by `|r|` in real time; hover nodes to highlight connections; random-subset heatmap is reproducible.
- **Relationships page is always on**: pick any two features; a "color by" checkbox adds a third categorical dimension on a single chart. Without it: num×num → scatter (live Pearson/Spearman badges), num×cat → grouped box, cat×cat → frequency heatmap. With it: colored scatter, a single grouped box plot, or a single stacked bar chart.
- Produces a portable offline HTML report with split CSS/JS files, a default favicon, and a self-contained `js/data.js` payload.
- Never modifies the source file.

## Directory layout

```text
csv_excel_analysis_skill/
├── SKILL.md
├── README.md
├── README.zh-CN.md
├── references/       (environment, file validation, profiling, visualization, correlation, edge cases, interpretation, report design)
├── scripts/          (check_environment, inspect_file, profile_data, visualize, correlation, run_analysis, generate_report)
├── assets/
│   ├── requirements.txt
│   ├── default_config.json
│   ├── favicon.ico
│   ├── templates/     (base + 6 pages)
│   ├── css/           (base, layout, components, charts, print)
│   └── js/            (core, i18n, charts/{histogram,density,boxplot,barchart,line,scatter,heatmap,network,pie,grouped,qq,autocorr}, pages/{overview,data_quality,distributions,relationships,correlations}, main)
└── tests/smoke_test.py
```

## Requirements

Python 3.10+ is recommended. Required packages are listed in `assets/requirements.txt`. `matplotlib` and `networkx` are **no longer required** (charts are client-side); `xlrd` is needed only for legacy `.xls` files.

Before installing anything, inspect the environment:

```bash
python scripts/check_environment.py
```

If dependencies are missing, review the output first. Installation should only be performed with the user's explicit permission:

```bash
python -m pip install -r assets/requirements.txt
```

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

Set the default pair for the Relationships page:

```bash
python scripts/run_analysis.py data.csv --pair Temperature Pressure --output report-work
```

Choose the correlation method used for the reproducible random subset:

```bash
python scripts/run_analysis.py data.csv --correlation-method spearman --output report-work
```

The command writes `analysis_result.json` (facts + plot data) into the working output directory.

## AI commentary step

The Skill workflow separates calculation from interpretation:

1. Python writes factual results to `analysis_result.json`.
2. The AI reads `references/interpretation_guidelines.md` and creates `analysis_commentary.json`.
3. The report generator combines the two.

A minimal commentary file can look like:

```json
{
  "summary": [
    { "level": "Fact", "text": "The dataset contains 10,000 rows and 25 columns." },
    { "level": "Attention", "text": "Column X7 has a missing rate above 40% and is flagged as stray content; it should be excluded before downstream use." }
  ],
  "limitations": ["Correlation does not establish causality."]
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
├── favicon.ico
├── html/          (overview, data_quality, distributions, relationships, correlations)
├── css/           (base, layout, components, charts, print)
├── js/            (core, i18n, charts/, pages/, main, data.js)
└── assets/
    └── data/      (analysis_result.json, analysis_commentary.json)
```

Open `index.html` in a browser. Everything — styles, scripts, data, charts — is local; no CDN or internet connection is required.

To follow the Skill's default publishing workflow and place `index.html`, `favicon.ico`, `html/`, `css/`, `js/`, and `assets/` beside the user's source file, set `--output` to the source file's parent directory. The generator checks only these managed report paths for conflicts; unrelated files in that directory are left untouched.

## Publishing / installing as a Skill

The exact installation mechanism depends on the AI/agent platform. Publish or upload the whole `csv_excel_analysis_skill` directory (or its ZIP archive), preserving the directory structure and `SKILL.md` at the package root.

Do not publish only `SKILL.md`: the scripts, references, configuration, templates, CSS/JS assets are required at runtime.

## Report pages

- `index.html` — executive summary: metric cards, key findings, analysis notes, report navigation, limitations.
- `html/overview.html` — dataset overview: metrics, live semantic-type counts, per-column type overrides, schema table, AI commentary.
- `html/data_quality.html` — icon-based quality summary, Column health with embedded top-5 category charts, missingness table (only columns with missing values).
- `html/distributions.html` — single numeric feature analysis (line / KDE / horizontal box), selectable chart types, highlighted Field statistics table.
- `html/relationships.html` — pairwise feature explorer with optional color-by dimension (single-chart three-way views).
- `html/correlations.html` — feature picker (10 default / 20 max), Pearson/Spearman heatmaps, live-threshold network, reproducible random subset.

## Safety and data handling

- Source files are read-only.
- Excel macros are never executed.
- User-provided text is HTML-escaped before report rendering; JSON embedded in `js/data.js` escapes `<` to prevent `</script>` breakout.
- No external CDN resources are used.
- Existing report files are not overwritten unless `--force` is explicitly supplied.

## Important V2 limitations

This version does not perform automatic cleaning, ML modeling, PCA, clustering, causal inference, NLP, multi-file joins, database access, or streaming analysis. Very large files are profiled with memory-aware behavior where practical, and chart data is sampled; a dataset that cannot fit the available environment may still require user-selected sampling or a future chunked-analysis version.

## Development smoke test

Run:

```bash
python tests/smoke_test.py
```

The test creates temporary CSV/XLSX fixtures, runs inspection, analysis, and report generation, verifies key output files (including split CSS/JS), and then cleans up its temporary data.

## License

No license is bundled. Before public distribution, choose and add a license appropriate for your intended use.
