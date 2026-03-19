import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSignal } from '../src/main/services/signalEngine.js';

function buildCandleSeries() {
  const candles = [];
  let price = 100;
  for (let i = 0; i < 120; i += 1) {
    price += 0.5 + Math.sin(i / 8);
    candles.push({
      timestamp: Date.now() - (120 - i) * 86400000,
      open: price - 1,
      high: price + 1.5,
      low: price - 2,
      close: price,
      volume: 1200000 + i * 5000
    });
  }
  return candles;
}

test('generateSignal returns expected shape', () => {
  const candles = buildCandleSeries();
  const signal = generateSignal({
    symbol: 'TEST',
    quote: { symbol: 'TEST', price: candles.at(-1).close, volume: candles.at(-1).volume },
    candles,
    fundamentals: {
      peRatio: 24,
      earningsGrowthYoY: 0.15,
      revenueGrowthYoY: 0.11,
      netMargin: 0.2,
      analystRating: 'Buy:12 Hold:4 Sell:1',
      institutionalOwnershipChange: 0.05,
      insiderNetActivity: 50000
    }
  });

  assert.equal(signal.symbol, 'TEST');
  assert.ok(['BUY', 'SELL', 'HOLD'].includes(signal.action));
  assert.ok(signal.totalScore >= 0 && signal.totalScore <= 100);
  assert.ok(signal.riskReward.ratio > 0);
});
