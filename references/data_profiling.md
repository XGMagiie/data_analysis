# Data Profiling Rules

## Dataset-level facts
Report row count, column count, semantic-type counts, missing cell count/rate, duplicate row count/rate, fully empty rows, fully empty columns, and approximate in-memory size.

## Numeric fields
Calculate count, missing count/rate, finite count, positive/negative infinity counts, mean, median, min, max, standard deviation, variance, Q1, Q3, IQR, skewness, kurtosis, zero count/rate, and IQR potential-outlier count/rate where meaningful.

Exclude infinities from finite descriptive statistics but report how many were excluded. Do not modify the source data.

## Categorical / boolean / ID-like / text fields
Report non-null count, missing count/rate, unique count/ratio, most frequent value, frequency and share. Limit displayed categories to configurable Top-K.

## Datetime fields
Report valid count, missing count/rate, earliest/latest time, time span, duplicate timestamps, monotonicity, and median interval when enough ordered timestamps exist. A median interval is not proof of a fixed sampling period.

## Data quality flags
Flag rather than repair:
- all-missing columns;
- constant/near-constant columns;
- high missing rate;
- high-cardinality categories;
- ID-like columns;
- infinities;
- duplicate rows;
- IQR potential outliers.

Potential outliers are statistical candidates, not automatically bad data.
