// csrf.js — version module ES6
export function csrfFetch(url, options = {}) {
  const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
  const headers = { 'X-CSRF-Token': token, ...(options.headers || {}) };
  return fetch(url, { ...options, headers });
}

export function injectCsrfTokenInForms() {
  document.addEventListener('submit', e => {
    const form = e.target;
    if (form.method.toUpperCase() !== 'POST') return;
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    if (!token) return;
    let hidden = form.querySelector('input[name="_csrf"]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = '_csrf';
      form.appendChild(hidden);
    }
    hidden.value = token;
  }, true);
}
