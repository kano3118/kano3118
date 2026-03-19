import { BrowserWindow, ipcMain } from 'electron';
import { addSymbol, getWatchlist, removeSymbol } from '../services/watchlistStore.js';

export function registerIpcHandlers(runtime) {
  ipcMain.handle('scanner:get-runtime-status', async () => ({
    status: runtime.getStatus(),
    snapshot: runtime.getLatestSnapshot(),
    symbols: runtime.getSymbols()
  }));

  ipcMain.handle('watchlist:get', async () => getWatchlist());

  ipcMain.handle('watchlist:add', async (_event, symbol) => {
    const symbols = addSymbol(symbol);
    runtime.setSymbols(symbols);
    return symbols;
  });

  ipcMain.handle('watchlist:remove', async (_event, symbol) => {
    const symbols = removeSymbol(symbol);
    runtime.setSymbols(symbols);
    return symbols;
  });

  ipcMain.handle('scanner:update-config', async (_event, partialConfig) => runtime.scanner.updateConfig(partialConfig));

  ipcMain.handle('scanner:run-now', async () => runtime.runScan());

  ipcMain.handle('chart:get-series', async (_event, { symbol, timeframe }) => {
    const resolution = timeframe === '1H' ? '60' : 'D';
    return runtime.provider.fetchCandles(symbol, resolution, 100);
  });

  runtime.scanner.on('snapshot', (snapshot) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('scanner:update', snapshot);
    }
  });

  runtime.scanner.on('signal', (signal) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('scanner:signal', signal);
    }
  });
}
