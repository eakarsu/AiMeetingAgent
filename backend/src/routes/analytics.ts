import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all analytics
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { period } = req.query;

    const analytics = await prisma.analytics.findMany({
      where: period ? { period: period as string } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get single analytics record
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const analytics = await prisma.analytics.findUnique({
      where: { id: req.params.id }
    });

    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const [
      meetingsCount,
      actionItemsCount,
      completedActionItems,
      upcomingMeetings
    ] = await Promise.all([
      prisma.meeting.count({ where: { userId: req.user!.id } }),
      prisma.actionItem.count({
        where: {
          OR: [
            { assigneeId: req.user!.id },
            { meeting: { userId: req.user!.id } }
          ]
        }
      }),
      prisma.actionItem.count({
        where: {
          status: 'completed',
          OR: [
            { assigneeId: req.user!.id },
            { meeting: { userId: req.user!.id } }
          ]
        }
      }),
      prisma.meeting.count({
        where: {
          userId: req.user!.id,
          startTime: { gte: new Date() },
          status: 'scheduled'
        }
      })
    ]);

    res.json({
      totalMeetings: meetingsCount,
      totalActionItems: actionItemsCount,
      completedActionItems,
      pendingActionItems: actionItemsCount - completedActionItems,
      upcomingMeetings,
      completionRate: actionItemsCount > 0
        ? Math.round((completedActionItems / actionItemsCount) * 100)
        : 0
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Create analytics record
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { period, meetingsCount, avgDuration, actionItemsRate, attendanceRate, data } = req.body;

    const analytics = await prisma.analytics.create({
      data: {
        period,
        meetingsCount,
        avgDuration,
        actionItemsRate,
        attendanceRate,
        data
      }
    });

    res.status(201).json(analytics);
  } catch (error) {
    console.error('Create analytics error:', error);
    res.status(500).json({ error: 'Failed to create analytics' });
  }
});

// Delete analytics record
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.analytics.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Analytics deleted successfully' });
  } catch (error) {
    console.error('Delete analytics error:', error);
    res.status(500).json({ error: 'Failed to delete analytics' });
  }
});

export default router;
