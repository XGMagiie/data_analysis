---
name: data-analysis
description: Read-only initial analysis of CSV and Excel files with environment/input validation, schema/type inference, severity-scored data-quality profiling (stray-content detection, has_missing flags, feature filtering), descriptive statistics, interactive type-aware charts rendered in vanilla JS/SVG (no dependencies, fully offline), Pearson/Spearman correlations with a live threshold slider and feature picker, an always-on pairwise feature explorer with optional color-by dimension, and a portable bilingual (EN/中文) HTML report with light/dark themes.
---

# Data Initial Analysis & Interactive HTML Report

## Purpose

Use this Skill when a user provides a `.csv`, `.xlsx`, `.xls`, or non-macro-executed `.xlsm` file and wants an initial data audit, descriptive statistics, interactive visualization, pairwise exploration, Pearson/Spearman correlation analysis, and an offline HTML report.

V2 is intentionally read-only. It does not clean, overwrite, or modify source data and does not perform machine learning, causal analysis, NLP, or automated business diagnosis.

## Main workflow

1. Read `references/environment_check.md`, then run `scripts/check_environment.py`.
   - If required packages are missing, tell the user exactly what is missing and ask for permission before installing anything.
   - Never execute `pip install` without explicit user approval.
2. Read `references/file_validation.md`, then run `scripts/inspect_file.py` against the selected input file.
   - Reject unsupported formats.
   - If an Excel workbook has multiple sheets and the user did not select one, show the sheet names and ask which sheet(s) to analyze.
   - If header detection confidence is below the configured threshold, show the preview/detection result and ask the user whether the candidate header is correct.
3. After validation, run `scripts/run_analysis.py` to produce `analysis_result.json` with profile facts and **bounded plot data** (no static images are generated; charts are drawn client-side).
   - Read `references/data_profiling.md`, `references/visualization_rules.md`, `references/correlation_analysis.md`, and `references/edge_cases.md` when the corresponding part of the analysis is needed.
   - Columns that look like stray workbook content (headings, answer blocks, tiny detached islands) are automatically flagged `stray_content_candidate` with critical severity; any column with missing values gets a `has_missing` flag.
   - **Feature filtering happens automatically**: columns with critical flags or constant columns are excluded from the usable set (`profile.usable_columns`); distributions, pairwise defaults, and correlations use only usable features. Low-cardinality columns additionally export `full_counts` so the UI can compute category shares from ALL rows, even after client-side type overrides.
4. Read `references/interpretation_guidelines.md`. Create `analysis_commentary.json` from the facts in `analysis_result.json`.
   - Separate `Fact`, `Observation`, `Attention`, and `Limitation`.
   - Do not invent units, normal ranges, causal claims, or domain diagnoses.
   - If evidence is insufficient, say so explicitly.
   - Call out critical/stray columns explicitly and recommend exclusion from downstream use.
5. Read `references/report_design.md`, then run `scripts/generate_report.py` with the analysis result and commentary.
   - The report must be self-contained in the user's report directory and must not reference this Skill's internal assets. A default favicon (`assets/favicon.ico`) is copied into the report root; CSS/JS are copied as separate files; a single self-contained `js/data.js` payload embeds the analysis data (no `file://` CORS issues).
   - If output files already exist, ask before overwriting or choose a separate destination requested by the user.
6. Return the generated `index.html` location and summarize major findings, interactive features, and limitations.

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

Use defaults from `assets/default_config.json` for ordinary sampling, Top-K, correlation thresholds, feature-selection limits (10 default / 20 max), and reproducible random selection unless the user overrides them.

## Report interactivity (V2)

All charts are vanilla JS/SVG, fully offline, with fade-in animations and no CDN dependencies.

- **Theme & language** — the top bar offers a light/dark theme toggle and an EN/中文 language toggle; preferences persist in localStorage; the theme is applied by a head inline script before first paint (no flash on navigation).
- **Dataset Overview** — metric cards, semantic-type counts (live), a per-column "Treat as" type-override selector (numeric / categorical / datetime / text / ignored), and AI commentary. Overrides persist and apply globally.
- **Data Quality** — icon-based quality summary; Column health is rendered client-side (honors type overrides): clean non-categorical columns are hidden, flagged columns are listed (`has_missing`, constant, id-like, stray content, …), and each categorical column embeds its top-5 category charts (vertical bar with horizontal labels + centered donut pie without legend, no figure titles, remainder grouped as "Other") directly beneath its health row; category shares use FULL-data counts; the missingness table lists only columns that actually have missing values.
- **Distributions** — numeric single-feature analysis: line (full row) + KDE + horizontal box plot; chart-type checkboxes sit beside the feature selector with a fixed width (no reflow); features re-typed to numeric in Overview become selectable **including previously excluded (constant/critical) columns**; the Field statistics table is rendered client-side and highlights the selected feature's row (mean/median/std/min/max/Q1/Q3/IQR/skew/outliers).
- **Relationships (always on)** — pick any two features; without color-by: num×num → scatter (with live Pearson/Spearman badges), num×cat → grouped box plot, cat×cat → cross-frequency heatmap; checking a third categorical "color by" feature keeps everything on ONE chart: colored scatter (num×num), a single grouped box plot split by the color category (num×cat), or a single stacked bar chart (cat×cat).
- **Correlations** — pick which numeric features to include (10 selected by default, max 20, counter-enforced); only the selected features are charted; Pearson/Spearman heatmaps plus a correlation network with a **live threshold slider**: dragging it instantly adds/removes edges by `|r|`; hovering a node highlights its connections; random-subset heatmap is reproducible; features re-typed to numeric join the analysis with client-computed correlations.

## Script entry points

- `scripts/check_environment.py` — environment/dependency/writeability checks (matplotlib/networkx optional in V2).
- `scripts/inspect_file.py` — input validation, sheet/header/type inspection.
- `scripts/profile_data.py` — dataset and column profiling with severity-scored quality flags, stray-content and has_missing detection, and usable/excluded feature sets.
- `scripts/visualize.py` — exports bounded, row-aligned plot data plus full-data category counts (no static images in V2).
- `scripts/correlation.py` — Pearson/Spearman matrices and reproducible random subset (no static images in V2).
- `scripts/run_analysis.py` — orchestrates inspection/profile/data-export/correlation and writes `analysis_result.json`.
- `scripts/generate_report.py` — renders the offline HTML report (split CSS/JS, favicon, `js/data.js` payload).

Client-side modules (under `assets/js/`): `core.js` (SVG helpers, scales, statistics, KDE, type-override engine, client-side matrix completion), `i18n.js` (EN/中文 dictionary), `charts/` (histogram, density, boxplot, barchart, line, scatter, heatmap, network, pie, grouped, qq, autocorr), `pages/` (overview, data_quality, distributions, relationships, correlations), `main.js`.

## Output contract

A complete report directory contains at least:

```text
index.html
favicon.ico
html/
css/        (base, layout, components, charts, print)
js/         (core, i18n, charts/, pages/, main, data.js)
assets/
  data/     (analysis_result.json, analysis_commentary.json)
```

The original source data remains unchanged.
