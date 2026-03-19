# Implementation Details

## IPC Contract

- `scanner:get-runtime-status`
- `watchlist:get`
- `watchlist:add`
- `watchlist:remove`
- `scanner:update-config`
- `scanner:run-now`
- `chart:get-series`
- Push channels: `scanner:update`, `scanner:signal`

## Scanner Criteria

Configurable filters:
- exchange universe (currently watchlist-oriented with NYSE/NASDAQ focus)
- min/max price
- minimum volume
- minimum market cap
- optional sector whitelist

## Indicators/Patterns Included

Indicators:
- RSI
- MACD
- SMA/EMA
- Bollinger Bands
- ATR
- Volume profile bucket analysis

Patterns:
- breakout
- double bottom
- head and shoulders
- gap up / gap down

## Error Handling

- API errors are isolated per symbol so one failure does not break a full scan.
- Cached values are reused when possible.
- If WebSocket is unavailable, app remains usable in polling mode.

## Security

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- API access strictly through preload bridge.
