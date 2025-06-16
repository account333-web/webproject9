// state.js
export const state = {
  chart: null,
  chartCtrl: null,
  seriesData: [],     // bougies fermées
  liveCandle: null,   // bougie en cours
  lastPrice: null,
  investments: [],
  dom: {
    assetSelect: document.getElementById('asset'),
    chartTitle: document.getElementById('chart-title'),
    buyBtn: document.getElementById('buy-btn'),
    sellBtn: document.getElementById('sell-btn'),
    qtyInput: document.getElementById('trade-qty'),
    tradeMode: document.getElementById('trade-mode'),
    investmentsTb: document.getElementById('investments-body'),
  }
};
