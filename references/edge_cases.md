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
Prefer complete statistics when practical; exported chart data must use bounded representative samples (≤ `plot_sample_size`, seeded). Record original and plotted counts. If loading the full dataset would exceed realistic memory, stop with a clear limitation instead of risking an out-of-memory crash. Chunked exact profiling is a future enhancement, not a V2 promise.

## Wide data
Do not render an unreadable full correlation heatmap or hundreds of charts. Profile all columns, bound the correlation matrix to `correlation_max_features`, and expose the limit in report notes.

## Stray content
Columns that look like merged workbook content (headings, answer blocks, tiny detached islands) are flagged `stray_content_candidate` (critical). The AI commentary should call these out explicitly and recommend exclusion from downstream use; the skill itself never deletes or edits columns.

## Feature filtering
Columns flagged critical (`all_missing`, `stray_content_candidate`, `high_missing` ≥ critical rate) or constant/near-constant are excluded from the usable analysis set (`profile.usable_columns` / `profile.excluded_columns`). Correlations, pairwise defaults, and exported plot data use only usable columns. Excluded columns remain available under `data.excluded` for optional inspection in the UI, but are never analyzed by default.

## Client-side rendering
The report must work from `file://` with no network: all JS/CSS are local and data is embedded in `js/data.js` (JSON with `<` escaped to prevent `</script>` breakout). If a browser blocks something, the skill degrades by leaving visible empty states with reasons.

## Existing output
Do not overwrite unless the user has explicitly approved it or `--force` was deliberately supplied.
