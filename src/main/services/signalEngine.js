import { atr, bollingerBands, ema, macd, rsi, sma, volumeProfile } from './technicalIndicators.js';
import { detectBreakout, detectDoubleBottom, detectGap, detectHeadAndShoulders } from './patternRecognition.js';

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTechnical(candles) {
  const closes = candles.map((c) => c.close);
  const latest = candles.at(-1);
  const latestVolume = latest.volume;
  const avgVolume20 = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;

  const rsiValue = rsi(closes);
  const macdValue = macd(closes);
  const sma50 = sma(closes, 50);
  const ema20 = ema(closes, 20);
  const bands = bollingerBands(closes);
  const atrValue = atr(candles);

  let score = 0;
  if (ema20 && sma50 && ema20 > sma50) score += 20;
  if (macdValue && macdValue.histogram > 0) score += 15;
  if (rsiValue && rsiValue > 50 && rsiValue < 72) score += 15;
  if (bands && latest.close > bands.middle) score += 10;
  if (latestVolume > avgVolume20 * 1.4) score += 20;
  if (atrValue && atrValue / latest.close < 0.03) score += 10;

  return {
    score: clampScore(score),
    indicators: { rsi: rsiValue, macd: macdValue, sma50, ema20, bollinger: bands, atr: atrValue }
  };
}

function scoreFundamentals(fundamentals) {
  let score = 0;
  if (fundamentals.peRatio && fundamentals.peRatio > 0 && fundamentals.peRatio < 35) score += 20;
  if (fundamentals.earningsGrowthYoY && fundamentals.earningsGrowthYoY > 0.08) score += 25;
  if (fundamentals.revenueGrowthYoY && fundamentals.revenueGrowthYoY > 0.06) score += 20;
  if (fundamentals.netMargin && fundamentals.netMargin > 0.12) score += 15;
  if (fundamentals.insiderNetActivity && fundamentals.insiderNetActivity > 0) score += 10;
  if (fundamentals.institutionalOwnershipChange && fundamentals.institutionalOwnershipChange > 0) score += 10;
  return clampScore(score);
}

function scoreSentiment(fundamentals, candles) {
  const closes = candles.map((c) => c.close);
  const trend = closes.at(-1) > sma(closes, 20) ? 1 : 0;
  const ratingBullish = fundamentals.analystRating?.includes('Buy') ? 1 : 0;
  return clampScore(trend * 50 + ratingBullish * 50);
}

function evaluatePatterns(candles) {
  const closes = candles.map((c) => c.close);
  const gap = detectGap(candles);

  return {
    breakout: detectBreakout(closes),
    doubleBottom: detectDoubleBottom(closes),
    headAndShoulders: detectHeadAndShoulders(closes),
    gapUp: gap.gapUp,
    gapDown: gap.gapDown,
    volumeProfile: volumeProfile(candles.slice(-60), 12)
  };
}

function calculateRiskReward(candles) {
  const closes = candles.map((c) => c.close);
  const supports = Math.min(...closes.slice(-20));
  const resistance = Math.max(...closes.slice(-20));
  const entry = closes.at(-1);
  const risk = Math.max(entry - supports, 0.01);
  const reward = Math.max(resistance * 1.05 - entry, 0.01);
  return {
    support: supports,
    resistance,
    entry,
    ratio: reward / risk
  };
}

export function generateSignal({ symbol, quote, candles, fundamentals }) {
  const technical = scoreTechnical(candles);
  const fundamentalScore = scoreFundamentals(fundamentals);
  const sentimentScore = scoreSentiment(fundamentals, candles);
  const patterns = evaluatePatterns(candles);
  const riskReward = calculateRiskReward(candles);

  const totalScore = clampScore(technical.score * 0.45 + fundamentalScore * 0.35 + sentimentScore * 0.2);

  const rsiOverbought = technical.indicators.rsi && technical.indicators.rsi > 75;
  const bearishPattern = patterns.headAndShoulders || patterns.gapDown;
  const bullishPattern = patterns.breakout || patterns.doubleBottom || patterns.gapUp;

  let action = 'HOLD';
  if (totalScore >= 70 && bullishPattern && riskReward.ratio >= 2 && !rsiOverbought) action = 'BUY';
  if (totalScore <= 40 || bearishPattern || rsiOverbought) action = 'SELL';

  const rationale = [];
  if (action === 'BUY') {
    rationale.push('Momentum and volume are supportive of continuation.');
    rationale.push('Risk/reward threshold (>=2:1) is satisfied.');
    rationale.push('Pattern confirmation detected at/above resistance.');
  } else if (action === 'SELL') {
    rationale.push('Protective sell trigger fired due to weakness, overbought risk, or bearish pattern.');
  } else {
    rationale.push('Setup is mixed; monitor for clearer trend confirmation.');
  }

  return {
    symbol,
    action,
    totalScore,
    quote,
    fundamentals,
    technical: technical.indicators,
    patterns,
    riskReward,
    rationale,
    generatedAt: new Date().toISOString(),
    modelProfile: 'Multi-factor discretionary model inspired by institutional sell-side workflow.'
  };
}
