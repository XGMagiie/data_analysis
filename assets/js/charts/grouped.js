/* charts/grouped.js — DA.GroupBar (per-group mean bars), DA.FacetBox
 * (faceted box plots: x = primary category, each panel grouped by the color
 * category), DA.FacetContingency (one cross-frequency heatmap per color
 * category). */
(function (global) {
  'use strict';
  const DA = global.DA;

  /* Group mean bars with std whiskers */
  DA.GroupBar = function (container, opts) {
    const groups = opts.groups.filter((g) => g.values.length > 0);
    const W = 640, H = 340;
    const pad = { l: 46, r: 16, t: 16, b: 74 };
    const svg = DA.mount(container, W, H);
    if (!groups.length) return svg;

    const stats = groups.map((g) => {
      const vals = g.values.filter((v) => Number.isFinite(v));
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const sd = vals.length > 1 ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (vals.length - 1)) : 0;
      return { mean, sd, n: vals.length };
    });
    let yMin = Infinity, yMax = -Infinity;
    stats.forEach((s, i) => {
      yMin = Math.min(yMin, s.mean - s.sd);
      yMax = Math.max(yMax, s.mean + s.sd);
    });
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const y = DA.linear([yMin, yMax], [H - pad.b, pad.t]);
    const bw = (W - pad.l - pad.r) / groups.length;

    DA.niceTicks(yMin, yMax, 5).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });

    groups.forEach((g, i) => {
      const cx = pad.l + bw * i + bw / 2;
      const barW = Math.max(3, bw * 0.55);
      const st = stats[i];
      const color = g.color || DA.colorFor(i);
      const base = (0 >= yMin && 0 <= yMax) ? 0 : yMin;
      // whisker
      DA.el('line', { x1: cx, y1: y(st.mean - st.sd), x2: cx, y2: y(st.mean + st.sd), class: 'box-whisker', style: `stroke:${color}` }, svg);
      DA.el('line', { x1: cx - 7, y1: y(st.mean - st.sd), x2: cx + 7, y2: y(st.mean - st.sd), class: 'box-whisker', style: `stroke:${color}` }, svg);
      DA.el('line', { x1: cx - 7, y1: y(st.mean + st.sd), x2: cx + 7, y2: y(st.mean + st.sd), class: 'box-whisker', style: `stroke:${color}` }, svg);
      // bar from baseline to mean
      const yTop = y(Math.max(st.mean, base));
      const yBot = y(Math.min(st.mean, base));
      DA.el('rect', {
        x: cx - barW / 2, y: yTop, width: barW, height: Math.max(1, yBot - yTop),
        fill: color, opacity: 0.82, rx: 2, class: 'bar',
      }, svg);
      // mean value
      DA.el('text', { x: cx, y: y(st.mean) - 5, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(st.mean);
      // label
      const label = g.name.length > 14 ? g.name.slice(0, 13) + '…' : g.name;
      const t = DA.el('text', { x: cx, y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg);
      t.textContent = label;
      if (g.name.length > 14) t.setAttribute('data-full', g.name);
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = 'mean';
    return svg;
  };

  /* Faceted box plots: primary category on panels, colored category grouped inside */
  DA.FacetBox = function (container, opts) {
    container.innerHTML = '';
    const xVals = [...new Set(opts.xCat)].sort();
    const cVals = [...new Set(opts.cCat)].sort();
    const grid = document.createElement('div');
    grid.className = 'facet-grid';
    container.appendChild(grid);

    xVals.slice(0, 9).forEach((xv) => {
      const panel = document.createElement('div');
      panel.className = 'facet-panel chart-figure';
      const title = document.createElement('div');
      title.className = 'chart-title';
      title.textContent = `${opts.xName}: ${xv}`;
      panel.appendChild(title);
      const body = document.createElement('div');
      body.className = 'chart-body';
      panel.appendChild(body);

      const groups = cVals.map((cv, j) => {
        const values = [];
        for (let k = 0; k < opts.y.length; k++) {
          if (opts.xCat[k] === xv && opts.cCat[k] === cv && opts.y[k] !== null && Number.isFinite(opts.y[k])) values.push(opts.y[k]);
        }
        return { name: cv, values, color: DA.colorFor(j) };
      }).filter((g) => g.values.length >= 3);

      if (groups.length) DA.GroupBox(body, { groups, label: opts.yName });
      else body.innerHTML = '<div class="empty">—</div>';
      grid.appendChild(panel);
    });
  };

  /* Faceted cross-frequency heatmaps: one panel per color-category value */
  DA.FacetContingency = function (container, opts) {
    container.innerHTML = '';
    const cVals = [...new Set(opts.c)].sort();
    const grid = document.createElement('div');
    grid.className = 'facet-grid';
    container.appendChild(grid);

    cVals.slice(0, 9).forEach((cv) => {
      const ia = [], ib = [];
      for (let k = 0; k < opts.c.length; k++) {
        if (opts.c[k] === cv) { ia.push(opts.a[k]); ib.push(opts.b[k]); }
      }
      if (ia.length < 2) return;
      const panel = document.createElement('div');
      panel.className = 'facet-panel chart-figure';
      const title = document.createElement('div');
      title.className = 'chart-title';
      title.textContent = `${opts.cName}: ${cv}`;
      panel.appendChild(title);
      const body = document.createElement('div');
      body.className = 'chart-body';
      panel.appendChild(body);
      DA.Contingency(body, { a: { values: ia, label: opts.aName }, b: { values: ib, label: opts.bName } });
      grid.appendChild(panel);
    });
  };

  /* Single grouped box plot: x-axis = primary categories, within each the
   * color-category groups are drawn side by side (one chart, no facets). */
  DA.GroupedBox = function (container, opts) {
    const xVals = [...new Set(opts.xCat)].filter((v) => v !== null && v !== undefined).sort().slice(0, 8);
    const cVals = [...new Set(opts.cCat)].filter((v) => v !== null && v !== undefined).sort().slice(0, 6);
    const W = 700, H = 400;
    const pad = { l: 56, r: 16, t: 16, b: 64 };
    const svg = DA.mount(container, W, H);
    if (!xVals.length || !cVals.length) return svg;

    const byX = {};
    xVals.forEach((xv) => { byX[xv] = {}; cVals.forEach((cv) => { byX[xv][cv] = []; }); });
    const m = Math.min(opts.xCat.length, opts.cCat.length, opts.y.length);
    for (let i = 0; i < m; i++) {
      const xv = opts.xCat[i], cv = opts.cCat[i], yv = opts.y[i];
      if (byX[xv] && byX[xv][cv] !== undefined && yv !== null && Number.isFinite(yv)) byX[xv][cv].push(yv);
    }
    const all = xVals.flatMap((xv) => cVals.flatMap((cv) => byX[xv][cv]));
    if (!all.length) return svg;
    const allStats = DA.quantiles(all);
    const lo = Math.min(allStats.min, allStats.lo);
    const hi = Math.max(allStats.max, allStats.hi);
    const y = DA.linear([lo, hi], [H - pad.b, pad.t]);

    const slotW = (W - pad.l - pad.r) / xVals.length;
    const bw = slotW / cVals.length;

    xVals.forEach((xv, i) => {
      const cx0 = pad.l + slotW * i;
      cVals.forEach((cv, j) => {
        const values = byX[xv][cv];
        if (values.length < 3) return;
        const color = DA.colorFor(j);
        const cx = cx0 + slotW / 2 + (j - (cVals.length - 1) / 2) * bw;
        const s = DA.quantiles(values);
        DA.el('line', { x1: cx, y1: y(s.lo), x2: cx, y2: y(s.q1), class: 'box-whisker', style: `stroke:${color}` }, svg);
        DA.el('line', { x1: cx, y1: y(s.q3), x2: cx, y2: y(s.hi), class: 'box-whisker', style: `stroke:${color}` }, svg);
        DA.el('line', { x1: cx - 7, y1: y(s.lo), x2: cx + 7, y2: y(s.lo), class: 'box-whisker', style: `stroke:${color}` }, svg);
        DA.el('line', { x1: cx - 7, y1: y(s.hi), x2: cx + 7, y2: y(s.hi), class: 'box-whisker', style: `stroke:${color}` }, svg);
        DA.el('rect', {
          x: cx - bw * 0.32, y: y(s.q3), width: bw * 0.64, height: Math.max(1, y(s.q1) - y(s.q3)), rx: 2,
          class: 'box', style: `stroke:${color}`,
        }, svg);
        DA.el('line', { x1: cx - bw * 0.32, y1: y(s.median), x2: cx + bw * 0.32, y2: y(s.median), class: 'box-median' }, svg);
        s.outliers.forEach((v) => DA.el('circle', { cx, cy: y(v), r: 3, class: 'box-outlier' }, svg));
      });
      const t = DA.el('text', { x: cx0 + slotW / 2, y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg);
      t.textContent = xv.length > 14 ? xv.slice(0, 13) + '…' : xv;
      if (xv.length > 14) t.setAttribute('data-full', xv);
    });
    DA.niceTicks(lo, hi, 6).forEach((v) => {
      DA.el('line', { x1: pad.l - 4, y1: y(v), x2: pad.l, y2: y(v), class: 'axis-tick' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    // legend
    cVals.forEach((cv, j) => {
      DA.el('circle', { cx: pad.l + 14, cy: pad.t + 10 + j * 16, r: 5, fill: DA.colorFor(j) }, svg);
      DA.el('text', { x: pad.l + 26, y: pad.t + 14 + j * 16, class: 'axis-label' }, svg).textContent = cv;
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.xName;
    return svg;
  };

  /* Single stacked bar for three categorical features: x = A, dodge = C,
   * stacked segments = B (one chart, no facets). */
  DA.StackedBar = function (container, opts) {
    const aVals = [...new Set(opts.a)].filter((v) => v !== null).sort().slice(0, 8);
    const cVals = [...new Set(opts.c)].filter((v) => v !== null).sort().slice(0, 4);
    const bVals = [...new Set(opts.b)].filter((v) => v !== null).sort().slice(0, 6);
    const W = 700, H = 380;
    const pad = { l: 46, r: 16, t: 16, b: 70 };
    const svg = DA.mount(container, W, H);
    if (!aVals.length || !bVals.length) return svg;

    const count = {};
    const total = {};
    const m = Math.min(opts.a.length, opts.b.length, opts.c.length);
    for (let i = 0; i < m; i++) {
      const av = opts.a[i], bv = opts.b[i], cv = opts.c[i];
      if (!aVals.includes(av) || !bVals.includes(bv) || !cVals.includes(cv)) continue;
      const key = `${av}\u0001${cv}`;
      total[key] = (total[key] || 0) + 1;
      count[`${av}\u0001${cv}\u0001${bv}`] = (count[`${av}\u0001${cv}\u0001${bv}`] || 0) + 1;
    }
    const maxTotal = Math.max(1, ...Object.values(total));
    const y = DA.linear([0, maxTotal * 1.08], [H - pad.b, pad.t]);
    const slotW = (W - pad.l - pad.r) / aVals.length;
    const bw = slotW / Math.max(1, cVals.length);

    DA.niceTicks(0, maxTotal, 4).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });

    aVals.forEach((av, i) => {
      const cx0 = pad.l + slotW * i + slotW / 2;
      cVals.forEach((cv, j) => {
        const cx = cx0 + (j - (cVals.length - 1) / 2) * bw;
        const key = `${av}\u0001${cv}`;
        const ttl = total[key] || 0;
        if (!ttl) return;
        let acc = 0;
        bVals.forEach((bv, k) => {
          const c = count[`${av}\u0001${cv}\u0001${bv}`] || 0;
          if (!c) return;
          const color = DA.colorFor(k);
          const yTop = y(acc + c);
          const yBot = y(acc);
          const rect = DA.el('rect', {
            x: cx - bw * 0.36, y: yTop, width: bw * 0.72, height: Math.max(0.6, yBot - yTop),
            fill: color, opacity: 0.88, class: 'bar',
          }, svg);
          rect.addEventListener('mouseenter', (e) => {
            DA.tooltip.show(
              `<div class="tt-title">${DA.escape(av)} · ${DA.escape(cv)} · ${DA.escape(bv)}</div>` +
              `<div class="tt-line"><b>${DA.fmt(c)}</b> rows</div>`,
              e.clientX, e.clientY);
          });
          rect.addEventListener('mouseleave', () => DA.tooltip.hide());
          acc += c;
        });
      });
      const t = DA.el('text', { x: cx0, y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg);
      t.textContent = av.length > 12 ? av.slice(0, 11) + '…' : av;
      if (av.length > 12) t.setAttribute('data-full', av);
    });
    // legend (stack segments = B)
    bVals.forEach((bv, k) => {
      DA.el('rect', { x: pad.l + 8, y: pad.t + 6 + k * 16, width: 11, height: 11, rx: 2, fill: DA.colorFor(k) }, svg);
      DA.el('text', { x: pad.l + 26, y: pad.t + 15 + k * 16, class: 'axis-label' }, svg).textContent = bv;
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.aName;
    return svg;
  };
})(window);
