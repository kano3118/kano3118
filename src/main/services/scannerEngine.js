import { EventEmitter } from 'node:events';
import { generateSignal } from './signalEngine.js';

export class ScannerEngine extends EventEmitter {
  constructor({ provider }) {
    super();
    this.provider = provider;
    this.config = {
      exchanges: ['NYSE', 'NASDAQ'],
      minPrice: 5,
      maxPrice: 500,
      minVolume: 500000,
      minMarketCapB: 2,
      sectors: []
    };
    this.lastSignals = new Map();
  }

  updateConfig(partial) {
    this.config = {
      ...this.config,
      ...partial
    };
    return this.config;
  }

  filterByConfig(snapshot) {
    return snapshot.filter((stock) => {
      if (stock.quote.price < this.config.minPrice || stock.quote.price > this.config.maxPrice) return false;
      if ((stock.quote.volume || 0) < this.config.minVolume) return false;
      const marketCapB = stock.fundamentals.marketCapitalization ? stock.fundamentals.marketCapitalization / 1e9 : null;
      if (marketCapB !== null && marketCapB < this.config.minMarketCapB) return false;
      if (this.config.sectors.length && stock.fundamentals.sector && !this.config.sectors.includes(stock.fundamentals.sector)) return false;
      return true;
    });
  }

  async run(symbols) {
    const snapshot = [];

    for (const symbol of symbols) {
      try {
        const [quote, candles, fundamentals] = await Promise.all([
          this.provider.fetchQuote(symbol),
          this.provider.fetchCandles(symbol),
          this.provider.fetchFundamentals(symbol)
        ]);

        const signal = generateSignal({ symbol, quote, candles, fundamentals });
        this.lastSignals.set(symbol, signal);

        snapshot.push({ symbol, quote, fundamentals, signal });

        this.emit('signal', signal);
      } catch (error) {
        this.emit('error', { symbol, error: error.message });
      }
    }

    const filtered = this.filterByConfig(snapshot)
      .sort((a, b) => b.signal.totalScore - a.signal.totalScore);

    this.emit('snapshot', filtered);
    return filtered;
  }
}
