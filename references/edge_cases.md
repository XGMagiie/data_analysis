# Edge Cases and Degraded Behavior

Handle these cases explicitly:
- empty or header-only files;
- one-column datasets;
- no numeric fields;
- no categorical fields;
- all-missing fields;
- `NaN`, `+Inf`, `-Inf`;
- duplicate column names;
- high-cardinality categories;
- hundreds of columns;
- hundreds of thousands/millions of rows;
- malformed CSV rows;
- ambiguous CSV encoding/delimiter;
- Excel preamble rows and multiple sheets;
- timezone-aware datetime strings;
- unsafe HTML text and unsafe filename characters;
- correlations undefined because of zero variance or too few observations;
- existing output files.

## Large data
Prefer complete statistics when practical, but plots must use bounded representative samples. Record original and plotted counts. If loading the full dataset would exceed realistic memory, stop with a clear limitation instead of risking an out-of-memory crash. Chunked exact profiling is a future enhancement, not a V1 promise.

## Wide data
Do not auto-render hundreds of feature charts or an unreadable full correlation heatmap. Profile all columns, render only a bounded subset, and expose the limit in report notes.

## Existing output
Do not overwrite unless the user has explicitly approved it or `--force` was deliberately supplied.
