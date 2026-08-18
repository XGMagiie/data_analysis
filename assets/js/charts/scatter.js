/* charts/scatter.js — DA.Scatter(container, {x:{values,label}, y:{values,label}, groups}) */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.Scatter = function (container, opts) {
    const W = 640, H = 480;
    const pad = { l: 56, r: 16, t: 16, b: 48 };
    const svg = DA.mount(container, W, H);

    const pts = [];
    const m = Math.min(opts.x.values.length, opts.y.values.length);
    for (let i = 0; i < m; i++) {
      const xv = opts.x.values[i], yv = opts.y.values[i];
      if (xv !== null && yv !== null && Number.isFinite(xv) && Number.isFinite(yv)) pts.push([xv, yv]);
    }
    if (pts.length < 2) return svg;

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const [xv, yv] of pts) {
      if (xv < xMin) xMin = xv; if (xv > xMax) xMax = xv;
      if (yv < yMin) yMin = yv; if (yv > yMax) yMax = yv;
    }
    if (xMin === xMax) { xMin -= 0.5; xMax += 0.5; }
    if (yMin === yMax) { yMin -= 0.5; yMax += 0.5; }
    const x = DA.linear([xMin, xMax], [pad.l, W - pad.r]);
    const y = DA.linear([yMin, yMax], [H - pad.b, pad.t]);

    // grid
    DA.niceTicks(yMin, yMax, 5).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
    });
    DA.niceTicks(xMin, xMax, 5).forEach((v) => {
      DA.el('line', { x1: x(v), y1: pad.t, x2: x(v), y2: H - pad.b, class: 'grid-line' }, svg);
    });

    const groups = opts.groups || null;
    const radius = pts.length > 2500 ? 2 : 3.4;

    pts.forEach(([xv, yv], i) => {
      const gIdx = groups ? groups.index[i] : -1;
      const color = groups && gIdx >= 0 ? groups.colors[gIdx] : DA.colorFor(3);
      const dot = DA.el('circle', {
        cx: x(xv), cy: y(yv), r: radius, fill: color,
        opacity: pts.length > 2500 ? 0.35 : 0.75, class: 'scatter-pt',
      }, svg);
      dot.addEventListener('mouseenter', (e) => {
        DA.tooltip.show(
          `<div class="tt-line">${DA.escape(opts.x.label)} <b>${DA.fmt(xv)}</b></div>` +
          `<div class="tt-line">${DA.escape(opts.y.label)} <b>${DA.fmt(yv)}</b></div>` +
          (groups && gIdx >= 0 ? `<div class="tt-line">${DA.escape(groups.names[gIdx])}</div>` : ''),
          e.clientX, e.clientY);
      });
      dot.addEventListener('mouseleave', () => DA.tooltip.hide());
    });

    // axes
    DA.niceTicks(xMin, xMax, 6).forEach((v) => {
      DA.el('text', { x: x(v), y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    DA.niceTicks(yMin, yMax, 6).forEach((v) => {
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.x.label;
    const yTitle = DA.el('text', { transform: `rotate(-90)`, x: -(pad.t + (H - pad.b - pad.t) / 2), y: 14, 'text-anchor': 'middle', class: 'axis-title' }, svg);
    yTitle.textContent = opts.y.label;
    return svg;
  };
})(window);
