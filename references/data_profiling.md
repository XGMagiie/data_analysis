# Data Profiling Rules

## Dataset-level facts
Report row count, column count, semantic-type counts, missing cell count/rate, duplicate row count/rate, fully empty rows, fully empty columns, approximate in-memory size, and a quality summary (critical/warning/info flag counts plus clean columns).

## Numeric fields
Calculate count, missing count/rate, finite count, positive/negative infinity counts, mean, median, min, max, standard deviation, variance, Q1, Q3, IQR, skewness, kurtosis, zero count/rate, and IQR potential-outlier count/rate where meaningful.

Exclude infinities from finite descriptive statistics but report how many were excluded. Do not modify the source data.

## Categorical / boolean / ID-like / text fields
Report non-null count, missing count/rate, unique count/ratio, most frequent value, frequency and share. Limit displayed categories to configurable Top-K.

## Datetime fields
Report valid count, missing count/rate, earliest/latest time, time span, duplicate timestamps, monotonicity, and median interval when enough ordered timestamps exist. A median interval is not proof of a fixed sampling period.

## Data quality flags and severity
Flag rather than repair. Every flag carries a `severity`:
- `critical` — `all_missing`, `stray_content_candidate`, `high_missing` at ≥ `high_missing_critical_rate`.
- `warning` — `constant`, `near_constant`, `high_cardinality`, `infinity`, `high_missing` below the critical rate.
- `info` — `id_like`, `has_missing` (any column with missing values below the high-missing threshold).

### Stray-content detection
`stray_content_candidate` fires on a column with high missingness **and** structurally inconsistent non-null content:
- a large share of long heading-like strings (≥ 30% longer than 20 chars), or
- a mix of numeric and text fragments (20–80% numeric parse ratio), or
- a tiny detached "island" of non-null values (≥ 70% missing and ≤ max(10, 5% of rows) non-null).

This catches worksheet answers, per-group notes, or other content merged into the data table (e.g., a column of "Solutions of Questions" headings). It is a candidate flag, not a verdict.

Potential outliers are statistical candidates, not automatically bad data.
