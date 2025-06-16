// theme-init.js
(function() {
  // Récupère (ou initialise) le thème
  let theme = localStorage.getItem('theme');
  if (!theme) {
    theme = 'light';
    localStorage.setItem('theme', theme);
  }
  // Applique le thème dès que possible sur <html>
  document.documentElement.dataset.theme = theme;
})();
