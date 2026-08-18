# Visualization Rules

## General
Charts are rendered client-side (vanilla JS/SVG). Python exports **bounded, reproducible plot data** into `analysis_result.json`; it never renders static images. Choose chart type by semantic type. Respect `max_auto_visualized_features` and sampling limits from configuration. Every exported series must state whether sampling was used.

## Export contract
Each column exports a series under `data.series[column]`:
- `numeric` — bounded `values` array (≤ `plot_sample_size`), `original_count`, `plotted_count`, `sampled`.
- `categorical`/`boolean` — bounded (aligned) `values` plus top-K `counts` computed on the FULL column so shares reflect all rows, not the plot sample.
- `datetime` — bounded ISO `values`.
- `text`/`id_like`/`constant`/`unknown` — bounded `values` and top counts for summary display.

## Single variable (client-side, single-feature page)
The Distributions page analyzes **one feature at a time** and renders every applicable chart type:
- Numeric: line chart (over the shared time axis when a datetime column exists, else row order) + Gaussian density (KDE) + histogram + box plot.
- Categorical/boolean: top-K bar chart (pie charts are not a default); low-cardinality categories additionally get per-category counts over time.
- Datetime: record-count/time-coverage histogram + line.
- Text/ID-like: no NLP; show a top-values summary instead of a chart.

## Pairwise (interactive, default on)
The Relationships page lets the user pick any two features; the client adapts:
- numeric + numeric: scatter (optional color-by category), live Pearson/Spearman badges.
- numeric + categorical: grouped box plots (top categories).
- categorical + categorical: contingency heat table.
- datetime + numeric: time series line, sorted by time.
- text-heavy pairs: explicit empty state with reason.

## Interpretability
Chart titles and axes must identify variables. Large-data charts must state original N, plotted N, and sampling in captions.
