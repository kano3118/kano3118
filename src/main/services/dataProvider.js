import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { config } from './config.js';
import { SlidingWindowRateLimiter, TtlCache } from './cache.js';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const ALPHA_BASE = 'https://www.alphavantage.co/query';

export class MarketDataProvider extends EventEmitter {
  constructor() {
    super();
    this.cache = new TtlCache(config.scanner.cacheTtlMs);
    this.limiter = new SlidingWindowRateLimiter(config.scanner.rateLimitPerMinute);
    this.socket = null;
    this.symbols = [];
    this.lastQuotes = new Map();
  }

  connect(symbols) {
    this.symbols = symbols;
    if (!config.providers.finnhubApiKey) return;

    this.socket = new WebSocket(`wss://ws.finnhub.io?token=${config.providers.finnhubApiKey}`);
    this.socket.on('open', () => {
      for (const symbol of symbols) {
        this.socket.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
      this.emit('status', { connected: true, provider: 'finnhub-websocket' });
    });

    this.socket.on('message', (buffer) => {
      const payload = JSON.parse(buffer.toString());
      if (!payload.data) return;
      for (const quote of payload.data) {
        const normalized = {
          symbol: quote.s,
          price: quote.p,
          volume: quote.v,
          timestamp: quote.t
        };
        this.lastQuotes.set(normalized.symbol, normalized);
        this.emit('quote', normalized);
      }
    });

    this.socket.on('error', (error) => {
      this.emit('status', { connected: false, provider: 'finnhub-websocket', error: error.message });
    });

    this.socket.on('close', () => {
      this.emit('status', { connected: false, provider: 'finnhub-websocket' });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  async fetchQuote(symbol) {
    const cacheKey = `quote:${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!this.limiter.consume()) {
      const fallback = this.lastQuotes.get(symbol);
      if (fallback) return fallback;
      throw new Error('Rate limit reached and no cached quote available');
    }

    if (!config.providers.finnhubApiKey) {
      throw new Error('FINNHUB_API_KEY missing');
    }

    const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${config.providers.finnhubApiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Quote request failed: ${response.status}`);
    const data = await response.json();

    const quote = {
      symbol,
      price: data.c,
      change: data.d,
      percentChange: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: data.t * 1000
    };

    this.cache.set(cacheKey, quote);
    return quote;
  }

  async fetchCandles(symbol, resolution = 'D', count = 120) {
    const cacheKey = `candles:${symbol}:${resolution}:${count}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!this.limiter.consume()) {
      throw new Error('Rate limit reached for candle request');
    }

    const to = Math.floor(Date.now() / 1000);
    const from = to - count * 86400;

    if (config.providers.finnhubApiKey) {
      const url = `${FINNHUB_BASE}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${config.providers.finnhubApiKey}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Candle request failed: ${response.status}`);
      const data = await response.json();

      const candles = (data.c || []).map((close, index) => ({
        timestamp: data.t[index] * 1000,
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close,
        volume: data.v[index]
      }));

      this.cache.set(cacheKey, candles, config.scanner.cacheTtlMs * 2);
      return candles;
    }

    if (!config.providers.alphaVantageApiKey) {
      throw new Error('No market data API key configured');
    }

    const url = `${ALPHA_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${config.providers.alphaVantageApiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Alpha Vantage request failed: ${response.status}`);
    const data = await response.json();
    const series = data['Time Series (Daily)'] || {};

    const candles = Object.entries(series)
      .slice(0, count)
      .map(([date, point]) => ({
        timestamp: new Date(date).getTime(),
        open: Number(point['1. open']),
        high: Number(point['2. high']),
        low: Number(point['3. low']),
        close: Number(point['4. close']),
        volume: Number(point['5. volume'])
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    this.cache.set(cacheKey, candles, config.scanner.cacheTtlMs * 2);
    return candles;
  }

  async fetchFundamentals(symbol) {
    const cacheKey = `fundamentals:${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!this.limiter.consume()) throw new Error('Rate limit reached for fundamentals request');
    if (!config.providers.finnhubApiKey) {
      return {
        peRatio: null,
        earningsGrowthYoY: null,
        revenueGrowthYoY: null,
        netMargin: null,
        analystRating: 'N/A',
        institutionalOwnershipChange: null,
        insiderNetActivity: null
      };
    }

    const [metricsResponse, recommendationResponse] = await Promise.all([
      fetch(`${FINNHUB_BASE}/stock/metric?symbol=${symbol}&metric=all&token=${config.providers.finnhubApiKey}`),
      fetch(`${FINNHUB_BASE}/stock/recommendation?symbol=${symbol}&token=${config.providers.finnhubApiKey}`)
    ]);

    const metrics = metricsResponse.ok ? await metricsResponse.json() : {};
    const recommendations = recommendationResponse.ok ? await recommendationResponse.json() : [];
    const latestRecommendation = recommendations?.[0];

    const fundamentals = {
      peRatio: metrics.metric?.peTTM ?? null,
      earningsGrowthYoY: metrics.metric?.epsGrowthQuarterlyYoy ?? null,
      revenueGrowthYoY: metrics.metric?.revenueGrowthTTMYoy ?? null,
      netMargin: metrics.metric?.netMargin ?? null,
      analystRating: latestRecommendation
        ? `Buy:${latestRecommendation.buy} Hold:${latestRecommendation.hold} Sell:${latestRecommendation.sell}`
        : 'N/A',
      institutionalOwnershipChange: metrics.metric?.institutionalOwnership ?? null,
      insiderNetActivity: metrics.metric?.insiderNetSharePurchased ?? null
    };

    this.cache.set(cacheKey, fundamentals, 60000);
    return fundamentals;
  }
}
