import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all AI insights
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, type } = req.query;

    const insights = await prisma.aIInsight.findMany({
      where: {
        ...(meetingId && { meetingId: meetingId as string }),
        ...(type && { type: type as string }),
        OR: [
          { userId: req.user!.id },
          { meeting: { userId: req.user!.id } }
        ]
      },
      include: {
        meeting: { select: { title: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(insights);
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Get single insight
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const insight = await prisma.aIInsight.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } }
      }
    });

    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json(insight);
  } catch (error) {
    console.error('Get insight error:', error);
    res.status(500).json({ error: 'Failed to get insight' });
  }
});

// Create insight
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, type, content, confidence } = req.body;

    const insight = await prisma.aIInsight.create({
      data: {
        meetingId,
        type,
        content,
        confidence,
        userId: req.user!.id
      },
      include: {
        meeting: { select: { title: true } }
      }
    });

    res.status(201).json(insight);
  } catch (error) {
    console.error('Create insight error:', error);
    res.status(500).json({ error: 'Failed to create insight' });
  }
});

// Delete insight
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.aIInsight.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Insight deleted successfully' });
  } catch (error) {
    console.error('Delete insight error:', error);
    res.status(500).json({ error: 'Failed to delete insight' });
  }
});

export default router;
