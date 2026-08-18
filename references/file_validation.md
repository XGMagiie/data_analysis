# File Validation and Schema Inspection

## Supported files
`.csv`, `.xlsx`, `.xls`, `.xlsm`. XLSM is data-only; macros are never executed.

## CSV checks
- existence, readability, non-zero size;
- encoding detection with confidence/fallback handling;
- delimiter detection among comma, semicolon, tab, and pipe;
- parse consistency and obvious malformed-row errors;
- empty rows/columns and possible preamble rows;
- header detection from a limited preview.

When encoding or delimiter detection is ambiguous enough to alter interpretation, ask the user instead of silently guessing.

## Excel checks
- workbook readability;
- sheet names and emptiness;
- multiple sheets;
- leading blank/preamble rows;
- candidate header row.

If multiple non-empty sheets exist and no sheet is selected, stop before analysis and ask the user to choose a sheet or explicitly request all-sheet handling.

## Header detection
Score candidate rows using:
- proportion of non-empty cells;
- uniqueness of candidate names;
- text-like candidate cells;
- contrast between candidate-row cell types and following data rows;
- penalties for mostly numeric or mostly empty rows.

Return `header_detected`, `header_row`, `header_confidence`, and a preview. If confidence is below the configured threshold, ask the user. If there is no header, use `X1`, `X2`, ... .

## Column names
Duplicate or blank names must be normalized internally to unique safe display names while preserving original names in metadata. Never use raw column names as filesystem paths.

## Semantic types
Infer one of: `numeric`, `categorical`, `datetime`, `boolean`, `text`, `id_like`, `constant`, `unknown`.

Use pandas dtype only as one signal. Consider uniqueness ratio, parseability, string patterns, field name hints, cardinality, and missing rate. Avoid aggressive datetime inference and avoid turning zero-padded identifiers into numbers merely because they are parseable.
