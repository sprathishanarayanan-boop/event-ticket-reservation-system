import { reservationsService } from './reservations.service';
import { config } from '../../config';

let workerInterval: NodeJS.Timeout | null = null;

export function startExpiredHoldsWorker() {
  if (workerInterval) {
    return;
  }

  const intervalMs = config.cleanupIntervalSeconds * 1000;
  console.log(`[Worker] Starting Expired Ticket Holds cleaner worker (Interval: ${config.cleanupIntervalSeconds}s)...`);

  workerInterval = setInterval(async () => {
    try {
      const releasedCount = await reservationsService.releaseExpiredHolds();
      if (releasedCount > 0) {
        console.log(`[Worker] Automatically released ${releasedCount} expired hold(s) and restored ticket inventory.`);
      }
    } catch (err) {
      console.error('[Worker] Error executing expired hold cleaner cycle:', err);
    }
  }, intervalMs);
}

export function stopExpiredHoldsWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[Worker] Expired Ticket Holds cleaner worker stopped.');
  }
}
