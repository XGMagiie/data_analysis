/* charts/qq.js — DA.QQPlot: normal Q-Q plot with reference line.
 * opts: {values, label, color} */
(function (global) {
  'use strict';
  const DA = global.DA;

  /* Beasley-Springer-Moro approximation of the inverse normal CDF */
  DA.normInv = function (p) {
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
    const plow = 0.02425, phigh = 1 - plow;
    let q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      r = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= phigh) {
      q = p - 0.5;
      const r2 = q * q;
      r = (((((a[0] * r2 + a[1]) * r2 + a[2]) * r2 + a[3]) * r2 + a[4]) * r2 + a[5]) * q / (((((b[0] * r2 + b[1]) * r2 + b[2]) * r2 + b[3]) * r2 + b[4]) * r2 + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      r = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    return r;
  };

  DA.QQPlot = function (container, opts) {
    const W = 640, H = 460;
    const pad = { l: 56, r: 16, t: 16, b: 48 };
    const svg = DA.mount(container, W, H);

    const vals = opts.values.filter((v) => Number.isFinite(v));
    if (vals.length < 4) return svg;
    const sorted = vals.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const pts = sorted.map((v, i) => {
      const p = (i + 0.5) / n;
      return [DA.normInv(p), v];
    });
    let xMin = Math.min(...pts.map((p) => p[0])), xMax = Math.max(...pts.map((p) => p[0]));
    let yMin = Math.min(...pts.map((p) => p[1])), yMax = Math.max(...pts.map((p) => p[1]));
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 0.5; yMax += 0.5; }
    const x = DA.linear([xMin, xMax], [pad.l, W - pad.r]);
    const y = DA.linear([yMin, yMax], [H - pad.b, pad.t]);
    const color = opts.color || DA.colorFor(3);

    // reference line through Q1 and Q3
    const q = (p) => sorted[Math.min(n - 1, Math.max(0, Math.round((n - 1) * p)))];
    const x1 = DA.normInv(0.25), y1 = q(0.25);
    const x2 = DA.normInv(0.75), y2 = q(0.75);
    DA.el('line', {
      x1: x(x1), y1: y(y1), x2: x(x2), y2: y(y2),
      stroke: 'var(--accent)', 'stroke-width': 1.6, 'stroke-dasharray': '5 4', opacity: 0.85, class: 'qq-ref',
    }, svg);

    // grid + axes
    DA.niceTicks(yMin, yMax, 5).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    DA.niceTicks(xMin, xMax, 6).forEach((v) => {
      DA.el('text', { x: x(v), y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(v, 2);
    });

    // points (sample as needed)
    const step = Math.max(1, Math.floor(pts.length / 4000));
    for (let i = 0; i < pts.length; i += step) {
      const [xv, yv] = pts[i];
      const dot = DA.el('circle', { cx: x(xv), cy: y(yv), r: 2.6, fill: color, opacity: 0.55, class: 'scatter-pt' }, svg);
      dot.addEventListener('mouseenter', (e) => {
        DA.tooltip.show(
          `<div class="tt-title">${DA.escape(opts.label)}</div>` +
          `<div class="tt-line">theoretical z <b>${xv.toFixed(3)}</b></div>` +
          `<div class="tt-line">sample <b>${DA.fmt(yv)}</b></div>`,
          e.clientX, e.clientY);
      });
      dot.addEventListener('mouseleave', () => DA.tooltip.hide());
    }

    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = 'theoretical quantiles';
    const yTitle = DA.el('text', { transform: 'rotate(-90)', x: -(pad.t + (H - pad.b - pad.t) / 2), y: 14, 'text-anchor': 'middle', class: 'axis-title' }, svg);
    yTitle.textContent = opts.label;
    return svg;
  };
})(window);
