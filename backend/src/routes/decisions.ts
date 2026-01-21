import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all decisions
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, status } = req.query;

    const decisions = await prisma.decision.findMany({
      where: {
        ...(meetingId && { meetingId: meetingId as string }),
        ...(status && { status: status as string })
      },
      include: {
        meeting: { select: { title: true, userId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter to user's meetings
    const userDecisions = decisions.filter(d => d.meeting.userId === req.user!.id);
    res.json(userDecisions);
  } catch (error) {
    console.error('Get decisions error:', error);
    res.status(500).json({ error: 'Failed to get decisions' });
  }
});

// Get single decision
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const decision = await prisma.decision.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true } }
      }
    });

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json(decision);
  } catch (error) {
    console.error('Get decision error:', error);
    res.status(500).json({ error: 'Failed to get decision' });
  }
});

// Create decision
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, title, description, status, madeBy } = req.body;

    const decision = await prisma.decision.create({
      data: {
        meetingId,
        title,
        description,
        status: status || 'approved',
        madeBy
      },
      include: {
        meeting: { select: { title: true } }
      }
    });

    res.status(201).json(decision);
  } catch (error) {
    console.error('Create decision error:', error);
    res.status(500).json({ error: 'Failed to create decision' });
  }
});

// Update decision
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, status, madeBy } = req.body;

    const decision = await prisma.decision.update({
      where: { id: req.params.id },
      data: { title, description, status, madeBy }
    });

    res.json(decision);
  } catch (error) {
    console.error('Update decision error:', error);
    res.status(500).json({ error: 'Failed to update decision' });
  }
});

// Delete decision
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.decision.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Decision deleted successfully' });
  } catch (error) {
    console.error('Delete decision error:', error);
    res.status(500).json({ error: 'Failed to delete decision' });
  }
});

export default router;
