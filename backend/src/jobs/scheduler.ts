import { PrismaClient } from '@prisma/client';
import { runAnalyticsJob } from './analyticsJob.js';

/**
 * Lightweight in-process scheduler — no node-cron dependency required.
 * Runs the analytics job at startup (after 30s) and then every `intervalMs`
 * (default: 6 hours). Catches and logs errors so a failed run does not
 * crash the server.
 */
export function startScheduler(prisma: PrismaClient, intervalMs = 6 * 60 * 60 * 1000): void {
  const tick = async () => {
    try {
      console.log('[scheduler] Running analytics job…');
      await runAnalyticsJob(prisma);
    } catch (err) {
      console.error('[scheduler] analyticsJob failed:', err);
    }
  };

  // Initial run after 30 seconds
  setTimeout(tick, 30 * 1000);
  // Then every intervalMs
  setInterval(tick, intervalMs);
  console.log(`[scheduler] Analytics scheduled every ${Math.round(intervalMs / 60000)}m`);
}
