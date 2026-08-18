/* pages/overview.js — Dataset Overview: per-column "treat as" type overrides.
 * Changes persist in localStorage (DA.overrides) and apply globally to
 * Distributions, Relationships, and Correlations. */
(function (global) {
  'use strict';
  const DA = global.DA;

  const TYPE_OPTIONS = ['numeric', 'categorical', 'datetime', 'text', 'ignore'];

  function effectiveLabel(col, base) {
    const eff = DA.overrides.effective(col, base);
    const overridden = !!DA.overrides.get(col);
    return { eff, overridden };
  }

  function updateRow(col) {
    const row = document.querySelector(`tr[data-col="${CSS.escape(col)}"]`);
    if (!row) return;
    const base = row.dataset.base;
    const { eff, overridden } = effectiveLabel(col, base);
    const cell = row.querySelector('.eff-type');
    if (cell) {
      cell.textContent = overridden ? eff + ' ⚑' : eff;
      cell.classList.toggle('overridden', overridden);
    }
    updateTypeCounts();
  }

  function updateTypeCounts() {
    const counts = {};
    document.querySelectorAll('tr[data-col]').forEach((row) => {
      const col = row.dataset.col;
      const base = row.dataset.base;
      const eff = DA.overrides.effective(col, base);
      counts[eff] = (counts[eff] || 0) + 1;
    });
    document.querySelectorAll('[data-type-count]').forEach((el) => {
      const k = el.dataset.typeCount;
      el.textContent = counts[k] !== undefined ? counts[k] : 0;
    });
  }

  function buildOptions(sel, base) {
    const cur = DA.overrides.get(sel.dataset.col);
    sel.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = 'auto';
    auto.textContent = DA.t('dist.auto') + ' (' + base + ')';
    sel.appendChild(auto);
    TYPE_OPTIONS.forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = DA.t('type.' + t);
      sel.appendChild(o);
    });
    sel.value = cur || 'auto';
  }

  function init() {
    DA.overrides.init();
    const sels = document.querySelectorAll('select.type-override');
    if (!sels.length) return;

    sels.forEach((sel) => {
      const col = sel.dataset.col;
      const base = sel.dataset.base;
      buildOptions(sel, base);
      updateRow(col);
      sel.addEventListener('change', () => {
        DA.overrides.set(col, sel.value === 'auto' ? null : sel.value);
        updateRow(col);
      });
    });

    document.addEventListener('da-lang-change', () => {
      DA.i18n.applyDom(document);
      sels.forEach((sel) => buildOptions(sel, sel.dataset.base));
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
