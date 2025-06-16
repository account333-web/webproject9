// ─── Sélecteurs & constantes ────────────────────────────────────────────────
const assetSelect   = document.getElementById('asset');

// ─── Utilitaires ────────────────────────────────────────────────────────────
export function getAssetNameFromCode(code) {
  if (code === 'clickcoin') return 'ClickCoin';
  const opt = assetSelect.querySelector(`option[value="${code}"]`);
  return opt ? opt.textContent : code;
}
