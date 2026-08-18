# Visualization Rules

## General
Choose charts by semantic type. Do not generate every possible chart. Respect `max_auto_visualized_features` and sampling limits from configuration. Every chart record must state whether sampling was used.

## Single variable
- Numeric: histogram + box plot.
- Categorical/boolean: Top-K bar chart; pie charts are not a default.
- Datetime: record-count/time-coverage view when meaningful.
- Text/ID-like: no NLP; normally no automatic plot.

## Pairwise
- numeric + numeric: scatter; use sample or hexbin for large N.
- numeric + categorical: category box plot with Top-K categories.
- categorical + categorical: contingency heatmap or stacked summary when cardinality is manageable.
- datetime + numeric: time series line plot, sorted by time; if dense, sample or aggregate only when the method is documented.
- datetime + categorical: category counts over time only for low-cardinality categories.
- text-heavy pairs: skip with an explicit reason.

## Interpretability
Chart titles and axes must identify variables. Large-data charts must state original N, plotted N, and sampling method in metadata/report text.
