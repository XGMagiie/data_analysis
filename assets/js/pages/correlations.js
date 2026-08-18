/* pages/correlations.js — feature selection (default 10, max 20), method
 * tabs, live threshold slider for the network, heatmaps from full matrix. */
(function (global) {
  'use strict';
  const DA = global.DA;

  const MAX_SELECTED = 20;
  const DEFAULT_SELECTED = 10;

  const state = { features: [], method: 'pearson', threshold: 0.7 };

  function matrixFor(method) {
    const m = DA.DATA.analysis.correlations.methods[method];
    return DA.buildMatrix(state.features, method, (m && m.matrix) || {});
  }

  function allNumericFeatures() {
    // usable numeric features under current overrides (across ALL usable columns,
    // so re-typed features can join the correlation analysis; missing matrix
    // values are computed client-side by buildMatrix)
    const profile = {};
    DA.DATA.analysis.profile.columns.forEach((c) => { profile[c.name] = c.semantic_type; });
    const out = [];
    DA.DATA.analysis.data.columns.forEach((f) => {
      const eff = DA.overrides.effective(f, profile[f]);
      if (eff === 'numeric') out.push(f);
    });
    return out;
  }

  function updateCounter() {
    const el = document.getElementById('corr-count');
    if (el) el.textContent = DA.t('corr.select.note', { d: DEFAULT_SELECTED, m: MAX_SELECTED }) + ' · ' + state.features.length + '/' + MAX_SELECTED;
  }

  function buildPicker() {
    const picker = document.getElementById('corr-picker');
    if (!picker) return;
    picker.innerHTML = '';
    const all = allNumericFeatures();
    all.forEach((f) => {
      const chip = document.createElement('span');
      chip.className = 'pick' + (state.features.includes(f) ? ' on' : '');
      const dot = document.createElement('span');
      dot.className = 'dot';
      const name = document.createElement('span');
      name.textContent = f;
      chip.appendChild(dot);
      chip.appendChild(name);
      chip.addEventListener('click', () => {
        const i = state.features.indexOf(f);
        if (i >= 0) {
          state.features.splice(i, 1);
        } else {
          if (state.features.length >= MAX_SELECTED) {
            // enforce max: flash the counter
            const el = document.getElementById('corr-count');
            if (el) { el.style.color = 'var(--red)'; setTimeout(() => { el.style.color = ''; }, 700); }
            return;
          }
          state.features.push(f);
        }
        chip.classList.toggle('on', state.features.includes(f));
        updateCounter();
        renderAll();
      });
      picker.appendChild(chip);
    });
  }

  let network = null;
  function renderNetwork() {
    const netBody = document.getElementById('corr-network');
    const countEl = document.getElementById('net-count');
    if (!netBody) return;
    const t = state.threshold;
    const valEl = document.getElementById('threshold-value');
    if (valEl) valEl.textContent = t.toFixed(2);
    const features = state.features;
    if (features.length < 2) {
      netBody.innerHTML = '';
      if (countEl) countEl.textContent = '';
      return;
    }
    if (!network) {
      network = DA.Network(netBody, {
        matrix: matrixFor(state.method),
        features,
        initialThreshold: t,
        onUpdate: (info) => {
          if (countEl) countEl.textContent = DA.t('corr.count', { e: info.edges, n: info.nodes, t: info.threshold.toFixed(2) });
        },
      });
    } else {
      network.update(t);
    }
  }

  function renderAll() {
    const features = state.features;
    const heatBody = document.getElementById('corr-heatmap');
    if (heatBody) {
      if (features.length >= 2) DA.Heatmap(heatBody, { matrix: matrixFor(state.method), features, method: state.method });
      else heatBody.innerHTML = '';
    }
    network = null;
    renderNetwork();
  }

  function init() {
    const corr = DA.DATA.analysis.correlations;
    if (!corr || !corr.matrix_features || !corr.matrix_features.length) return;

    state.features = allNumericFeatures().slice(0, DEFAULT_SELECTED);
    state.threshold = DA.DATA.analysis.config_used.correlation_threshold !== undefined
      ? DA.DATA.analysis.config_used.correlation_threshold
      : 0.7;

    buildPicker();
    updateCounter();

    const slider = document.getElementById('threshold-slider');
    slider.value = state.threshold.toFixed(2);
    slider.addEventListener('input', () => {
      state.threshold = parseFloat(slider.value);
      renderNetwork();
    });

    document.querySelectorAll('#corr-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#corr-tabs button').forEach((x) => x.classList.remove('active'));
        btn.classList.add('active');
        state.method = btn.dataset.method;
        network = null;
        renderAll();
      });
    });

    renderAll();

    // random subset heatmap
    const rs = corr.random_subset;
    if (rs && rs.matrix && rs.features && rs.features.length) {
      const rsBody = document.getElementById('corr-random');
      if (rsBody) DA.Heatmap(rsBody, { matrix: rs.matrix, features: rs.features, method: rs.method });
    }

    // redraw on language change
    document.addEventListener('da-lang-change', () => {
      DA.i18n.applyDom(document);
      updateCounter();
      network = null;
      renderAll();
    });
    // rebuild when feature types change
    document.addEventListener('da-overrides-change', () => {
      const all = allNumericFeatures();
      state.features = state.features.filter((f) => all.includes(f));
      if (state.features.length > MAX_SELECTED) state.features = state.features.slice(0, MAX_SELECTED);
      if (!state.features.length) state.features = all.slice(0, DEFAULT_SELECTED);
      buildPicker();
      updateCounter();
      network = null;
      renderAll();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
