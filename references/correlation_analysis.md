# Correlation Analysis

## Methods
Support Pearson and Spearman for usable numeric fields.

## Rules
- Exclude fields with insufficient finite observations or zero variance.
- A NaN correlation is not zero; mark it not applicable.
- Never describe correlation as causation.
- Keep coefficient sign and magnitude.

## Full matrix
Generate a full matrix only when numeric feature count is within `correlation_max_features`. For wider data, retain machine-readable results for a bounded subset and ask the user to choose additional fields when needed.

## Reproducible random subset
Select up to `random_feature_count` usable numeric fields using `random_seed`. Report exactly which fields were selected.

## Network
Create an edge when `abs(correlation) >= threshold`, excluding self-edges and NaN. Store the signed coefficient in edge metadata. No-edge networks are valid and should produce an explanatory empty-state result, not an error.
