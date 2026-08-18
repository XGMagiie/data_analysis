/* charts/heatmap.js — DA.Heatmap (correlation matrix) and DA.Contingency (cat×cat counts) */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.Heatmap = function (container, opts) {
    const features = opts.features;
    const matrix = opts.matrix; // {colA: {colB: r}}
    const W = 680;
    const pad = { l: 8, r: 92, t: 92, b: 8 };
    const cell = Math.max(34, Math.min(56, Math.floor((W - pad.l - pad.r) / features.length)));
    const H = cell * features.length + pad.t + pad.b;
    const svg = DA.mount(container, W, H);

    const x = (i) => pad.l + i * cell;
    const y = (i) => pad.t + i * cell;

    features.forEach((a, i) => {
      const label = DA.el('text', { x: x(i) + cell / 2, y: pad.t - 10, 'text-anchor': 'end', class: 'hm-label' }, svg);
      label.textContent = a.length > 14 ? a.slice(0, 13) + '…' : a;
      label.setAttribute('transform', `rotate(-52 ${x(i) + cell / 2} ${pad.t - 10})`);
      label.setAttribute('data-full', a);
      const ylabel = DA.el('text', { x: pad.l - 10, y: y(i) + cell / 2 + 3, 'text-anchor': 'end', class: 'hm-label' }, svg);
      ylabel.textContent = a.length > 14 ? a.slice(0, 13) + '…' : a;
      ylabel.setAttribute('data-full', a);

      features.forEach((b, j) => {
        const r = matrix && matrix[a] ? matrix[a][b] : undefined;
        const diag = a === b;
        if (r === undefined || r === null || Number.isNaN(r)) return;
        const rect = DA.el('rect', {
          x: x(j), y: y(i), width: cell - 2, height: cell - 2, rx: 2,
          fill: diag ? 'var(--surface-3)' : DA.corrColor(r), class: 'hm-cell', opacity: diag ? 1 : 0.9,
        }, svg);
        if (!diag) {
          DA.el('text', {
            x: x(j) + cell / 2, y: y(i) + cell / 2 + 3.5, 'text-anchor': 'middle',
            class: 'hm-label', fill: Math.abs(r) > 0.55 ? '#06120d' : 'var(--muted)',
          }, svg).textContent = r.toFixed(2);
          rect.addEventListener('mouseenter', (e) => {
            DA.tooltip.show(
              `<div class="tt-title">${DA.escape(b)} × ${DA.escape(a)}</div>` +
              `<div class="tt-line">r = <b>${r.toFixed(4)}</b></div>`,
              e.clientX, e.clientY);
          });
          rect.addEventListener('mouseleave', () => DA.tooltip.hide());
        }
      });
    });
    return svg;
  };

  /* Contingency table: opts = {a:{values,label}, b:{values,label}} */
  DA.Contingency = function (container, opts) {
    const W = 680;
    const m = Math.min(opts.a.values.length, opts.b.values.length);
    const pairs = [];
    for (let i = 0; i < m; i++) {
      if (opts.a.values[i] !== null && opts.b.values[i] !== null) pairs.push([String(opts.a.values[i]), String(opts.b.values[i])]);
    }
    const count = (arr, k) => arr.reduce((n, v) => (v === k ? n + 1 : n), 0);

    let catsA = [...new Set(pairs.map((p) => p[0]))].sort();
    let catsB = [...new Set(pairs.map((p) => p[1]))].sort();
    if (catsA.length > 30) catsA = catsA.slice(0, 30);
    if (catsB.length > 30) catsB = catsB.slice(0, 30);
    const cells = catsA.map((a) => catsB.map((b) => pairs.filter((p) => p[0] === a && p[1] === b).length));
    const maxC = Math.max(1, ...cells.flat());

    const pad = { l: 8, r: 120, t: 120, b: 8 };
    const cell = Math.max(26, Math.min(44, Math.floor((W - pad.l - pad.r) / Math.max(1, catsB.length))));
    const H = cell * catsA.length + pad.t + pad.b;
    const svg = DA.mount(container, W, Math.min(620, H));
    if (!catsA.length || !catsB.length) return svg;

    const x = (j) => pad.l + j * cell;
    const y = (i) => pad.t + i * cell;

    catsB.forEach((b, j) => {
      const t = DA.el('text', { x: x(j) + cell / 2, y: pad.t - 10, 'text-anchor': 'end', class: 'hm-label' }, svg);
      t.textContent = b.length > 14 ? b.slice(0, 13) + '…' : b;
      t.setAttribute('transform', `rotate(-52 ${x(j) + cell / 2} ${pad.t - 10})`);
    });
    catsA.forEach((a, i) => {
      DA.el('text', { x: pad.l - 10, y: y(i) + cell / 2 + 3, 'text-anchor': 'end', class: 'hm-label' }, svg)
        .textContent = a.length > 20 ? a.slice(0, 19) + '…' : a;
      catsB.forEach((b, j) => {
        const c = cells[i][j];
        const f = c / maxC;
        const rect = DA.el('rect', {
          x: x(j), y: y(i), width: cell - 2, height: cell - 2, rx: 2,
          fill: c ? DA.interp(f, '#1c2434', '#2ee6a8') : 'var(--surface-2)', class: 'hm-cell',
        }, svg);
        rect.addEventListener('mouseenter', (e) => {
          DA.tooltip.show(
            `<div class="tt-title">${DA.escape(a)} × ${DA.escape(b)}</div><div class="tt-line"><b>${DA.fmt(c)}</b> rows</div>`,
            e.clientX, e.clientY);
        });
        rect.addEventListener('mouseleave', () => DA.tooltip.hide());
        if (c) DA.el('text', { x: x(j) + cell / 2, y: y(i) + cell / 2 + 3.5, 'text-anchor': 'middle', class: 'hm-label' }, svg).textContent = DA.fmt(c);
      });
    });
    return svg;
  };
})(window);
