/* charts/network.js — DA.Network: correlation network rendered from the full
 * matrix, with a live threshold slider. Edges are filtered client-side so the
 * user can re-tune |r| and watch the graph update instantly. */
(function (global) {
  'use strict';
  const DA = global.DA;

  DA.Network = function (container, opts) {
    const W = 700, H = 520;
    const svg = DA.mount(container, W, H);
    svg.classList.add('da-network');

    const features = opts.features;
    const matrix = opts.matrix;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(cx, cy) - 74;

    // circular layout (stable, deterministic)
    const pos = {};
    features.forEach((f, i) => {
      const ang = (i / features.length) * 2 * Math.PI - Math.PI / 2;
      pos[f] = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
    });

    const edges = [];
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const a = features[i], b = features[j];
        const r = matrix && matrix[a] ? matrix[a][b] : undefined;
        if (r === undefined || r === null || Number.isNaN(r)) continue;
        edges.push({ a, b, r: Number(r) });
      }
    }

    let threshold = opts.initialThreshold !== undefined ? opts.initialThreshold : 0.7;

    const edgeLayer = DA.el('g', { class: 'net-edge-layer' }, svg);
    const nodeLayer = DA.el('g', { class: 'net-node-layer' }, svg);

    function render() {
      edgeLayer.innerHTML = '';
      nodeLayer.innerHTML = '';

      const visible = edges.filter((e) => Math.abs(e.r) >= threshold);
      const degree = {};
      visible.forEach((e) => {
        degree[e.a] = (degree[e.a] || 0) + 1;
        degree[e.b] = (degree[e.b] || 0) + 1;
      });

      visible.forEach((e) => {
        const p1 = pos[e.a], p2 = pos[e.b];
        DA.el('line', {
          x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
          stroke: DA.corrColor(e.r), 'stroke-width': (1 + Math.abs(e.r) * 3.2).toFixed(2),
          opacity: 0.4 + Math.abs(e.r) * 0.5, class: 'net-edge', 'data-a': e.a, 'data-b': e.b,
        }, edgeLayer);
      });

      features.forEach((f) => {
        const d = degree[f] || 0;
        const radius = 9 + Math.min(16, d * 3.2);
        const g = DA.el('g', { class: 'net-node', 'data-f': f, transform: `translate(${pos[f].x},${pos[f].y})` }, nodeLayer);
        DA.el('circle', {
          r: radius, fill: 'var(--surface-2)', stroke: d ? '#2ee6a8' : 'var(--line-bright)', 'stroke-width': 1.8,
        }, g);
        const label = DA.el('text', { y: radius + 13, 'text-anchor': 'middle', class: 'axis-label', 'font-size': '11px' }, g);
        label.textContent = f.length > 16 ? f.slice(0, 15) + '…' : f;
        g.addEventListener('mouseenter', (ev) => {
          svg.classList.add('dim');
          g.classList.add('focus');
          edgeLayer.querySelectorAll('.net-edge').forEach((ln) => {
            if (ln.dataset.a === f || ln.dataset.b === f) ln.classList.add('focus');
          });
          DA.tooltip.show(
            `<div class="tt-title">${DA.escape(f)}</div>` +
            `<div class="tt-line">degree <b>${d}</b> at |r| ≥ ${threshold.toFixed(2)}</div>`,
            ev.clientX, ev.clientY);
        });
        g.addEventListener('mouseleave', () => {
          svg.classList.remove('dim');
          g.classList.remove('focus');
          edgeLayer.querySelectorAll('.net-edge.focus').forEach((ln) => ln.classList.remove('focus'));
          DA.tooltip.hide();
        });
      });

      if (opts.onUpdate) opts.onUpdate({ threshold, edges: visible.length, nodes: features.length });
    }

    render();
    return { update: (t) => { threshold = t; render(); } };
  };
})(window);
