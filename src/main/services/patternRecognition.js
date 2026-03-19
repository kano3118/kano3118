function getExtrema(closes) {
  const peaks = [];
  const troughs = [];
  for (let i = 1; i < closes.length - 1; i += 1) {
    if (closes[i] > closes[i - 1] && closes[i] > closes[i + 1]) peaks.push({ index: i, value: closes[i] });
    if (closes[i] < closes[i - 1] && closes[i] < closes[i + 1]) troughs.push({ index: i, value: closes[i] });
  }
  return { peaks, troughs };
}

export function detectBreakout(closes, lookback = 20) {
  if (closes.length < lookback + 1) return false;
  const priorHigh = Math.max(...closes.slice(-lookback - 1, -1));
  const latest = closes.at(-1);
  return latest > priorHigh;
}

export function detectDoubleBottom(closes, tolerance = 0.02) {
  const { troughs } = getExtrema(closes);
  if (troughs.length < 2) return false;
  const [a, b] = troughs.slice(-2);
  return Math.abs(a.value - b.value) / a.value <= tolerance && b.index - a.index >= 3;
}

export function detectHeadAndShoulders(closes, tolerance = 0.04) {
  const { peaks } = getExtrema(closes);
  if (peaks.length < 3) return false;
  const [left, head, right] = peaks.slice(-3);
  const shouldersClose = Math.abs(left.value - right.value) / left.value <= tolerance;
  const headHigher = head.value > left.value && head.value > right.value;
  return shouldersClose && headHigher;
}

export function detectGap(candles, gapThreshold = 0.01) {
  if (candles.length < 2) return { gapUp: false, gapDown: false };
  const prev = candles.at(-2);
  const latest = candles.at(-1);
  return {
    gapUp: latest.open > prev.close * (1 + gapThreshold),
    gapDown: latest.open < prev.close * (1 - gapThreshold)
  };
}
