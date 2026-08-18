/* charts/pie.js — DA.PieChart: donut pie with legend and hover slices.
 * opts: {items: [{label, count, color}], innerRadius (default 0.45), centerLabel} */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.PieChart = function (container, opts) {
    const items = opts.items.filter((i) => i.count > 0);
    const W = 640, H = 340;
    const noLegend = opts.legend === false;
    const pad = noLegend ? { l: 16, r: 16, t: 16, b: 16 } : { l: 16, r: 200, t: 16, b: 16 };
    const cx = (pad.l + W - pad.r) / 2, cy = H / 2;
    const R = Math.min((W - pad.l - pad.r) / 2, H / 2) - 14;
    const svg = DA.mount(container, W, H);

    const total = items.reduce((s, i) => s + i.count, 0);
    if (!total) return svg;

    const inner = opts.innerRadius !== undefined ? opts.innerRadius : 0.45;

    let angle = -Math.PI / 2;
    const slice = (a0, a1, r) => {
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
    };
    const arc = (a0, a1, r0, r1) => {
      const x0 = cx + r0 * Math.cos(a0), y0 = cy + r0 * Math.sin(a0);
      const x1 = cx + r1 * Math.cos(a1), y1 = cy + r1 * Math.sin(a1);
      const x2 = cx + r0 * Math.cos(a1), y2 = cy + r0 * Math.sin(a1);
      const x3 = cx + r1 * Math.cos(a0), y3 = cy + r1 * Math.sin(a0);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      return `M${x3.toFixed(2)},${y3.toFixed(2)} L${x0.toFixed(2)},${y0.toFixed(2)} A${r0},${r0} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)} A${r1},${r1} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z`;
    };

    const R1 = R, R0 = R * inner;
    items.forEach((item) => {
      const a0 = angle;
      const a1 = angle + (item.count / total) * 2 * Math.PI;
      angle = a1;
      const mid = (a0 + a1) / 2;
      const path = DA.el('path', {
        d: arc(a0, a1, R0, R1), fill: item.color, opacity: 0.92, class: 'pie-slice',
        'data-label': item.label, 'data-count': item.count, 'data-share': (item.count / total),
      }, svg);
      // label for large slices
      if ((a1 - a0) > 0.28) {
        const lr = (R0 + R1) / 2;
        DA.el('text', {
          x: cx + lr * Math.cos(mid), y: cy + lr * Math.sin(mid) + 3.5,
          'text-anchor': 'middle', class: 'hm-label',
          fill: 'var(--bg)',
        }, svg).textContent = DA.fmtPct(item.count / total, 0);
      }
      path.addEventListener('mouseenter', (e) => {
        path.setAttribute('opacity', 1);
        DA.tooltip.show(
          `<div class="tt-title">${DA.escape(item.label)}</div>` +
          `<div class="tt-line"><b>${DA.fmt(item.count)}</b> rows · ${DA.fmtPct(item.count / total)}</div>`,
          e.clientX, e.clientY);
      });
      path.addEventListener('mouseleave', () => { path.setAttribute('opacity', 0.92); DA.tooltip.hide(); });
    });

    if (opts.centerLabel) {
      DA.el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.centerLabel;
    }

    // legend (optional)
    if (opts.legend !== false) {
      let ly = pad.t + 10;
      items.forEach((item, i) => {
        DA.el('rect', { x: W - pad.r + 8, y: ly - 8, width: 11, height: 11, rx: 2, fill: item.color }, svg);
        const txt = DA.el('text', { x: W - pad.r + 26, y: ly, class: 'axis-label' }, svg);
        const label = item.label.length > 24 ? item.label.slice(0, 23) + '…' : item.label;
        txt.textContent = `${label} — ${DA.fmtPct(item.count / total)} (${DA.fmt(item.count)})`;
        ly += 17;
      });
    }
    return svg;
  };
})(window);
