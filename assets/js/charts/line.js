/* charts/line.js — DA.LineChart: x/y line chart with hover points.
 * opts: {xValues (timestamps ms or numbers), yValues, xLabel, yLabel, color} */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.LineChart = function (container, opts) {
    const W = 680, H = 360;
    const pad = { l: 56, r: 16, t: 16, b: 46 };
    const svg = DA.mount(container, W, H);

    const pts = [];
    const m = Math.min(opts.xValues.length, opts.yValues.length);
    for (let i = 0; i < m; i++) {
      const xv = opts.xValues[i], yv = opts.yValues[i];
      if (xv !== null && yv !== null && Number.isFinite(xv) && Number.isFinite(yv)) pts.push([xv, yv]);
    }
    if (pts.length < 2) return svg;

    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    let xMin = Math.min(...xs), xMax = Math.max(...xs);
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 0.5; yMax += 0.5; }
    const isTime = xMax - xMin > 1e8; // heuristic: timestamps are big ms values
    const x = DA.linear([xMin, xMax], [pad.l, W - pad.r]);
    const y = DA.linear([yMin, yMax], [H - pad.b, pad.t]);
    const color = opts.color || DA.colorFor(5);

    // grid
    DA.niceTicks(yMin, yMax, 5).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
    });

    // area under the curve (light)
    const linePts = pts.map((p) => `${x(p[0]).toFixed(2)},${y(p[1]).toFixed(2)}`);
    const areaPts = `${x(pts[0][0]).toFixed(2)},${y(0)} ` + linePts.join(' ') + ` ${x(pts[pts.length - 1][0]).toFixed(2)},${y(0)}`;
    DA.el('polygon', { points: areaPts, fill: color, opacity: 0.1, class: 'line-area' }, svg);
    DA.el('polyline', { points: linePts.join(' '), fill: 'none', stroke: color, 'stroke-width': 1.6, opacity: 0.92, class: 'line-series' }, svg);

    // y axis
    DA.niceTicks(yMin, yMax, 5).forEach((v) => {
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });

    // x axis (time formatted as date, else number)
    const xTicks = DA.niceTicks(xMin, xMax, 6);
    xTicks.forEach((v) => {
      const px = x(v);
      DA.el('line', { x1: px, y1: H - pad.b, x2: px, y2: H - pad.b + 4, class: 'axis-tick' }, svg);
      const label = isTime ? DA.fmtDate(new Date(v)) : DA.fmt(v);
      DA.el('text', { x: px, y: H - pad.b + 17, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = label;
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.xLabel;
    const yTitle = DA.el('text', { transform: 'rotate(-90)', x: -(pad.t + (H - pad.b - pad.t) / 2), y: 14, 'text-anchor': 'middle', class: 'axis-title' }, svg);
    yTitle.textContent = opts.yLabel;

    // hover: nearest point
    const hover = DA.el('g', { class: 'line-hover' }, svg);
    const probe = DA.el('rect', { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b, fill: 'transparent' }, hover);
    const cursor = DA.el('line', { y1: pad.t, y2: H - pad.b, stroke: 'var(--line-bright)', 'stroke-dasharray': '3 3', opacity: 0 }, hover);
    const dot = DA.el('circle', { r: 4, fill: color, stroke: '#0a0d13', 'stroke-width': 1.5, opacity: 0 }, hover);

    probe.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const relX = (e.clientX - svgRect.left) / (svgRect.width / W);
      // binary search nearest x
      let lo = 0, hi = pts.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (x(pts[mid][0]) < relX) lo = mid + 1; else hi = mid; }
      const p = pts[Math.max(0, lo - (x(pts[lo][0]) > relX && lo > 0 && Math.abs(x(pts[lo-1][0]) - relX) < Math.abs(x(pts[lo][0]) - relX) ? 1 : 0))];
      cursor.setAttribute('x1', x(p[0])); cursor.setAttribute('x2', x(p[0]));
      cursor.setAttribute('opacity', 0.6);
      dot.setAttribute('cx', x(p[0])); dot.setAttribute('cy', y(p[1]));
      dot.setAttribute('opacity', 1);
      DA.tooltip.show(
        `<div class="tt-title">${DA.escape(opts.yLabel)}</div>` +
        `<div class="tt-line">${DA.escape(opts.xLabel)} <b>${isTime ? DA.fmtDate(new Date(p[0])) : DA.fmt(p[0])}</b></div>` +
        `<div class="tt-line">value <b>${DA.fmt(p[1])}</b></div>`,
        e.clientX, e.clientY);
    });
    probe.addEventListener('mouseleave', () => {
      cursor.setAttribute('opacity', 0);
      dot.setAttribute('opacity', 0);
      DA.tooltip.hide();
    });
    return svg;
  };

  DA.fmtDate = function (d) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
})(window);
