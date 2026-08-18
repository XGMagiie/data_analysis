/* charts/density.js — DA.Density: Gaussian KDE area chart */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.Density = function (container, opts) {
    const W = 640, H = 300;
    const pad = { l: 56, r: 16, t: 16, b: 40 };
    const svg = DA.mount(container, W, H);

    const curve = DA.kde(opts.values.filter((v) => Number.isFinite(v)), 120, opts.bandwidth);
    if (curve.length < 2) return svg;

    const xs = curve.map((p) => p[0]);
    const ys = curve.map((p) => p[1]);
    let xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMax = Math.max(...ys);
    if (xMin === xMax) { xMin -= 0.5; xMax += 0.5; }
    const x = DA.linear([xMin, xMax], [pad.l, W - pad.r]);
    const y = DA.linear([0, yMax * 1.08], [H - pad.b, pad.t]);
    const color = opts.color || DA.colorFor(0);

    // grid + y labels
    DA.niceTicks(0, yMax * 1.08, 4).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v, 2);
    });

    const linePts = curve.map((p) => `${x(p[0]).toFixed(2)},${y(p[1]).toFixed(2)}`);
    const areaPts = `${pad.l},${y(0)} ` + linePts.join(' ') + ` ${W - pad.r},${y(0)}`;
    DA.el('polygon', { points: areaPts, fill: color, opacity: 0.28, class: 'density-area' }, svg);
    DA.el('polyline', { points: linePts.join(' '), fill: 'none', stroke: color, 'stroke-width': 2, class: 'density-line' }, svg);

    // x axis
    DA.niceTicks(xMin, xMax, 6).forEach((v) => {
      const px = x(v);
      DA.el('line', { x1: px, y1: H - pad.b, x2: px, y2: H - pad.b + 4, class: 'axis-tick' }, svg);
      DA.el('text', { x: px, y: H - pad.b + 17, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.label;
    DA.el('text', { x: 14, y: pad.t + 8, 'text-anchor': 'start', class: 'axis-title' }, svg).textContent = 'density';
    return svg;
  };
})(window);
