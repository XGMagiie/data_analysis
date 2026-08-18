# HTML Report Design

## Visual direction
Use a restrained technical-report/dashboard style: high legibility, clear hierarchy, compact information density, no marketing gradients, no decorative animation, and no external CDN resources.

## Layout
- sticky top navigation on desktop;
- centered max-width content area;
- responsive grid for summary metrics;
- sections with meaningful headings;
- scrollable tables;
- chart containers with captions and sampling notes;
- visible empty states and warnings.

## Components
Define reusable CSS for metric cards, panels, badges, alerts, tables, chart figures, navigation, and print styles. Use CSS variables in `:root` and avoid widespread inline styles.

## Portability and security
Copy all CSS/JS/templates/images into the generated report directory. Never reference Skill-internal paths. HTML-escape all user-provided strings and treat file/column names as untrusted input.

## Pages
- `index.html`: executive overview, key findings, navigation.
- `html/overview.html`: dataset/schema details.
- `html/data_quality.html`: missingness, duplicates, type/quality flags.
- `html/distributions.html`: univariate charts/statistics.
- `html/relationships.html`: requested pairwise charts.
- `html/correlations.html`: Pearson/Spearman results, random subset, networks.
