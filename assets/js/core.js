/* core.js — DA namespace: SVG helpers, scales, formatting, statistics.
 * Vanilla JS, no dependencies. Loaded before all chart modules. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const DA = (global.DA = global.DA || {});

  DA.NS = NS;

  DA.el = function (tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  };

  DA.escape = function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  DA.fmt = function (v, digits) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString();
    return n.toLocaleString(undefined, { maximumSignificantDigits: digits || 4 });
  };

  DA.fmtPct = function (v, digits) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    return (Number(v) * 100).toFixed(digits || 1) + '%';
  };

  DA.fmtBytes = function (b) {
    if (b === null || b === undefined) return '—';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0, v = Number(b);
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toFixed(v >= 100 || i === 0 ? 0 : 1) + ' ' + u[i];
  };

  /* ————— scales ————— */
  DA.linear = function (domain, range) {
    const [d0, d1] = domain, [r0, r1] = range;
    const f = (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0 || 1);
    f.invert = (v) => d0 + ((v - r0) * (d1 - d0)) / (r1 - r0 || 1);
    return f;
  };

  DA.niceTicks = function (min, max, count) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
    if (min === max) return [min];
    const span = max - min;
    const step0 = span / Math.max(1, count || 6);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const start = Math.ceil(min / step) * step;
    const out = [];
    for (let v = start; v <= max + step * 1e-9; v += step) out.push(Math.round(v * 1e9) / 1e9);
    return out;
  };

  /* ————— statistics ————— */
  DA.histogram = function (values, binCount) {
    const n = values.length;
    if (!n) return { bins: [], min: 0, max: 0 };
    let min = Infinity, max = -Infinity;
    for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
    const k = binCount || Math.max(5, Math.min(40, Math.round(Math.sqrt(n))));
    if (min === max) { min -= 0.5; max += 0.5; }
    const width = (max - min) / k;
    const counts = new Array(k).fill(0);
    for (const v of values) {
      let i = Math.floor((v - min) / width);
      if (i === k) i = k - 1;
      if (i >= 0 && i < k) counts[i]++;
    }
    const bins = counts.map((c, i) => ({ x0: min + i * width, x1: min + (i + 1) * width, count: c }));
    return { bins, min, max };
  };

  DA.quantiles = function (values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const q = (p) => {
      const idx = (sorted.length - 1) * p;
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };
    const q1 = q(0.25), median = q(0.5), q3 = q(0.75);
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    return { min: sorted[0], q1, median, q3, max: sorted[sorted.length - 1], iqr, lo, hi, outliers: sorted.filter((v) => v < lo || v > hi) };
  };

  DA.pearson = function (x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 3) return NaN;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx, dy = y[i] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx === 0 || syy === 0) return NaN;
    return sxy / Math.sqrt(sxx * syy);
  };

  DA.rank = function (arr) {
    const n = arr.length;
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };

  DA.spearman = function (x, y) {
    if (Math.min(x.length, y.length) < 3) return NaN;
    return DA.pearson(DA.rank(x), DA.rank(y));
  };

  DA.pairStats = function (x, y) {
    const pts = [];
    const m = Math.min(x.length, y.length);
    for (let i = 0; i < m; i++) {
      const a = x[i], b = y[i];
      if (a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b)) pts.push([a, b]);
    }
    if (pts.length < 3) return null;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { n: pts.length, pearson: DA.pearson(xs, ys), spearman: DA.spearman(xs, ys) };
  };

  /* ————— colors ————— */
  DA.palette = ['#2ee6a8', '#ffc233', '#58a6ff', '#ff7ab2', '#b388ff', '#ff9d5c', '#7dd3fc', '#fda4af', '#a3e635', '#f472b6'];
  DA.colorFor = function (i) { return DA.palette[i % DA.palette.length]; };
  DA.interp = function (t, c1, c2) {
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const [r1, g1, b1] = hex(c1), [r2, g2, b2] = hex(c2);
    const f = (t + 1) / 2;
    return `rgb(${Math.round(r1 + (r2 - r1) * f)},${Math.round(g1 + (g2 - g1) * f)},${Math.round(b1 + (b2 - b1) * f)})`;
  };
  DA.corrColor = function (r) { return DA.interp(Math.max(-1, Math.min(1, r)), '#ff5d5d', '#2ee6a8'); };

  /* ————— SVG mounting & tooltips ————— */
  DA.mount = function (container, vbW, vbH) {
    container.innerHTML = '';
    const svg = DA.el('svg', { viewBox: `0 0 ${vbW} ${vbH}`, preserveAspectRatio: 'xMidYMid meet', class: 'da-chart' });
    container.appendChild(svg);
    return svg;
  };

  const tt = (() => {
    let el = null;
    return {
      show(html, x, y) {
        if (!el) {
          el = document.createElement('div');
          el.className = 'da-tooltip';
          document.body.appendChild(el);
        }
        el.innerHTML = html;
        el.classList.add('show');
        const pad = 12;
        let left = x + pad, top = y + pad;
        const r = el.getBoundingClientRect();
        if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
        if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
        el.style.left = left + 'px';
        el.style.top = top + 'px';
      },
      hide() { if (el) el.classList.remove('show'); },
    };
  })();
  DA.tooltip = tt;

  DA.linePath = function (pts) {
    if (!pts.length) return '';
    return 'M' + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L');
  };

  DA.timeToDays = function (iso) {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
  };

  /* Gaussian KDE (Silverman's rule-of-thumb bandwidth) → [[x, y], ...] */
  DA.kde = function (values, points, bandwidth) {
    const n = values.length;
    if (!n) return [];
    let min = Infinity, max = -Infinity, mean = 0;
    for (const v of values) { if (v < min) min = v; if (v > max) max = v; mean += v; }
    mean /= n;
    let sd = 0;
    for (const v of values) sd += (v - mean) * (v - mean);
    sd = Math.sqrt(sd / (n - 1));
    const sorted = values.slice().sort((a, b) => a - b);
    const q = (p) => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); };
    const iqr = q(0.75) - q(0.25);
    const h = bandwidth || 1.06 * Math.min(sd, iqr / 1.34 || sd) * Math.pow(n, -0.2) || (max - min) / 20;
    if (!(h > 0)) return [];
    const k = points || 120;
    const step = (max - min) / k;
    const out = [];
    const norm = 1 / (n * h * Math.sqrt(2 * Math.PI));
    for (let i = 0; i <= k; i++) {
      const x = min + i * step;
      let sum = 0;
      for (const v of values) { const z = (x - v) / h; sum += Math.exp(-0.5 * z * z); }
      out.push([x, sum * norm]);
    }
    return out;
  };
  /* ————— feature type overrides —————
   * Users can correct mis-inferred feature types (e.g. a numeric status code
   * that is really categorical). Overrides persist in localStorage and apply
   * to Distributions, Relationships, and Correlations. */
  DA.overrides = {
    _store: {},
    init() {
      try { this._store = JSON.parse(localStorage.getItem('da-overrides') || '{}') || {}; } catch (e) { this._store = {}; }
    },
    get(col) { return this._store[col] || null; },
    set(col, type) {
      if (!type || type === 'auto') delete this._store[col];
      else this._store[col] = type;
      try { localStorage.setItem('da-overrides', JSON.stringify(this._store)); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('da-overrides-change', { detail: { col, type: this._store[col] || null } }));
    },
    clear() {
      this._store = {};
      try { localStorage.removeItem('da-overrides'); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('da-overrides-change'));
    },
    effective(col, baseType) { return this.get(col) || baseType; },
  };

  /* Coerce a base series into the requested override type (client-side). */
  DA.coerceSeries = function (base, override) {
    if (!override || override === base.type) return base;
    const vals = base.values || [];
    if (override === 'numeric') {
      const nums = vals.map((v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        const n = Number(String(v).replace(',', ''));
        return Number.isFinite(n) ? n : null;
      });
      return { type: 'numeric', values: nums };
    }
    if (override === 'categorical') {
      const strs = vals.map((v) => (v === null || v === undefined ? null : String(v)));
      const cnt = {};
      strs.forEach((v) => { if (v !== null) cnt[v] = (cnt[v] || 0) + 1; });
      const counts = Object.entries(cnt)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([label, count]) => ({ label, count }));
      return { type: 'categorical', values: strs, counts };
    }
    if (override === 'datetime') {
      const times = vals.map((v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'number') return new Date(v).toISOString();
        const d = new Date(v);
        return Number.isFinite(d.getTime()) ? d.toISOString() : null;
      });
      return { type: 'datetime', values: times };
    }
    if (override === 'text') {
      return { type: 'text', values: vals.map((v) => (v === null || v === undefined ? null : String(v))), counts: base.counts || [] };
    }
    return base;
  };

  /* Build a full correlation matrix for the given features, using Python
   * precomputed values where available and computing missing pairs (e.g.
   * features re-typed to numeric by the user) from the exported sample. */
  DA.buildMatrix = function (features, method, pyMatrix) {
    const M = {};
    features.forEach((f) => { M[f] = { [f]: 1 }; });
    const cache = {};
    const series = DA.DATA && DA.DATA.analysis && DA.DATA.analysis.data.series;
    features.forEach((a, i) => {
      features.slice(i + 1).forEach((b) => {
        let r = null;
        if (pyMatrix && pyMatrix[a] && pyMatrix[a][b] !== undefined && pyMatrix[a][b] !== null) r = pyMatrix[a][b];
        else if (pyMatrix && pyMatrix[b] && pyMatrix[b][a] !== undefined && pyMatrix[b][a] !== null) r = pyMatrix[b][a];
        else if (series && series[a] && series[b]) {
          const key = [a, b].sort().join('\u0001');
          if (!(key in cache)) {
            // use override-coerced values so re-typed features compute correctly
            const sa = DA.coerceSeries(series[a], DA.overrides.get(a));
            const sb = DA.coerceSeries(series[b], DA.overrides.get(b));
            const stats = DA.pairStats(sa.values, sb.values);
            cache[key] = stats ? (method === 'spearman' ? stats.spearman : stats.pearson) : null;
          }
          r = cache[key];
        }
        M[a][b] = r;
        M[b][a] = r;
      });
    });
    return M;
  };
})(window);
