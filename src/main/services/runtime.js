import { MarketDataProvider } from './dataProvider.js';
import { ScannerEngine } from './scannerEngine.js';
import { config } from './config.js';
import { getWatchlist } from './watchlistStore.js';
import { pushSignalNotification } from './notificationService.js';

export function initializeScannerRuntime() {
  const provider = new MarketDataProvider();
  const scanner = new ScannerEngine({ provider });

  let scanTimer;
  let symbols = getWatchlist();
  let latestSnapshot = [];
  let latestStatus = { connected: false, provider: 'offline' };

  provider.connect(symbols);
  provider.on('status', (status) => {
    latestStatus = status;
  });

  scanner.on('snapshot', (snapshot) => {
    latestSnapshot = snapshot;
  });

  scanner.on('signal', (signal) => {
    pushSignalNotification(signal);
  });

  const runScan = async () => {
    await scanner.run(symbols);
    return latestSnapshot;
  };

  scanTimer = setInterval(() => {
    runScan().catch(() => {});
  }, config.scanner.scanIntervalMs);

  runScan().catch(() => {});

  return {
    provider,
    scanner,
    getSymbols: () => symbols,
    setSymbols: (nextSymbols) => {
      symbols = nextSymbols;
      provider.disconnect();
      provider.connect(symbols);
    },
    runScan,
    getLatestSnapshot: () => latestSnapshot,
    getStatus: () => latestStatus,
    shutdown: () => {
      clearInterval(scanTimer);
      provider.disconnect();
    }
  };
}
