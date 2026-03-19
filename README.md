# Stock Scanner Pro (Electron)

Desktop stock scanner with real-time quotes, technical/fundamental scoring, watchlists, desktop notifications, and tray background monitoring.

> ⚠️ This software is educational and decision-support only. It does **not** provide personalized investment advice.

## Architecture

- **Electron Main Process**
  - Owns data ingestion, WebSocket lifecycle, API fallback, caching/rate limit controls, scan orchestration, notifications, and secure IPC handlers.
- **Electron Preload Bridge**
  - Exposes a minimal, typed API surface (`window.scannerApi`) with `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.
- **Renderer Process (Dashboard)**
  - Presents watchlist management, scanner filters, ranking table, signal feed, and charting.

### Layering

1. Data Ingestion Layer (`MarketDataProvider`)
2. Analysis Layer (technical indicators + pattern recognition)
3. Signal Layer (`generateSignal` multi-factor score)
4. Presentation Layer (renderer dashboard)

## Recommended Data Providers

1. **Polygon.io** (best latency for U.S. equities, deep market data, higher cost)
2. **IEX Cloud** (good quality U.S. equities data, strong balance of cost/coverage)
3. **Finnhub** (easy WebSocket access for prototyping + fundamentals)
4. **Alpha Vantage** (good free fallback for historical series)

This implementation uses **Finnhub first** (stream + fundamentals) with **Alpha Vantage fallback** (historical daily candles).

## Latency & Reliability Strategy

- WebSocket subscriptions for quote updates.
- TTL in-memory cache to reduce repetitive API requests.
- Sliding-window API rate limiter to avoid key throttling.
- Graceful fallback to cached/last quote when rate limits or transient failures occur.
- Periodic scan loop + manual "Run Scan" to resynchronize state.

## Signal Model (Institutional-style workflow)

Composite scoring:
- **Technical Momentum (45%)**: EMA/SMA trend, MACD histogram, RSI regime, Bollinger context, ATR volatility, volume confirmation.
- **Fundamental Quality (35%)**: P/E, earnings growth, revenue growth, net margin, insider/institutional direction.
- **Market/Sell-side Sentiment (20%)**: trend regime + recommendation tone proxy.

Buy/Sell logic includes:
- Buy: high score + bullish pattern + risk/reward >= 2:1 + no extreme RSI.
- Sell: weak score, bearish pattern, or overbought RSI (>75).

## Setup

```bash
npm install
cp .env.example .env
# add FINNHUB_API_KEY (and optional ALPHA_VANTAGE_API_KEY)
npm start
```

## File Structure

```text
main.js
preload.js
src/
  main/
    ipc/registerIpcHandlers.js
    services/
      runtime.js
      config.js
      cache.js
      dataProvider.js
      scannerEngine.js
      signalEngine.js
      technicalIndicators.js
      patternRecognition.js
      watchlistStore.js
      notificationService.js
  renderer/
    index.html
    app.js
    styles.css
test/
  indicators.test.js
  signalEngine.test.js
```

## Notes for Production Hardening

- Add robust reconnection backoff + heartbeat for WebSocket layer.
- Move caches/stores to Redis/SQLite for larger universes.
- Add news/sentiment source (e.g., Benzinga/Refinitiv) for catalyst confidence.
- Add Level 2 depth feed and event-driven order book analytics.
- Add portfolio/risk limits and execution simulation before live use.
