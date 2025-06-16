import { state } from './state.js';
import { getAssetNameFromCode } from './utils.js';
import { API } from './config.js';

// ─── Chargement des investissements ─────────────────────────────────────────
// On récupère la liste via /api/trade/list (route définie dans tradeRoutes.js)
export async function loadInvestments() {
  const resp = await csrfFetch(API.investmentsList);
  state.investments = await resp.json();
}

// ─── Mise à jour du tableau d’investissements ────────────────────────────────
export function updateInvestmentsTable(currentPrice) {
  state.dom.investmentsTb.innerHTML = '';
  state.investments.forEach(inv => {
    const currentValue = inv.quantity * currentPrice;
    const cost         = inv.quantity * inv.buy_price;
    const plAmount     = currentValue - cost;
    const plPercent    = (plAmount / cost) * 100;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${getAssetNameFromCode(inv.asset_code)}</td>
      <td>${new Date(inv.buy_date).toLocaleString()}</td>
      <td>${inv.quantity.toFixed(2)}</td>
      <td>${inv.buy_price.toFixed(4)}</td>
      <td>${currentValue.toFixed(4)}</td>
      <td>${plPercent.toFixed(2)}%</td>
      <td>${plAmount.toFixed(2)} CC</td>
    `;
    state.dom.investmentsTb.appendChild(tr);
  });
}

export async function loadAssets(assetSelect) {
  // Vider et recréer le <select>
  assetSelect.innerHTML = '';
  // Always include ClickCoin
  const optCC = document.createElement('option');
  optCC.value = 'clickcoin';
  optCC.textContent = 'ClickCoin';
  assetSelect.appendChild(optCC);

  // Récupérer la liste des entreprises dispo côté serveur
  const resp = await csrfFetch(API.companies);
  if (!resp.ok) {
    console.error('Erreur csrfFetch API.companies');
    return;
  }
  const companies = await resp.json();
  companies.forEach(c => {
    const opt = document.createElement('option');
    opt.value = `company-${c.id}`;
    opt.textContent = c.name;
    assetSelect.appendChild(opt);
  });
}