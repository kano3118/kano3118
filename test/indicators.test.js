import test from 'node:test';
import assert from 'node:assert/strict';
import { sma, ema, rsi, bollingerBands, atr } from '../src/main/services/technicalIndicators.js';

const closes = [100, 101, 103, 102, 104, 106, 107, 109, 108, 111, 113, 112, 114, 116, 118, 117, 119, 121, 122, 124, 123];

const candles = closes.map((close, index) => ({
  open: close - 1,
  high: close + 1,
  low: close - 2,
  close,
  volume: 1000000 + index * 1000
}));

test('sma and ema return numeric values', () => {
  assert.equal(typeof sma(closes, 10), 'number');
  assert.equal(typeof ema(closes, 10), 'number');
});

test('rsi stays in a 0-100 range', () => {
  const value = rsi(closes, 14);
  assert.ok(value >= 0 && value <= 100);
});

test('bollinger bands and atr are computed', () => {
  const bands = bollingerBands(closes, 20);
  assert.ok(bands.upper > bands.middle);
  assert.ok(bands.middle > bands.lower);
  assert.ok(atr(candles, 14) > 0);
});
