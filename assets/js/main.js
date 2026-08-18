/* main.js — theme toggle, language toggle, active nav, staggered reveal */
(function (global) {
  'use strict';
  const DA = global.DA;

  const THEME_KEY = 'da-theme';

  function currentTheme() {
    let t = 'dark';
    try { t = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { /* ignore */ }
    return t;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const next = theme === 'dark' ? 'light' : 'dark';
      btn.innerHTML = theme === 'dark' ? '☀' : '☾';
      btn.title = DA.t('btn.theme', { t: next === 'light' ? 'light' : 'dark' });
      btn.setAttribute('aria-label', btn.title);
    }
  }

  function init() {
    // language first (translates the chrome)
    DA.i18n.init();
    DA.overrides.init();
    DA.i18n.applyDom(document);

    // theme
    applyTheme(currentTheme());
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      });
    }

    // language toggle
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      const renderLang = () => { langBtn.textContent = DA.i18n.lang === 'en' ? '中文' : 'EN'; };
      langBtn.addEventListener('click', () => {
        DA.i18n.set(DA.i18n.lang === 'en' ? 'zh' : 'en');
        DA.i18n.applyDom(document);
        renderLang();
      });
      renderLang();
      // charts redraw to pick up translated dynamic labels
      document.addEventListener('da-lang-change', () => {
        document.dispatchEvent(new CustomEvent('da-render-all'));
      });
    }

    // active nav
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.topbar nav a').forEach((a) => {
      const href = a.getAttribute('href').split('/').pop();
      if (href === path) a.classList.add('active');
    });

    // staggered reveal
    document.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.animationDelay = Math.min(i * 55, 500) + 'ms';
    });

    // tooltips for truncated labels (svg text with data-full)
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('text[data-full]');
      if (t && t.textContent.endsWith('…')) {
        DA.tooltip.show(`<div class="tt-title">${DA.escape(t.dataset.full)}</div>`, e.clientX, e.clientY);
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('text[data-full]')) DA.tooltip.hide();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
