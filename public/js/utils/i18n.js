(function() {
  let current = localStorage.getItem('lang') || 'fr';
  const cache = {};
  const select = document.getElementById('lang-select');

  async function load(lang) {
    current = lang;
    localStorage.setItem('lang', lang);
    if (!cache[lang]) {
      try {
        const res = await fetch(`/lang/${lang}.json`);
        cache[lang] = await res.json();
      } catch (err) {
        console.error('i18n load error', err);
        cache[lang] = {};
      }
    }
    apply();
    if (select) select.value = lang;
    document.documentElement.lang = lang;
  }

  function apply() {
    const dict = cache[current];
    if (!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) el.placeholder = dict[key];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (dict[key]) el.title = dict[key];
    });
  }

  window.i18n = { load, apply, get current() { return current; } };

  document.addEventListener('DOMContentLoaded', () => {
    load(current);
    if (select) {
      select.value = current;
      select.addEventListener('change', e => load(e.target.value));
    }
  });
})();
