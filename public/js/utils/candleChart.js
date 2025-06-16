import ApexCharts from 'https://cdn.jsdelivr.net/npm/apexcharts@3.41.0/dist/apexcharts.esm.min.js';

export function aggregatePerMinute(raw) {
  const grouped = {};
  raw.forEach(p => {
    const iso  = p.x.includes('T') ? p.x : p.x.replace(' ', 'T') + 'Z';
    const date = new Date(iso);
    const key  = Math.floor(date.getTime() / 60000) * 60000;
    if (!grouped[key]) {
      grouped[key] = { open:+p.open, high:+p.high, low:+p.low, close:+p.close };
    } else {
      grouped[key].high  = Math.max(grouped[key].high,  +p.high);
      grouped[key].low   = Math.min(grouped[key].low,   +p.low);
      grouped[key].close = +p.close;
    }
  });
  return Object.entries(grouped)
    .map(([ms, ohlc]) => ({
      x: new Date(+ms),
      y: [ohlc.open, ohlc.high, ohlc.low, ohlc.close]
    }))
    .sort((a,b) => a.x - b.x);
}

export async function createCandleChart({ elementSelector, historyUrl, name, windowMs }) {
  const sinceISO = new Date(Date.now() - windowMs).toISOString();
  const resp = await fetch(`${historyUrl}?since=${encodeURIComponent(sinceISO)}`, { credentials:'include' });
  const raw = await resp.json();
  const cutoff = Date.now() - windowMs;
  const allCandles = aggregatePerMinute(raw).filter(pt => pt.x.getTime() >= cutoff);

  const nowKey = Math.floor(Date.now() / 60000) * 60000;
  let seriesData, liveCandle;
  const last = allCandles[allCandles.length - 1];
  if (last && last.x.getTime() === nowKey) {
    seriesData = allCandles.slice(0, -1);
    const [o,h,l,c] = last.y;
    liveCandle = { key: Math.floor(nowKey / 60000), start: new Date(nowKey), open:o, high:h, low:l, close:c };
  } else {
    seriesData = allCandles;
    liveCandle = null;
  }

  const cfg = {
    series: [{ name, data: [
      ...seriesData,
      ...(liveCandle ? [{ x: liveCandle.start, y: [liveCandle.open, liveCandle.high, liveCandle.low, liveCandle.close] }] : [])
    ] }],
    chart: { type:'candlestick', height:350, toolbar:{show:true}, animations:{enabled:false} },
    plotOptions:{ candlestick:{ colors:{ upward:'#00B746', downward:'#EF403C' }, wick:{ useFillColor:true } } },
    xaxis:{ type:'datetime', range: windowMs },
    yaxis:{ tooltip:{ enabled:true }, title:{ text:'Prix (CC)' } },
    annotations:{ yaxis:[] }
  };
  const chart = new ApexCharts(document.querySelector(elementSelector), cfg);
  await chart.render();

  function update(price, timestamp = new Date()) {
    const ts = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
    const key = Math.floor(ts / 60000);
    if (!liveCandle || liveCandle.key !== key) {
      if (liveCandle) {
        seriesData.push({ x: liveCandle.start, y: [liveCandle.open, liveCandle.high, liveCandle.low, liveCandle.close] });
        const cutoff = Date.now() - windowMs;
        seriesData = seriesData.filter(pt => pt.x.getTime() >= cutoff);
      }
      liveCandle = { key, start: new Date(key * 60000), open: price, high: price, low: price, close: price };
    } else {
      liveCandle.high  = Math.max(liveCandle.high,  price);
      liveCandle.low   = Math.min(liveCandle.low,   price);
      liveCandle.close = price;
    }
    const display = [...seriesData, { x: liveCandle.start, y: [liveCandle.open, liveCandle.high, liveCandle.low, liveCandle.close] }];
    chart.updateSeries([{ data: display }], false);
  }

  function annotate(price) {
    chart.updateOptions({ annotations:{ yaxis:[{ y:price, borderColor:'#FF4560', label:{ borderColor:'#FF4560', style:{ color:'#fff', background:'#FF4560' }, text:`Prix courant : ${price.toFixed(4)}` } }] }}, false, true);
  }

  return { chart, update, annotate, get seriesData(){ return seriesData; }, get liveCandle(){ return liveCandle; } };
}
