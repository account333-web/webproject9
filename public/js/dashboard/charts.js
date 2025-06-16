import { WINDOW_MS } from './constants.js';
import { createCandleChart } from '../utils/candleChart.js';

let chartCtrl;

export async function initClickcoinChart() {
  chartCtrl = await createCandleChart({
    elementSelector: '#clickcoin-chart',
    historyUrl: '/api/clickcoin/history',
    name: 'ClickCoin',
    windowMs: WINDOW_MS
  });
}

export function subscribeClickcoinSSE() {
  if (!window.EventSource) return;
  const es = new EventSource('/api/stream');
  es.onmessage = evt => {
    const d = JSON.parse(evt.data);
    if (d.assetType !== 'clickcoin') return;
    if (chartCtrl) {
      chartCtrl.update(d.close, new Date(d.x));
      chartCtrl.annotate(d.close);
    }
  };
  es.onerror = () => { es.close(); setTimeout(subscribeClickcoinSSE, 3000); };
}
