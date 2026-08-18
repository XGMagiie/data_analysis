/* charts/barchart.js — DA.BarChart(container, {items:[{label,count}], label,
 * color, horizontal (default true)}). Vertical mode used by Data Quality. */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.BarChart = function (container, opts) {
    const items = opts.items;
    if (opts.horizontal === false) {
      return renderVertical(container, opts);
    }
    const W = 640, H = Math.max(180, items.length * 34 + 64);
    const pad = { l: 14, r: 64, t: 14, b: 44 };
    const svg = DA.mount(container, W, H);
    if (!items.length) return svg;

    const maxCount = Math.max(...items.map((i) => i.count));
    const color = opts.color || DA.colorFor(2);
    const y = DA.linear([0, items.length - 1], [pad.t, H - pad.b]);
    const x = DA.linear([0, maxCount], [pad.l, W - pad.r]);

    DA.niceTicks(0, maxCount, 4).forEach((v) => {
      DA.el('line', { x1: x(v), y1: pad.t, x2: x(v), y2: H - pad.b, class: 'grid-line' }, svg);
      DA.el('text', { x: x(v), y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });

    items.forEach((item, i) => {
      const rowH = (H - pad.b - pad.t) / items.length;
      const cy = y(i);
      const bar = DA.el('rect', {
        x: x(0), y: cy - rowH * 0.34, width: Math.max(1, x(item.count) - x(0)), height: rowH * 0.68, rx: 2,
        fill: color, opacity: 0.88, class: 'bar',
      }, svg);
      bar.addEventListener('mouseenter', (e) => {
        DA.tooltip.show(
          `<div class="tt-title">${DA.escape(item.label)}</div><div class="tt-line"><b>${DA.fmt(item.count)}</b> rows</div>`,
          e.clientX, e.clientY);
      });
      bar.addEventListener('mouseleave', () => DA.tooltip.hide());
      DA.el('text', { x: x(0) - 8, y: cy + 4, 'text-anchor': 'end', class: 'axis-label' }, svg)
        .textContent = item.label.length > 22 ? item.label.slice(0, 21) + '…' : item.label;
      DA.el('text', { x: x(item.count) + 6, y: cy + 4, 'text-anchor': 'start', class: 'axis-label' }, svg)
        .textContent = DA.fmt(item.count);
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = 'count';
    return svg;
  };

  function renderVertical(container, opts) {
    const items = opts.items;
    const W = 640, H = 340;
    const pad = { l: 46, r: 14, t: 16, b: 74 };
    const svg = DA.mount(container, W, H);
    if (!items.length) return svg;

    const maxCount = Math.max(...items.map((i) => i.count));
    const color = opts.color || DA.colorFor(2);
    const bw = (W - pad.l - pad.r) / items.length;
    const x = (i) => pad.l + bw * i + bw / 2;
    const y = DA.linear([0, maxCount * 1.08], [H - pad.b, pad.t]);

    // grid + y labels
    DA.niceTicks(0, maxCount, 4).forEach((v) => {
      DA.el('line', { x1: pad.l, y1: y(v), x2: W - pad.r, y2: y(v), class: 'grid-line' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });

    items.forEach((item, i) => {
      const cx = x(i);
      const barW = Math.max(2, bw * 0.62);
      const bar = DA.el('rect', {
        x: cx - barW / 2, y: y(item.count), width: barW, height: Math.max(0, y(0) - y(item.count)),
        fill: color, opacity: 0.88, rx: 2, class: 'bar',
      }, svg);
      bar.addEventListener('mouseenter', (e) => {
        DA.tooltip.show(
          `<div class="tt-title">${DA.escape(item.label)}</div><div class="tt-line"><b>${DA.fmt(item.count)}</b> rows</div>`,
          e.clientX, e.clientY);
      });
      bar.addEventListener('mouseleave', () => DA.tooltip.hide());
      // value on top of bar
      DA.el('text', { x: cx, y: y(item.count) - 6, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(item.count);
      // horizontal category label (no rotation), truncated with hover tooltip
      const label = item.label.length > 12 ? item.label.slice(0, 11) + '…' : item.label;
      const t = DA.el('text', { x: cx, y: H - pad.b + 18, 'text-anchor': 'middle', class: 'axis-label' }, svg);
      t.textContent = label;
      if (item.label.length > 12) t.setAttribute('data-full', item.label);
    });
    return svg;
  }
})(window);
