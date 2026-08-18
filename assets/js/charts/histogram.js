/* charts/histogram.js — DA.Histogram(container, {values, label, color, bins}) */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.Histogram = function (container, opts) {
    const W = 640, H = 320;
    const pad = { l: 52, r: 14, t: 14, b: 40 };
    const svg = DA.mount(container, W, H);

    const hist = DA.histogram(opts.values, opts.bins);
    if (!hist.bins.length) return svg;

    const maxCount = Math.max(...hist.bins.map((b) => b.count));
    const x = DA.linear([hist.min, hist.max], [pad.l, W - pad.r]);
    const y = DA.linear([0, maxCount * 1.08], [H - pad.b, pad.t]);
    const color = opts.color || DA.colorFor(0);

    // grid lines
    DA.niceTicks(0, maxCount, 4).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
    });

    hist.bins.forEach((b) => {
      const bw = Math.max(1, x(b.x1) - x(b.x0) - 1.5);
      const bar = DA.el('rect', {
        x: x(b.x0), y: y(b.count), width: bw, height: Math.max(0, y(0) - y(b.count)),
        fill: color, opacity: 0.85, class: 'bar', rx: 1,
      }, svg);
      bar.addEventListener('mouseenter', (e) => {
        DA.tooltip.show(
          `<div class="tt-title">${DA.escape(opts.label)}</div><div class="tt-line">${DA.fmt(b.x0)} – ${DA.fmt(b.x1)}</div><div class="tt-line"><b>${DA.fmt(b.count)}</b> rows</div>`,
          e.clientX, e.clientY);
      });
      bar.addEventListener('mouseleave', () => DA.tooltip.hide());
    });

    // x axis
    DA.niceTicks(hist.min, hist.max, 6).forEach((v) => {
      const px = x(v);
      DA.el('line', { x1: px, y1: H - pad.b, x2: px, y2: H - pad.b + 4, class: 'axis-tick' }, svg);
      DA.el('text', { x: px, y: H - pad.b + 17, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    // y axis
    DA.niceTicks(0, maxCount, 4).forEach((v) => {
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.label;
    DA.el('text', { x: 14, y: pad.t, 'text-anchor': 'start', class: 'axis-title' }, svg).textContent = 'count';
    return svg;
  };
})(window);
