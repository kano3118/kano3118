import Store from 'electron-store';

const store = new Store({ name: 'watchlist' });

export function getWatchlist() {
  return store.get('symbols', ['AAPL', 'MSFT', 'NVDA', 'AMZN']);
}

export function addSymbol(symbol) {
  const current = new Set(getWatchlist());
  current.add(symbol.toUpperCase());
  const next = [...current];
  store.set('symbols', next);
  return next;
}

export function removeSymbol(symbol) {
  const next = getWatchlist().filter((item) => item !== symbol.toUpperCase());
  store.set('symbols', next);
  return next;
}
