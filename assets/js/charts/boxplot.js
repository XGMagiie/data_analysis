/* charts/boxplot.js — DA.BoxPlot (single horizontal) and DA.GroupBox (vertical groups) */
(function (global) {
  'use strict';
  const DA = global.DA;

  /* Horizontal single box */
  DA.BoxPlot = function (container, opts) {
    const W = 640, H = 180;
    const pad = { l: 52, r: 14, t: 12, b: 38 };
    const svg = DA.mount(container, W, H);

    const stats = DA.quantiles(opts.values);
    const color = opts.color || DA.colorFor(1);
    const lo = Math.min(stats.min, stats.lo);
    const hi = Math.max(stats.max, stats.hi);
    const x = DA.linear([lo, hi], [pad.l, W - pad.r]);
    const yMid = (pad.t + H - pad.b) / 2;

    // whiskers
    DA.el('line', { x1: x(stats.lo), y1: yMid, x2: x(stats.q1), y2: yMid, class: 'box-whisker' }, svg);
    DA.el('line', { x1: x(stats.q3), y1: yMid, x2: x(stats.hi), y2: yMid, class: 'box-whisker' }, svg);
    DA.el('line', { x1: x(stats.lo), y1: yMid - 10, x2: x(stats.lo), y2: yMid + 10, class: 'box-whisker' }, svg);
    DA.el('line', { x1: x(stats.hi), y1: yMid - 10, x2: x(stats.hi), y2: yMid + 10, class: 'box-whisker' }, svg);

    // box
    DA.el('rect', {
      x: x(stats.q1), y: yMid - 26, width: Math.max(1, x(stats.q3) - x(stats.q1)), height: 52, rx: 3, class: 'box',
    }, svg);
    DA.el('line', { x1: x(stats.median), y1: yMid - 26, x2: x(stats.median), y2: yMid + 26, class: 'box-median' }, svg);

    // outliers
    stats.outliers.forEach((v) => {
      DA.el('circle', { cx: x(v), cy: yMid, r: 3.4, class: 'box-outlier' }, svg);
    });

    // labels
    DA.niceTicks(lo, hi, 6).forEach((v) => {
      const px = x(v);
      DA.el('line', { x1: px, y1: H - pad.b, x2: px, y2: H - pad.b + 4, class: 'axis-tick' }, svg);
      DA.el('text', { x: px, y: H - pad.b + 17, 'text-anchor': 'middle', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    DA.el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = opts.label;

    const g = DA.el('g', { class: 'box-hover' }, svg);
    DA.el('rect', { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b, fill: 'transparent' }, g);
    g.addEventListener('mouseenter', (e) => {
      DA.tooltip.show(
        `<div class="tt-title">${DA.escape(opts.label)}</div>` +
        `<div class="tt-line">min <b>${DA.fmt(stats.min)}</b> · q1 <b>${DA.fmt(stats.q1)}</b> · median <b>${DA.fmt(stats.median)}</b></div>` +
        `<div class="tt-line">q3 <b>${DA.fmt(stats.q3)}</b> · max <b>${DA.fmt(stats.max)}</b> · IQR <b>${DA.fmt(stats.iqr)}</b></div>` +
        `<div class="tt-line">outliers <b>${stats.outliers.length}</b></div>`,
        e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', () => DA.tooltip.hide());
    return svg;
  };

  /* Vertical single box: DA.VBox(container, {values, label, color}) — same
   * viewBox proportions as the Q-Q plot so the two charts match in size. */
  DA.VBox = function (container, opts) {
    const W = 640, H = 460;
    const pad = { l: 56, r: 26, t: 14, b: 48 };
    const svg = DA.mount(container, W, H);

    const stats = DA.quantiles(opts.values);
    const color = opts.color || DA.colorFor(1);
    const lo = Math.min(stats.min, stats.lo);
    const hi = Math.max(stats.max, stats.hi);
    const y = DA.linear([lo, hi], [H - pad.b, pad.t]);
    const cx = (pad.l + W - pad.r) / 2;

    // whiskers
    DA.el('line', { x1: cx, y1: y(stats.lo), x2: cx, y2: y(stats.q1), class: 'box-whisker' }, svg);
    DA.el('line', { x1: cx, y1: y(stats.q3), x2: cx, y2: y(stats.hi), class: 'box-whisker' }, svg);
    DA.el('line', { x1: cx - 9, y1: y(stats.lo), x2: cx + 9, y2: y(stats.lo), class: 'box-whisker' }, svg);
    DA.el('line', { x1: cx - 9, y1: y(stats.hi), x2: cx + 9, y2: y(stats.hi), class: 'box-whisker' }, svg);

    // box
    DA.el('rect', {
      x: cx - 30, y: y(stats.q3), width: 60, height: Math.max(1, y(stats.q1) - y(stats.q3)), rx: 2,
      class: 'box', style: `stroke:${color}`,
    }, svg);
    DA.el('line', { x1: cx - 30, y1: y(stats.median), x2: cx + 30, y2: y(stats.median), class: 'box-median' }, svg);
    stats.outliers.forEach((v) => {
      DA.el('circle', { cx, cy: y(v), r: 3.2, class: 'box-outlier' }, svg);
    });

    // axis
    DA.niceTicks(lo, hi, 6).forEach((v) => {
      DA.el('line', { x1: pad.l - 4, y1: y(v), x2: pad.l, y2: y(v), class: 'axis-tick' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    const t = DA.el('text', { x: cx, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg);
    t.textContent = opts.label;

    const g = DA.el('g', { class: 'box-hover' }, svg);
    DA.el('rect', { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b, fill: 'transparent' }, g);
    g.addEventListener('mouseenter', (e) => {
      DA.tooltip.show(
        `<div class="tt-title">${DA.escape(opts.label)}</div>` +
        `<div class="tt-line">min <b>${DA.fmt(stats.min)}</b> · q1 <b>${DA.fmt(stats.q1)}</b> · median <b>${DA.fmt(stats.median)}</b></div>` +
        `<div class="tt-line">q3 <b>${DA.fmt(stats.q3)}</b> · max <b>${DA.fmt(stats.max)}</b> · IQR <b>${DA.fmt(stats.iqr)}</b></div>` +
        `<div class="tt-line">outliers <b>${stats.outliers.length}</b></div>`,
        e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', () => DA.tooltip.hide());
    return svg;
  };

  /* Vertical grouped boxes: opts = {groups: [{name, values, color}], label} */
  DA.GroupBox = function (container, opts) {
    const W = 640, H = 340;
    const pad = { l: 56, r: 14, t: 14, b: 64 };
    const svg = DA.mount(container, W, H);
    const groups = opts.groups.filter((g) => g.values.length >= 3);
    if (!groups.length) return svg;

    const all = groups.flatMap((g) => g.values);
    let lo = Math.min(...all), hi = Math.max(...all);
    const statsAll = DA.quantiles(all);
    lo = Math.min(lo, statsAll.lo);
    hi = Math.max(hi, statsAll.hi);

    const y = DA.linear([lo, hi], [H - pad.b, pad.t]);
    const bw = (W - pad.l - pad.r) / groups.length;

    groups.forEach((g, i) => {
      const cx = pad.l + bw * i + bw / 2;
      const s = DA.quantiles(g.values);
      const color = g.color || DA.colorFor(i);
      const yLo = Math.max(y(s.lo), pad.t - 100), yHi = Math.min(y(s.hi), H - pad.b + 100);

      DA.el('line', { x1: cx, y1: y(s.lo), x2: cx, y2: y(s.q1), class: 'box-whisker', style: `stroke:${color}` }, svg);
      DA.el('line', { x1: cx, y1: y(s.q3), x2: cx, y2: y(s.hi), class: 'box-whisker', style: `stroke:${color}` }, svg);
      DA.el('line', { x1: cx - 9, y1: y(s.lo), x2: cx + 9, y2: y(s.lo), class: 'box-whisker', style: `stroke:${color}` }, svg);
      DA.el('line', { x1: cx - 9, y1: y(s.hi), x2: cx + 9, y2: y(s.hi), class: 'box-whisker', style: `stroke:${color}` }, svg);
      DA.el('rect', {
        x: cx - 24, y: y(s.q3), width: 48, height: Math.max(1, y(s.q1) - y(s.q3)), rx: 2,
        class: 'box', style: `stroke:${color}`,
      }, svg);
      DA.el('line', { x1: cx - 24, y1: y(s.median), x2: cx + 24, y2: y(s.median), class: 'box-median' }, svg);
      s.outliers.forEach((v) => {
        DA.el('circle', { cx, cy: y(v), r: 3.2, class: 'box-outlier' }, svg);
      });

      // x label
      const t = DA.el('text', { x: cx, y: H - pad.b + 16, 'text-anchor': 'middle', class: 'axis-label' }, svg);
      t.textContent = DA.escape(g.name.length > 16 ? g.name.slice(0, 15) + '…' : g.name);
      if (g.name.length > 16) t.setAttribute('data-full', g.name);

      // hover
      const hb = DA.el('rect', { x: cx - bw / 2 + 4, y: pad.t, width: bw - 8, height: H - pad.t - pad.b, fill: 'transparent' }, svg);
      hb.addEventListener('mouseenter', (e) => {
        DA.tooltip.show(
          `<div class="tt-title">${DA.escape(g.name)}</div>` +
          `<div class="tt-line">n <b>${g.values.length}</b> · median <b>${DA.fmt(s.median)}</b></div>` +
          `<div class="tt-line">q1 <b>${DA.fmt(s.q1)}</b> · q3 <b>${DA.fmt(s.q3)}</b></div>` +
          `<div class="tt-line">min <b>${DA.fmt(s.min)}</b> · max <b>${DA.fmt(s.max)}</b> · outliers <b>${s.outliers.length}</b></div>`,
          e.clientX, e.clientY);
      });
      hb.addEventListener('mouseleave', () => DA.tooltip.hide());
    });

    // y axis
    DA.niceTicks(lo, hi, 6).forEach((v) => {
      DA.el('line', { x1: pad.l - 4, y1: y(v), x2: pad.l, y2: y(v), class: 'axis-tick' }, svg);
      DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v);
    });
    DA.el('text', { x: 14, y: pad.t + 8, 'text-anchor': 'start', class: 'axis-title' }, svg).textContent = opts.label;
    return svg;
  };
})(window);
