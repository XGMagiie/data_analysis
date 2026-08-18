/* pages/relationships.js — interactive pairwise analysis.
 * Without color-by:  num×num → scatter + 2×2 correlation heatmap;
 *                    num×cat → grouped box + grouped mean bars;
 *                    cat×cat → cross-frequency heatmap.
 * With color-by (a third categorical feature checked):
 *                    num×num → colored scatter;
 *                    num×cat → faceted box plots (panels by category, groups by color);
 *                    cat×cat → faceted cross-frequency heatmaps. */
(function (global) {
  'use strict';
  const DA = global.DA;

  function types() {
    const base = {};
    DA.DATA.analysis.profile.columns.forEach((c) => { base[c.name] = c.semantic_type; });
    const out = {};
    for (const k in base) out[k] = DA.overrides.effective(k, base[k]);
    return out;
  }

  function catColumns() {
    return DA.DATA.analysis.data.columns.filter((c) => ['categorical', 'boolean'].includes(types()[c]));
  }

  function figure(title) {
    const fig = document.createElement('figure');
    fig.className = 'chart-figure reveal';
    if (title) {
      const h = document.createElement('div');
      h.className = 'chart-title';
      h.textContent = title;
      fig.appendChild(h);
    }
    const body = document.createElement('div');
    body.className = 'chart-body';
    fig.appendChild(body);
    return { fig, body };
  }

  function showStats(stats) {
    const statsBox = document.getElementById('pair-stats');
    if (!statsBox || !stats) return;
    statsBox.innerHTML =
      `<div class="metric"><span class="m-label">${DA.t('metric.pairs')}</span><strong>${DA.fmt(stats.n)}</strong></div>` +
      `<div class="metric tone-teal"><span class="m-label">${DA.t('metric.pearson')}</span><strong>${stats.pearson.toFixed(4)}</strong></div>` +
      `<div class="metric tone-blue"><span class="m-label">${DA.t('metric.spearman')}</span><strong>${stats.spearman.toFixed(4)}</strong></div>`;
  }

  function renderPair(a, b, colorEnabled, colorCol) {
    const t = types();
    const series = DA.DATA.analysis.data.series;
    const body = document.getElementById('pair-chart');
    const statsBox = document.getElementById('pair-stats');
    body.innerHTML = '';
    if (statsBox) statsBox.innerHTML = '';
    if (!a || !b || a === b) {
      body.innerHTML = `<div class="empty">${DA.t('rel.selectHint')}</div>`;
      return;
    }
    const sa = series[a], sb = series[b];
    const saEff = DA.coerceSeries(sa, DA.overrides.get(a));
    const sbEff = DA.coerceSeries(sb, DA.overrides.get(b));
    const ta = t[a], tb = t[b];
    const useColor = colorEnabled && colorCol && series[colorCol] && ['categorical', 'boolean'].includes(DA.overrides.effective(colorCol, types()[colorCol]));

    const bothNum = ta === 'numeric' && tb === 'numeric';
    const catNum = (ta === 'numeric' && ['categorical', 'boolean'].includes(tb)) || (tb === 'numeric' && ['categorical', 'boolean'].includes(ta));
    const bothCat = ['categorical', 'boolean'].includes(ta) && ['categorical', 'boolean'].includes(tb);

    /* ——— both numeric ——— */
    if (bothNum) {
      const stats = DA.pairStats(saEff.values, sbEff.values);
      showStats(stats);
      if (useColor) {
        // colored scatter
        const sc = DA.coerceSeries(series[colorCol], DA.overrides.get(colorCol));
        const cats = sc.values;
        const names = [...new Set(cats)].sort();
        const index = cats.map((v) => names.indexOf(v));
        const f = figure(`${a} × ${b} — ${colorCol}`);
        DA.Scatter(f.body, {
          x: { values: saEff.values, label: a },
          y: { values: sbEff.values, label: b },
          groups: { index, names, colors: names.map((_, i) => DA.colorFor(i)) },
        });
        body.appendChild(f.fig);
      } else {
        // scatter only
        const f = figure(`${a} × ${b}`);
        DA.Scatter(f.body, {
          x: { values: saEff.values, label: a },
          y: { values: sbEff.values, label: b },
          groups: null,
        });
        body.appendChild(f.fig);
      }
      return;
    }

    /* ——— one numeric, one categorical ——— */
    if (catNum) {
      const cat = ta === 'numeric' ? b : a;
      const num = ta === 'numeric' ? a : b;
      const cats = (cat === a ? saEff : sbEff).values;
      const nums = (num === a ? saEff : sbEff).values;
      if (useColor) {
        // single grouped box plot: x = category, groups by color category
        const sc = DA.coerceSeries(series[colorCol], DA.overrides.get(colorCol));
        const f = figure(`${num} by ${cat} — grouped by ${colorCol}`);
        DA.GroupedBox(f.body, {
          xCat: cats, cCat: sc.values, y: nums,
          xName: cat, cName: colorCol, yName: num,
        });
        body.appendChild(f.fig);
        return;
      }
      const m = Math.min(cats.length, nums.length);
      const byCat = {};
      for (let i = 0; i < m; i++) {
        if (cats[i] === null || nums[i] === null || !Number.isFinite(nums[i])) continue;
        (byCat[cats[i]] = byCat[cats[i]] || []).push(nums[i]);
      }
      const catNames = Object.keys(byCat).sort((x, y) => byCat[y].length - byCat[x].length).slice(0, 12);
      const groups = catNames.map((name, i) => ({ name, values: byCat[name], color: DA.colorFor(i) }));
      if (!groups.length) {
        body.innerHTML = `<div class="empty">${DA.t('rel.selectHint')}</div>`;
        return;
      }
      // grouped box only (no mean bars)
      const f = figure(`${num} by ${cat}`);
      DA.GroupBox(f.body, { groups, label: num });
      body.appendChild(f.fig);
      return;
    }

    /* ——— both categorical ——— */
    if (bothCat) {
      if (useColor) {
        // single stacked bar: x = a, dodge = color category, stack = b
        const sc = DA.coerceSeries(series[colorCol], DA.overrides.get(colorCol));
        const f = figure(`${a} × ${b} — stacked by ${colorCol}`);
        DA.StackedBar(f.body, {
          a: saEff.values, b: sbEff.values, c: sc.values,
          aName: a, bName: b, cName: colorCol,
        });
        body.appendChild(f.fig);
      } else {
        const f = figure(`${a} × ${b} — cross frequency`);
        DA.Contingency(f.body, { a: { values: saEff.values, label: a }, b: { values: sbEff.values, label: b } });
        body.appendChild(f.fig);
      }
      return;
    }

    /* ——— datetime fallback ——— */
    const dt = ta === 'datetime' ? a : tb === 'datetime' ? b : null;
    const num = dt === a ? b : a;
    if (dt && types()[num] === 'numeric') {
      const times = (dt === a ? saEff : sbEff).values.map((v) => DA.timeToDays(v));
      const vals = (num === a ? saEff : sbEff).values;
      const m = Math.min(times.length, vals.length);
      const pts = [];
      for (let i = 0; i < m; i++) {
        if (times[i] !== null && vals[i] !== null && Number.isFinite(vals[i])) pts.push([times[i], vals[i]]);
      }
      pts.sort((p, q) => p[0] - q[0]);
      body.innerHTML = '';
      const svg = DA.mount(body, 680, 360);
      const pad = { l: 56, r: 16, t: 16, b: 48 };
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
      const x = DA.linear([xMin, xMax], [pad.l, 680 - pad.r]);
      const y = DA.linear([yMin, yMax], [360 - pad.b, pad.t]);
      DA.el('polyline', {
        points: pts.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' '),
        fill: 'none', stroke: DA.colorFor(5), 'stroke-width': 1.6, opacity: 0.9,
      }, svg);
      DA.niceTicks(yMin, yMax, 5).forEach((v) => DA.el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis-label' }, svg).textContent = DA.fmt(v));
      DA.el('text', { x: (pad.l + 680 - pad.r) / 2, y: 360 - 6, 'text-anchor': 'middle', class: 'axis-title' }, svg).textContent = dt;
      return;
    }
    body.innerHTML = '<div class="empty">This feature combination is not supported in V2 interactive charts.</div>';
  }

  function init() {
    const selA = document.getElementById('pair-a');
    const selB = document.getElementById('pair-b');
    const colorSel = document.getElementById('pair-color');
    const colorEnable = document.getElementById('pair-color-enable');
    const colorLabel = document.getElementById('color-label');
    const colorWrap = document.getElementById('color-wrap');
    if (!selA || !selB) return;

    const analysis = DA.DATA.analysis;
    const order = analysis.data.columns;
    const t = types();
    const groups = { numeric: [], categorical: [], datetime: [], other: [] };
    order.forEach((c) => {
      const ty = t[c];
      if (ty === 'ignore') return;
      if (ty === 'numeric') groups.numeric.push(c);
      else if (['categorical', 'boolean'].includes(ty)) groups.categorical.push(c);
      else if (ty === 'datetime') groups.datetime.push(c);
      else groups.other.push(c);
    });

    const keys = [['numeric', 'numeric'], ['categorical', 'categorical'], ['datetime', 'datetime'], ['other', 'other']];
    keys.forEach(([k]) => {
      const opt = document.createElement('optgroup');
      opt.label = k;
      groups[k].forEach((c) => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        opt.appendChild(o);
      });
      selA.appendChild(opt.cloneNode(true));
      selB.appendChild(opt);
    });

    let a = analysis.pairs.default ? analysis.pairs.default[0] : order[0];
    let b = analysis.pairs.default ? analysis.pairs.default[1] : order[1];
    selA.value = a;
    selB.value = b;

    function fillColorSelect() {
      colorSel.innerHTML = '';
      const cats = catColumns().filter((c) => c !== a && c !== b);
      cats.forEach((c) => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        colorSel.appendChild(o);
      });
      if (colorSel.value && !cats.includes(colorSel.value)) colorSel.value = '';
      if (!colorSel.value && cats.length) colorSel.value = cats[0];
      return cats.length > 0;
    }

    function refresh() {
      a = selA.value;
      b = selB.value;
      const tt = types();
      const bothNum = tt[a] === 'numeric' && tt[b] === 'numeric';
      const hasCats = fillColorSelect();
      const catAvail = hasCats && (bothNum || tt[a] !== tt[b] || (['categorical', 'boolean'].includes(tt[a]) && ['categorical', 'boolean'].includes(tt[b])));
      // show color-by when there is at least one other categorical feature and the pair benefits from it
      const showColor = hasCats && (bothNum || (['categorical', 'boolean'].includes(tt[a]) && ['categorical', 'boolean'].includes(tt[b])) || (bothNum === false && ['categorical', 'boolean'].includes(tt[a]) !== ['categorical', 'boolean'].includes(tt[b])));
      colorLabel.style.display = showColor ? 'inline-flex' : 'none';
      colorWrap.style.display = showColor && colorEnable.checked ? 'inline-block' : 'none';
      renderPair(a, b, colorEnable.checked, colorSel.value);
    }

    selA.addEventListener('change', refresh);
    selB.addEventListener('change', refresh);
    colorEnable.addEventListener('change', refresh);
    colorSel.addEventListener('change', refresh);
    refresh();

    document.addEventListener('da-lang-change', () => {
      DA.i18n.applyDom(document);
      refresh();
    });
    document.addEventListener('da-overrides-change', () => {
      selA.innerHTML = '';
      selB.innerHTML = '';
      const tt = types();
      const g2 = { numeric: [], categorical: [], datetime: [], other: [] };
      order.forEach((c) => {
        const ty = tt[c];
        if (ty === 'ignore') return;
        if (ty === 'numeric') g2.numeric.push(c);
        else if (['categorical', 'boolean'].includes(ty)) g2.categorical.push(c);
        else if (ty === 'datetime') g2.datetime.push(c);
        else g2.other.push(c);
      });
      keys.forEach(([k]) => {
        const opt = document.createElement('optgroup');
        opt.label = k;
        g2[k].forEach((c) => {
          const o = document.createElement('option');
          o.value = c;
          o.textContent = c;
          opt.appendChild(o);
        });
        selA.appendChild(opt.cloneNode(true));
        selB.appendChild(opt);
      });
      selA.value = a;
      selB.value = b;
      refresh();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
