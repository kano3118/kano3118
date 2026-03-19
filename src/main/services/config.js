import dotenv from 'dotenv';

dotenv.config();

export const config = {
  providers: {
    finnhubApiKey: process.env.FINNHUB_API_KEY || '',
    alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || ''
  },
  scanner: {
    scanIntervalMs: Number(process.env.SCAN_INTERVAL_MS || 15000),
    cacheTtlMs: Number(process.env.CACHE_TTL_MS || 10000),
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 40),
    defaultSymbols: (process.env.DEFAULT_SYMBOLS || 'AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,AMD').split(',').map((s) => s.trim())
  }
};
