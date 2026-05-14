import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { runAnalyticsJob } from '../jobs/analyticsJob.js';

const router = Router();

/**
 * POST /api/admin/run-analytics
 *
 * Manually triggers the analytics computation job.
 * In production, this would also be called by a cron scheduler.
 * Requires a valid JWT; optionally restrict to admin role here.
 */
router.post('/run-analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Optional: restrict to admin users only
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const start = Date.now();
    await runAnalyticsJob(prisma);
    const durationMs = Date.now() - start;

    res.json({
      message: 'Analytics job completed successfully',
      durationMs,
    });
  } catch (error) {
    console.error('Analytics job error:', error);
    res.status(500).json({ error: 'Analytics job failed' });
  }
});

export default router;
