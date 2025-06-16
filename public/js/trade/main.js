import { initChart } from './chart.js';
import { loadAssets, loadInvestments, updateInvestmentsTable } from './investments.js';
import { handleBuy, handleSell } from './tradeActions.js';
import { injectCsrfTokenInForms } from '../utils/csrf.js';
import './candles.js';
injectCsrfTokenInForms();
const assetSelect = document.getElementById('asset');
document.addEventListener('DOMContentLoaded', async () => {
  await loadAssets(assetSelect);
  await loadInvestments();
  await initChart(document.getElementById('asset').value);

  document.getElementById('buy-btn').addEventListener('click', handleBuy);
  document.getElementById('sell-btn').addEventListener('click', handleSell);
  document.getElementById('asset').addEventListener('change', async e => {
    await loadInvestments();
    await initChart(e.target.value);
  });
});
