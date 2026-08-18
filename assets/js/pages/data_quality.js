/* pages/data_quality.js — renders Column health fully client-side so it honors
 * type overrides from the Overview. Clean non-categorical columns are hidden;
 * categorical columns embed their top-5 (bar + donut pie) charts beneath the
 * health row. */
(function (global) {
  'use strict';
  const DA = global.DA;

  const TOP_K = 5;

  const ICONS = {
    clean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8 12.4l2.6 2.6L16 9.6"/></svg>',
    critical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 21 19.5H3z"/><path d="M12 9.5v4.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/></svg>',
  };

  function worstSeverity(flags) {
    if (flags.some((f) => f.severity === 'critical')) return 'critical';
    if (flags.some((f) => f.severity === 'warning')) return 'warning';
    if (flags.length) return 'info';
    return 'clean';
  }



  function figure(title, caption) {
    const fig = document.createElement('figure');
    fig.className = 'chart-figure reveal';
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

  function top5WithOther(items) {
    const top = items.slice(0, TOP_K).map((i) => ({ label: i.label, count: i.count }));
    const rest = items.slice(TOP_K).reduce((s, i) => s + i.count, 0);
    if (rest > 0) top.push({ label: DA.t('quality.other'), count: rest });
    return top;
  }

  function descFor(stats, baseType) {
    if (baseType === 'numeric') {
      return `mean ${DA.fmt(stats.mean)}, median ${DA.fmt(stats.median)}, std ${DA.fmt(stats.std)}, IQR outliers ${stats.potential_outlier_count_iqr || 0}`;
    }
    if (baseType === 'datetime') {
      return `${stats.earliest || '—'} → ${stats.latest || '—'}`;
    }
    return `unique ${stats.unique_count}, top "${stats.top_value || '—'}" (${stats.top_count || 0})`;
  }

  function buildQrow(col, profile, flags, eff) {
    const sev = worstSeverity(flags);
    const stats = profile.statistics;
    const row = document.createElement('div');
    row.className = 'qrow';
    row.dataset.col = col;

    const icon = document.createElement('div');
    icon.className = 'qicon sev-' + sev;
    icon.innerHTML = ICONS[sev] || ICONS.info;
    row.appendChild(icon);

    const body = document.createElement('div');
    body.className = 'qbody';

    const name = document.createElement('div');
    name.className = 'qname';
    const nameText = document.createElement('span');
    nameText.textContent = col;
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = eff + (DA.overrides.get(col) ? ' ⚑' : '');
    name.appendChild(nameText);
    name.appendChild(chip);
    if (sev === 'critical') {
      const nb = document.createElement('span');
      nb.className = 'badge badge-critical';
      nb.textContent = DA.t('quality.needsReview');
      name.appendChild(nb);
    }
    body.appendChild(name);

    const desc = document.createElement('div');
    desc.className = 'qdesc';
    let d = descFor(stats, profile.semantic_type) + ' · ' + DA.fmtPct(stats.missing_rate) + ' missing';
    if (flags.length) {
      flags.forEach((f) => { if (f.description) d += '<br>' + f.description; });
    }
    desc.innerHTML = d;
    body.appendChild(desc);
    row.appendChild(body);

    const right = document.createElement('div');
    right.className = 'qright';
    if (flags.length) {
      flags.forEach((f) => {
        const b = document.createElement('span');
        b.className = 'badge badge-' + f.severity;
        b.textContent = DA.flag(f.flag);
        right.appendChild(b);
      });
    } else {
      const b = document.createElement('span');
      b.className = 'badge badge-fact';
      b.textContent = DA.t('quality.noFlags');
      right.appendChild(b);
    }
    row.appendChild(right);
    return row;
  }

  function embedCatCharts(col, base) {
    const pair = document.createElement('div');
    pair.className = 'cat-pair';
    const grid = document.createElement('div');
    grid.className = 'chart-grid';
    pair.appendChild(grid);

    // Prefer FULL-data counts (exported by Python). Fall back to client-side
    // coercion (sampled) only when the column has no full_counts (high-cardinality).
    let counts = base.full_counts || null;
    if (!counts) {
      const s = DA.coerceSeries(base, DA.overrides.get(col));
      counts = s.counts || [];
    }
    const items = top5WithOther(counts);
    if (!items.length) return pair;

    const fb = figure('', '');
    DA.BarChart(fb.body, { items, label: col, color: DA.colorFor(2), horizontal: false });
    grid.appendChild(fb.fig);

    const fp = figure('', '');
    DA.PieChart(fp.body, {
      items: items.map((it, i) => ({
        label: it.label, count: it.count,
        color: it.label === DA.t('quality.other') ? '#5c6a80' : DA.colorFor(i),
      })),
      centerLabel: DA.fmt(items.reduce((s, i) => s + i.count, 0)),
      legend: false,
    });
    grid.appendChild(fp.fig);
    return pair;
  }

  function render() {
    const container = document.getElementById('col-health');
    if (!container) return;
    container.innerHTML = '';
    const analysis = DA.DATA.analysis;

    const statsByCol = {};
    const flagsByCol = {};
    const baseByCol = {};
    analysis.profile.columns.forEach((c) => {
      statsByCol[c.name] = c.statistics;
      flagsByCol[c.name] = c.flags;
      baseByCol[c.name] = c.semantic_type;
    });

    const seriesByCol = {};
    analysis.data.columns.forEach((c) => { seriesByCol[c] = analysis.data.series[c]; });
    (analysis.data.excluded || []).forEach((e) => { seriesByCol[e.name] = e.series; });

    const order = analysis.data.columns.slice();
    (analysis.data.excluded || []).forEach((e) => { if (!order.includes(e.name)) order.push(e.name); });

    let any = false;
    order.forEach((col) => {
      const baseType = baseByCol[col] || 'other';
      const eff = DA.overrides.effective(col, baseType);
      const flags = flagsByCol[col] || [];
      const isCat = ['categorical', 'boolean'].includes(eff);
      // hide clean non-categorical columns
      if (!isCat && !flags.length) return;
      any = true;

      container.appendChild(buildQrow(col, { statistics: statsByCol[col] || {}, semantic_type: baseType }, flags, eff));
      if (isCat && seriesByCol[col]) {
        container.appendChild(embedCatCharts(col, seriesByCol[col]));
      }
    });

    if (!any) {
      container.innerHTML = `<div class="empty">${DA.t('quality.noFlagsAtAll')}</div>`;
    }
  }

  function init() {
    if (!document.getElementById('col-health')) return;
    DA.overrides.init();
    render();
    document.addEventListener('da-lang-change', () => {
      DA.i18n.applyDom(document);
      render();
    });
    document.addEventListener('da-overrides-change', render);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
