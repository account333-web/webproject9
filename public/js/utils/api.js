// public/api.js
(function(){
  // 1) fetch wrapper
  window.csrfFetch = function(url, options = {}) {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const headers = { 'X-CSRF-Token': token, ...(options.headers||{}) };
    return fetch(url, { ...options, headers });
  };
  // 2) injection auto du champ _csrf dans les forms
  document.addEventListener('submit', e => {
    const form = e.target;
    if (form.tagName!=='FORM' || form.method.toUpperCase()!=='POST') return;
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
  });
})();
