# Correlation Analysis

## Methods
Support Pearson and Spearman for usable numeric fields. Both matrices are exported in full JSON form so the client can re-filter interactively.

## Rules
- Exclude fields with insufficient finite observations or zero variance.
- A NaN correlation is not zero; mark it not applicable.
- Never describe correlation as causation.
- Keep coefficient sign and magnitude.

## Full matrix
Generate a full matrix only when numeric feature count is within `correlation_max_features`. For wider data, retain machine-readable results for a bounded subset and ask the user to choose additional fields when needed.

## Reproducible random subset
Select up to `random_feature_count` usable numeric fields using `random_seed`. Report exactly which fields were selected. The subset matrix is exported so the client can render it.

## Network (client-side, threshold slider)
- Python exports the full matrix only; the client builds edges where `abs(correlation) >= threshold`, excluding self-edges and NaN, and stores the signed coefficient.
- The report shows a live threshold slider; dragging it re-filters edges instantly.
- Edge color encodes sign (teal positive, red negative); width/opacity encode magnitude; node radius encodes degree.
- No-edge networks are valid and show an explanatory empty state, not an error.
