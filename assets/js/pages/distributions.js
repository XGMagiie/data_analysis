/* pages/distributions.js — numeric single-feature analysis with a 3-chart
 * layout: line (full row), KDE + horizontal box. Features re-typed to numeric
 * in Overview become selectable, including previously excluded (constant /
 * critical) columns. The Field statistics table highlights the active row. */
(function (global) {
  'use strict';
  const DA = global.DA;

  function figure(title, caption, span2) {
    const fig = document.createElement('figure');
    fig.className = 'chart-figure reveal' + (span2 ? ' span-2' : '');
    if (title) {
      const h = document.createElement('div');
      h.className = 'chart-title';
      h.textContent = title;
      fig.appendChild(h);
    }
    if (caption) {
      const c = document.createElement('div');
      c.className = 'chart-caption';
      c.textContent = caption;
      fig.appendChild(c);
    }
    const body = document.createElement('div');
    body.className = 'chart-body';
    fig.appendChild(body);
    return { fig, body };
  }

  function captionFor(data) {
    if (data.sampled) return DA.t('dist.sampled', { n: data.plotted_count, m: data.original_count });
    return DA.t('dist.rows', { n: data.original_count });
  }

  function timeX(series, data) {
    if (data.x_axis && data.x_axis.values.length === series.values.length) {
      return { x: data.x_axis.values.map((v) => DA.timeToDays(v)), label: data.x_axis.name };
    }
    return { x: series.values.map((_, i) => i), label: 'row' };
  }

  function selectedTypes() {
    return [...document.querySelectorAll('#dist-toggles input:checked')].map((i) => i.value);
  }

  /* find a column's series: usable first, then excluded (re-typed columns) */
  function seriesFor(col) {
    const data = DA.DATA.analysis.data;
    if (data.series[col]) return data.series[col];
    const ex = (data.excluded || []).find((e) => e.name === col);
    return ex ? ex.series : null;
  }

  function renderStatTable(activeCol) {
    const wrap = document.getElementById('stat-table');
    if (!wrap) return;
    const analysis = DA.DATA.analysis;
    const profile = {};
    analysis.profile.columns.forEach((c) => { profile[c.name] = c.semantic_type; });
    const numerics = analysis.data.columns.filter((c) => DA.overrides.effective(c, profile[c]) === 'numeric');
    (analysis.data.excluded || []).forEach((e) => {
      if (DA.overrides.effective(e.name, profile[e.name] || 'other') === 'numeric') numerics.push(e.name);
    });
    const statsByCol = {};
    analysis.profile.columns.forEach((c) => { statsByCol[c.name] = c.statistics; });
    if (!numerics.length) {
      wrap.innerHTML = `<div class="empty">${DA.t('dist.noNumeric')}</div>`;
      return;
    }
    const ths = ['Column', 'mean', 'median', 'std', 'min', 'max', 'q1', 'q3', 'IQR', 'skew', 'outliers'];
    const keys = ['mean', 'median', 'std', 'min', 'max', 'q1', 'q3', 'iqr', 'skewness', 'potential_outlier_count_iqr'];
    let html = '<table class="stat-table"><thead><tr>';
    ths.forEach((t) => { html += `<th>${DA.escape(t)}</th>`; });
    html += '</tr></thead><tbody>';
    numerics.forEach((col) => {
      const st = statsByCol[col] || {};
      html += `<tr class="${col === activeCol ? 'stat-active' : ''}"><td>${DA.escape(col)}</td>`;
      keys.forEach((k) => { html += `<td>${DA.fmt(st[k])}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  function highlightStatRow(col) {
    renderStatTable(col);
  }

  function render() {
    const root = document.getElementById('dist-charts');
    if (!root) return;
    root.innerHTML = '';
    const analysis = DA.DATA.analysis;
    const data = analysis.data;
    const col = document.getElementById('dist-feature').value;
    const base = seriesFor(col);
    const note = document.getElementById('dist-note');
    if (!base) return;
    const s = DA.coerceSeries(base, DA.overrides.get(col));
    const cap = captionFor(data);
    const types = selectedTypes();
    if (note) note.textContent = 'numeric';
    highlightStatRow(col);

    const layout = document.createElement('div');
    layout.className = 'dist-layout';
    root.appendChild(layout);

    const vals = s.values.filter((v) => v !== null && Number.isFinite(v));

    // Row 1: line chart (full width)
    if (types.includes('line')) {
      const tx = timeX(s, data);
      if (tx.x.length >= 2) {
        const f = figure(`${col} — ${DA.t('chart.line')}`, cap, true);
        DA.LineChart(f.body, { xValues: tx.x, yValues: s.values, xLabel: tx.label, yLabel: col, color: DA.colorFor(5) });
        layout.appendChild(f.fig);
      }
    }
    // Row 2: KDE + horizontal box
    if (types.includes('density') && vals.length >= 2) {
      const f = figure(`${col} — ${DA.t('chart.density')}`, cap);
      DA.Density(f.body, { values: vals, label: col, color: DA.colorFor(0) });
      layout.appendChild(f.fig);
    }
    if (types.includes('box')) {
      const f = figure(`${col} — ${DA.t('dist.box')}`, cap + ' · IQR');
      DA.BoxPlot(f.body, { values: vals, label: col, color: DA.colorFor(1) });
      layout.appendChild(f.fig);
    }
    if (!layout.children.length) {
      root.innerHTML = `<div class="empty">${DA.t('dist.noCharts')}</div>`;
    }
  }

  function buildSelect() {
    const sel = document.getElementById('dist-feature');
    if (!sel) return;
    sel.innerHTML = '';
    const analysis = DA.DATA.analysis;
    const profile = {};
    analysis.profile.columns.forEach((c) => { profile[c.name] = c.semantic_type; });
    // usable columns + excluded columns that the user re-typed to numeric
    const candidates = analysis.data.columns.slice();
    (analysis.data.excluded || []).forEach((e) => { if (!candidates.includes(e.name)) candidates.push(e.name); });
    const numerics = candidates.filter((c) => DA.overrides.effective(c, profile[c] || 'other') === 'numeric');
    if (!numerics.length) {
      sel.innerHTML = `<option value="">${DA.t('dist.noNumeric')}</option>`;
      return;
    }
    numerics.forEach((c) => sel.appendChild(new Option(c, c)));
    sel.value = numerics[0];
    sel.addEventListener('change', render);
  }

  function init() {
    if (!document.getElementById('dist-feature')) return;
    DA.overrides.init();
    buildSelect();
    render();

    document.querySelectorAll('#dist-toggles input').forEach((cb) => {
      cb.addEventListener('change', render);
    });

    document.addEventListener('da-lang-change', () => {
      DA.i18n.applyDom(document);
      render();
    });
    document.addEventListener('da-overrides-change', () => {
      const col = document.getElementById('dist-feature').value;
      buildSelect();
      if ([...document.getElementById('dist-feature').options].some((o) => o.value === col)) {
        document.getElementById('dist-feature').value = col;
      }
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
