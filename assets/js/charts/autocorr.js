/* charts/autocorr.js — DA.AutoCorr: autocorrelation function (ACF) bar chart
 * with 95% confidence band. opts: {values, label, maxLag, color} */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.AutoCorr = function (container, opts) {
    const W = 640, H = 360;
    const pad = { l: 52, r: 14, t: 16, b: 44 };
    const svg = DA.mount(container, W, H);

    const vals = opts.values.filter((v) => Number.isFinite(v));
    const n = vals.length;
    const lags = (opts.lags || [0, 2, 4, 6, 8]).filter((k) => k >= 0 && k < Math.floor(n / 3));
    if (n < 8 || !lags.length) return svg;

    const mean = vals.reduce((s, v) => s + v, 0) / n;
    const acf = [];
    let v0 = 0;
    for (let i = 0; i < n; i++) v0 += (vals[i] - mean) * (vals[i] - mean);
    lags.forEach((k) => {
      let s = 0;
      for (let i = 0; i < n - k; i++) s += (vals[i] - mean) * (vals[i + k] - mean);
      acf.push({ k, v: v0 ? s / v0 : (k === 0 ? 1 : 0) });
    });

    const color = opts.color || DA.colorFor(4);
    const x = DA.linear([0, lags.length - 1], [pad.l, W - pad.r]);
    const y = DA.linear([-1, 1], [H - pad.b, pad.t]);
    const bw = Math.max(3, (W - pad.l - pad.r) / lags.length * 0.5);

    // confidence band
    const band = 1.96 / Math.sqrt(n);
    DA.el('line', { x1: pad.l, y1: y(band), x2: W - pad.r, y2: y(band), stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0.8, class: 'acf-band' }, svg);
    DA.el('line', { x1: pad.l, y1: y(-band), x2: W - pad.r, y2: y(-band), stroke: 'var(--accent)', 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0.8 }, svg);

    // zero line
    DA.el('line', { x1: pad.l, y1: y(0), x2: W - pad.r, y2: y(0), stroke: 'var(--line-bright)', 'stroke-width': 1 }, svg);

    acf.forEach((item) => {
      const v = item.v, k = item.k;
      const cx = x(lags.indexOf(k));
      const zeroY = y(0);
      const bar = DA.el('rect', {
        x: cx - bw / 2, y: Math.min(zeroY, y(v)), width: bw, height: Math.max(0.5, Math.abs(zeroY - y(v))),
        fill: v >= 0 ? color : 'var(--red)', opacity: 0.85, rx: 1, class: 'bar',
      }, svg);
      bar.addEventListener('mouseenter', (e) => {
        DA.tooltip.show(
          `<div class="tt-title">${DA.escape(opts.label)} — lag ${k}</div>` +
          `<div class="tt-line">ACF <b>${v.toFixed(4)}</b></div>` +
          `<div class="tt-line">95% band ±${band.toFixed(3)}</div>`,
          e.clientX, e.clientY);
      });
      bar.addEventListener('mouseleave', () => DA.tooltip.hide());
      // lag label
      DA.el('text', { x: cx, y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = k;
    });

    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = 'lag';
    DA.el('text', { x: pad.l, y: pad.t + 8, 'text-anchor': 'start', class: 'axis-title' }, svg).textContent = 'ACF';
    return svg;
  };
})(window);
