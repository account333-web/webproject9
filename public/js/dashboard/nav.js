// nav.js

import { wallet } from './constants.js';

// on attend le DOM
document.addEventListener('DOMContentLoaded', () => {
  // profil
  wallet.addEventListener('click', () => {
    window.location.href = 'menu.html';
  });

  // autres boutons

  document.getElementById('trade').addEventListener('click', () => {
    window.location.href = 'trade.html';
  });
});
