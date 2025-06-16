// On cible le bouton une seule fois
const btn = document.getElementById('theme-toggle');

// Met à jour l’icône du bouton en fonction du thème déjà appliqué sur <html>
const current = document.documentElement.dataset.theme;
btn.textContent = current === 'light' ? '🌙' : '☀️';

// Au clic, on inverse et on persiste
btn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  btn.textContent = next === 'light' ? '🌙' : '☀️';
});