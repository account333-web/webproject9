import { state } from './state.js';
import { loadInvestments, updateInvestmentsTable } from './investments.js';
import { csrfFetch } from '../utils/csrf.js';
import { API } from './config.js';

// ─── Achats / Ventes ─────────────────────────────────────────────────────────
export async function handleBuy() {
  const qtyOrAmount = parseFloat(state.dom.qtyInput.value);
  if (isNaN(qtyOrAmount) || qtyOrAmount <= 0) {
    alert('Veuillez entrer une quantité valide.');
    return;
  }
  if (state.lastPrice === null) {
    alert('Prix indisponible.');
    return;
  }
  const quantity = state.dom.tradeMode.value === 'quantity'
    ? qtyOrAmount
    : qtyOrAmount / state.lastPrice;

  const resp = await csrfFetch(API.tradeBuy, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetCode: state.dom.assetSelect.value,
      quantity,
      buyPrice: state.lastPrice
    })
  });
  const result = await resp.json();
  if (result.success) {
    await loadInvestments();
    updateInvestmentsTable(state.lastPrice);
    alert('Achat réussi !');
  } else {
    alert('Erreur lors de l’achat : ' + (result.error || 'inconnue'));
  }
}

export async function handleSell() {
  // Récupérer le code de l'actif depuis le state
  const assetCode = state.dom.assetSelect.value;

  const res = await csrfFetch(API.tradeSell, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetCode }),
  });
  const result = await res.json();

  if (result.success) {
    await loadInvestments();
    updateInvestmentsTable(state.lastPrice);
    const gain = result.gain;
    alert(`Vente réussie, ${gain >= 0 ? 'gain' : 'perte'} de ${Math.abs(gain).toFixed(2)} CC`);
  } else {
    alert('Erreur lors de la vente : ' + (result.error || 'inconnue'));
  }
}
