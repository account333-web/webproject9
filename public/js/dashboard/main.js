// === public/js/main.js ===
// Point d'entrée global qui initialise toutes les sections de l'application
import { loadUserInfo, loadCurrentUserId } from './userInfo.js';
import { loadCountries } from './country.js';
import { loadCompanies } from './company.js';
import { loadRankings } from './ranking.js';
import { initClickcoinChart, subscribeClickcoinSSE } from './charts.js';
import { annotatePrice } from './annotation.js';
import './nav.js';

// Rafraîchissement périodique (exemple : 60s pour infos utilisateur)
const USER_REFRESH_MS = 60_000;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1) Auth & infos utilisateurs
    loadUserInfo();
    setInterval(loadUserInfo, USER_REFRESH_MS);

    // 2) Pays, entreprises, classements
    loadCountries();
    await loadCurrentUserId();
    loadCompanies();
    loadRankings();

    // 3) Chart ClickCoin
    await initClickcoinChart();
    subscribeClickcoinSSE();

    // 4) Annotation prix
    // annotatePrice();
  } catch (err) {
    console.error('Erreur initialisation main:', err);
    // TODO: afficher un toast d'erreur global
  }
});

// === Gestion des onglets dans la section "Classement" ===
  document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.classtab-card .tab-btn');
    const tabPanes   = document.querySelectorAll('.classtab-card .tab-pane');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab'); // "countries", "companies" ou "players"

        // 1) Décocher tous les onglets et toutes les panes
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        // 2) Activer l’onglet cliqué
        btn.classList.add('active');

        // 3) Activer la “pane” correspondante
        const pane = document.getElementById('tab-' + target);
        if (pane) pane.classList.add('active');
      });
    }); 
  });

  // Carousel pour la section "Pays"
  document.addEventListener('DOMContentLoaded', function() {
    // 1) Récupération des éléments
    const prevBtn = document.querySelector('.country-carousel .carousel-btn.prev');
    const nextBtn = document.querySelector('.country-carousel .carousel-btn.next');
    const track   = document.getElementById('country-track');
    let items     = Array.from(track.querySelectorAll('.carousel-item'));

    // 2) Index courant
    let currentIndex = 0;

    // 3) Fonction pour mettre à jour l'état des boutons
    function updateButtons() {
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === items.length - 1 || items.length === 0;
    }

    // 4) Rafraîchir la liste des éléments après chargement dynamique
    function refreshItems() {
      items = Array.from(track.querySelectorAll('.carousel-item'));
      currentIndex = 0;
      track.style.transform = 'translateX(0)';
      updateButtons();
    }

    // 5) Fonction pour déplacer la piste vers un nouvel index
    function moveToIndex(newIndex) {
      const offsetPercentage = newIndex * 100;
      track.style.transform = `translateX(-${offsetPercentage}%)`;
      currentIndex = newIndex;
      updateButtons();
    }

    // 6) Écouteurs de clic pour les flèches
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        moveToIndex(currentIndex - 1);
      }
    });
    nextBtn.addEventListener('click', () => {
      if (currentIndex < items.length - 1) {
        moveToIndex(currentIndex + 1);
      }
    });

    // 7) Mettre à jour quand la liste des pays est chargée
    document.addEventListener('countriesUpdated', refreshItems);

    // 8) Initialisation
    refreshItems();
  });
