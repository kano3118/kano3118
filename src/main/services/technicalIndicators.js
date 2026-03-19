function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values) {
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

export function sma(closes, period = 20) {
  if (closes.length < period) return null;
  return mean(closes.slice(-period));
}

export function ema(closes, period = 20) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let emaValue = mean(closes.slice(0, period));
  for (const price of closes.slice(period)) {
    emaValue = price * k + emaValue * (1 - k);
  }
  return emaValue;
}

export function rsi(closes, period = 14) {
  if (closes.length <= period) return null;

  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod + signalPeriod) return null;

  const macdLine = [];
  for (let i = slowPeriod; i <= closes.length; i += 1) {
    const window = closes.slice(0, i);
    const fast = ema(window, fastPeriod);
    const slow = ema(window, slowPeriod);
    macdLine.push(fast - slow);
  }

  const signal = ema(macdLine, signalPeriod);
  const line = macdLine[macdLine.length - 1];
  return {
    line,
    signal,
    histogram: line - signal
  };
}

export function bollingerBands(closes, period = 20, multiplier = 2) {
  if (closes.length < period) return null;
  const sample = closes.slice(-period);
  const mid = mean(sample);
  const deviation = stdDev(sample);
  return {
    upper: mid + multiplier * deviation,
    middle: mid,
    lower: mid - multiplier * deviation
  };
}

export function atr(candles, period = 14) {
  if (candles.length <= period) return null;
  const trs = [];

  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previous = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trs.push(tr);
  }

  return mean(trs.slice(-period));
}

export function volumeProfile(candles, buckets = 10) {
  if (!candles.length) return [];

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);
  const bucketSize = (maxPrice - minPrice) / buckets || 1;

  const profile = new Array(buckets).fill(null).map((_, index) => ({
    bucket: index,
    low: minPrice + bucketSize * index,
    high: minPrice + bucketSize * (index + 1),
    volume: 0
  }));

  for (const candle of candles) {
    const midPrice = (candle.high + candle.low) / 2;
    const bucketIndex = Math.min(Math.floor((midPrice - minPrice) / bucketSize), buckets - 1);
    profile[bucketIndex].volume += candle.volume;
  }

  return profile;
}
