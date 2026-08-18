# Interpretation Guidelines

## Core principle
Python computes facts. AI interpretation must stay anchored to those facts.

Use four levels:
- **Fact** — directly computed or observed.
- **Observation** — descriptive pattern supported by the computed data.
- **Attention** — item worth user review, without asserting that it is wrong.
- **Limitation** — what the current analysis cannot establish.

## Do not
- infer causal effects from correlation;
- assume units or normal operating ranges;
- infer business meaning from a column name alone;
- call IQR candidates errors;
- diagnose machine/system failure without user-provided thresholds or domain evidence;
- invent trends when coverage or sample size is inadequate.

## Preferred wording
Use quantified evidence: “Column A has 18.4% missing values.”
Use conditional language when interpretation depends on context: “If this field is required downstream, the missingness may need review.”
When unsupported: “This cannot be determined from the current data alone.”

## Commentary JSON
Recommended structure:

```json
{
  "summary": [{"level": "Fact", "text": "..."}],
  "dataset": [{"level": "Observation", "text": "..."}],
  "quality": [{"level": "Attention", "text": "..."}],
  "correlation": [{"level": "Observation", "text": "..."}],
  "limitations": ["..."]
}
```
