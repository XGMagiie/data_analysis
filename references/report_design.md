# HTML Report Design

## Visual direction
V2 reports follow a "scientific blueprint lab" aesthetic (see the frontend-design skill): dark ink-blue surfaces, graph-paper grid atmosphere, monospace-first typography with a serif display heading, amber/teal/red accents, and restrained motion (staggered reveals, hover lifts, live slider feedback). No external CDN resources, no marketing gradients.

## Architecture
All charts are rendered client-side with vanilla JS/SVG (no charting library, no network requests):
- Python exports factual statistics and bounded plot data into `analysis_result.json`.
- `generate_report.py` renders templates and emits a single self-contained `js/data.js` (`window.DA.DATA = {...}`) to avoid `file://` fetch CORS issues.
- Page scripts re-draw charts from `DA.DATA` on load and on user interaction.

## Layout
- sticky top navigation on desktop;
- centered max-width content area;
- responsive metric grid with icons;
- panels with clear headings and icon headers;
- scrollable tables;
- chart figures with titles, captions, and sampling notes;
- visible empty states and alerts;
- print stylesheet.

## Components
CSS is split by concern — do not merge back into one file:
- `css/base.css` — design tokens, reset, typography, atmosphere.
- `css/layout.css` — topbar, hero, container, grids, footer.
- `css/components.css` — cards, badges, tables, controls, quality rows, slider, tabs.
- `css/charts.css` — chart figures, axes, tooltips, network, legend.
- `css/print.css` — print output.

JS is split into modules under `js/`:
- `core.js` — DA namespace: SVG helpers, scales, formatting, stats (Pearson/Spearman/histogram/quantiles), tooltip.
- `charts/*.js` — one module per chart type (histogram, boxplot, barchart, scatter, heatmap, network).
- `pages/*.js` — page-specific rendering and interaction.
- `main.js` — nav state, reveal animation, truncated-label tooltips.
- `data.js` — generated payload, never edited by hand.

## Interactive behaviors
- Theme: light/dark toggle in the top bar; CSS variables switch via `html[data-theme]`; preference persists and is applied by a head inline script before first paint (no flash on navigation).
- Language: EN/中文 toggle; interface chrome is translated via `js/i18n.js` (data-i18n attributes + `DA.t()`); AI commentary, column names, and values stay as-is.
- Feature filtering: `profile.usable_columns` / `profile.excluded_columns` drive what is analyzed. Excluded columns (critical flags, constants) are exported separately under `data.excluded` so the UI can reveal them for inspection.
- Type overrides: `DA.overrides` (localStorage) lets users re-classify features; `DA.coerceSeries` converts the exported series client-side; `DA.buildMatrix` completes correlation matrices for re-typed numeric features using sample-level pair statistics.
- Distributions: single-feature analysis — one dropdown selects the feature; all applicable chart types render (line over shared time axis or row order, density, histogram, box plot, category bars, time coverage); charts redraw on change.
- Correlations: a feature picker selects which numeric features appear in heatmap and network (10 by default, 20 max, enforced by counter); method tabs; a threshold slider re-filters the network's edges in real time; hover a node to highlight its connections.
- Relationships: any two features can be selected; the chart adapts to semantic types; numeric pairs show live Pearson/Spearman; a color-by category selector shades scatter points. Enabled by default.
- All pages redraw on `da-lang-change` so dynamic labels translate.

## Portability and security
Copy all CSS/JS/templates into the report directory. Never reference Skill-internal paths. HTML-escape all user-provided strings. JSON serialized into `data.js` escapes `<` to avoid `</script>` breakout.

## Pages
- `index.html`: executive overview, key findings, navigation.
- `html/overview.html`: dataset/schema details.
- `html/data_quality.html`: icon-based quality summary, per-column health, flags.
- `html/distributions.html`: interactive univariate charts + field statistics.
- `html/relationships.html`: interactive pairwise feature explorer (default on).
- `html/correlations.html`: Pearson/Spearman heatmaps, threshold slider + network, random subset.
