import { state } from './state.js';
import { updateTradeInfo } from './chart.js';
import { updateInvestmentsTable } from './investments.js';
import { API } from './config.js';

// ─── SSE & candles “live” ───────────────────────────────────────────────────
function updCandle(price, timestamp = new Date()) {
  if (!state.chartCtrl) return;
  state.chartCtrl.update(price, timestamp);
  state.seriesData = state.chartCtrl.seriesData;
  state.liveCandle = state.chartCtrl.liveCandle;
  updateTradeInfo(price);
  updateInvestmentsTable(price);
}

// réception des ticks SSE
function handleStreamEvent(e) {
  const d = JSON.parse(e.data);
  let code = null;
  if (d.assetType === 'clickcoin')       code = 'clickcoin';
  else if (d.assetType === 'company')    code = `company-${d.assetId}`;
  if (!code || code !== state.dom.assetSelect.value) return;

  state.lastPrice = d.close;
  const ts   = d.x ? new Date(d.x) : new Date();
  updCandle(state.lastPrice, ts);
}

const evtSource = new EventSource(API.stream);
evtSource.onmessage = handleStreamEvent;