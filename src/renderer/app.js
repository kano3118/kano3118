const state = {
  snapshot: [],
  watchlist: [],
  selectedSymbol: null
};

const watchlistEl = document.getElementById('watchlist');
const tableEl = document.getElementById('signalTable');
const statusEl = document.getElementById('connStatus');
const feedEl = document.getElementById('signalFeed');
const chartTitleEl = document.getElementById('chartTitle');

let chart;

function actionClass(action) {
  return `action-${action}`;
}

function renderWatchlist() {
  watchlistEl.innerHTML = state.watchlist.map((symbol) => `
    <li>
      <button data-symbol="${symbol}" class="select-btn">${symbol}</button>
      <button data-remove="${symbol}">✕</button>
    </li>
  `).join('');

  watchlistEl.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.watchlist = await window.scannerApi.removeFromWatchlist(button.dataset.remove);
      renderWatchlist();
    });
  });

  watchlistEl.querySelectorAll('[data-symbol]').forEach((button) => {
    button.addEventListener('click', () => loadChart(button.dataset.symbol));
  });
}

function renderTable() {
  tableEl.innerHTML = state.snapshot.map((row) => {
    const signal = row.signal;
    return `
      <tr data-symbol="${row.symbol}">
        <td>${row.symbol}</td>
        <td>${row.quote.price?.toFixed(2) ?? '-'}</td>
        <td class="${actionClass(signal.action)}">${signal.action}</td>
        <td>${signal.totalScore}</td>
        <td>${signal.technical.rsi ? signal.technical.rsi.toFixed(1) : '-'}</td>
        <td>${signal.riskReward.ratio.toFixed(2)}x</td>
        <td>${signal.rationale[0]}</td>
      </tr>
    `;
  }).join('');

  tableEl.querySelectorAll('tr[data-symbol]').forEach((row) => {
    row.addEventListener('click', () => loadChart(row.dataset.symbol));
  });
}

async function loadChart(symbol) {
  state.selectedSymbol = symbol;
  chartTitleEl.textContent = `Chart · ${symbol}`;
  const series = await window.scannerApi.getChartSeries(symbol, '1D');
  const labels = series.map((candle) => new Date(candle.timestamp).toLocaleDateString());
  const closes = series.map((candle) => candle.close);

  const ctx = document.getElementById('priceChart');
  if (chart) chart.destroy();
  chart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${symbol} Close`,
        data: closes,
        borderColor: '#4f8cff',
        pointRadius: 0,
        tension: 0.1
      }]
    }
  });
}

function addFeedItem(signal) {
  const item = document.createElement('article');
  item.className = 'signal-item';
  item.innerHTML = `<strong class="${actionClass(signal.action)}">${signal.symbol} ${signal.action}</strong> · Score ${signal.totalScore}<br/><small>${signal.rationale.join(' ')}</small>`;
  feedEl.prepend(item);
  if (feedEl.childElementCount > 30) {
    feedEl.removeChild(feedEl.lastChild);
  }
}

async function bootstrap() {
  const runtime = await window.scannerApi.getRuntimeStatus();
  statusEl.textContent = runtime.status.connected ? 'Live feed connected' : 'Polling mode';
  state.snapshot = runtime.snapshot || [];
  state.watchlist = await window.scannerApi.getWatchlist();
  renderWatchlist();
  renderTable();

  if (state.watchlist.length) {
    loadChart(state.watchlist[0]);
  }
}

document.getElementById('scanNowBtn').addEventListener('click', async () => {
  state.snapshot = await window.scannerApi.runScanNow();
  renderTable();
});

document.getElementById('addSymbolBtn').addEventListener('click', async () => {
  const symbol = document.getElementById('symbolInput').value.trim().toUpperCase();
  if (!symbol) return;
  state.watchlist = await window.scannerApi.addToWatchlist(symbol);
  document.getElementById('symbolInput').value = '';
  renderWatchlist();
});

document.getElementById('saveFilterBtn').addEventListener('click', async () => {
  await window.scannerApi.updateScannerConfig({
    minPrice: Number(document.getElementById('minPrice').value),
    maxPrice: Number(document.getElementById('maxPrice').value),
    minVolume: Number(document.getElementById('minVolume').value),
    minMarketCapB: Number(document.getElementById('minMarketCapB').value)
  });
  state.snapshot = await window.scannerApi.runScanNow();
  renderTable();
});

window.scannerApi.onScannerUpdate((snapshot) => {
  state.snapshot = snapshot;
  renderTable();
});

window.scannerApi.onSignal((signal) => {
  addFeedItem(signal);
});

bootstrap();
