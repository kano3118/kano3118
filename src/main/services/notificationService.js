import { Notification } from 'electron';

export function pushSignalNotification(signal) {
  if (signal.action === 'HOLD') return;
  const body = `${signal.symbol} ${signal.action} | Score ${signal.totalScore} | RR ${signal.riskReward.ratio.toFixed(2)}x`;
  new Notification({
    title: 'Scanner Signal',
    body
  }).show();
}
