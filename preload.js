import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('scannerApi', {
  getRuntimeStatus: () => ipcRenderer.invoke('scanner:get-runtime-status'),
  getWatchlist: () => ipcRenderer.invoke('watchlist:get'),
  addToWatchlist: (symbol) => ipcRenderer.invoke('watchlist:add', symbol),
  removeFromWatchlist: (symbol) => ipcRenderer.invoke('watchlist:remove', symbol),
  updateScannerConfig: (config) => ipcRenderer.invoke('scanner:update-config', config),
  runScanNow: () => ipcRenderer.invoke('scanner:run-now'),
  getChartSeries: (symbol, timeframe) => ipcRenderer.invoke('chart:get-series', { symbol, timeframe }),
  onScannerUpdate: (callback) => {
    const channel = 'scanner:update';
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onSignal: (callback) => {
    const channel = 'scanner:signal';
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
});
