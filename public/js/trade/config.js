// config.js

// ⏱ Durée de la fenêtre d’affichage du graphique (en millisecondes)
export const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// 🎨 Couleurs des chandeliers
export const CHART_COLORS = {
  upward: '#00B746',
  downward: '#EF403C'
};

// 🔗 URL de base pour les API (si tu veux centraliser les endpoints)
export const API = {
  stream: '/api/stream',
  clickcoinHistory: '/api/clickcoin/history',
  companies: '/api/companies',
  companyHistory: id => `/api/companies/history/${id}`,
  investmentsList: '/api/trade/list',
  tradeBuy: '/api/trade/buy',
  tradeSell: '/api/trade/sell'
};

// 🧾 Noms des actifs (utile si tu veux centraliser les libellés ici)
export const ASSET_NAMES = {
  clickcoin: 'ClickCoin'
};
