import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all follow-ups
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, status } = req.query;

    const followUps = await prisma.followUp.findMany({
      where: {
        ...(meetingId && { meetingId: meetingId as string }),
        ...(status && { status: status as string })
      },
      include: {
        meeting: { select: { title: true, userId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const userFollowUps = followUps.filter(f => f.meeting.userId === req.user!.id);
    res.json(userFollowUps);
  } catch (error) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({ error: 'Failed to get follow-ups' });
  }
});

// Get single follow-up
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const followUp = await prisma.followUp.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true } }
      }
    });

    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json(followUp);
  } catch (error) {
    console.error('Get follow-up error:', error);
    res.status(500).json({ error: 'Failed to get follow-up' });
  }
});

// Create follow-up
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, title, description, dueDate, assignee } = req.body;

    const followUp = await prisma.followUp.create({
      data: {
        meetingId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignee
      },
      include: {
        meeting: { select: { title: true } }
      }
    });

    res.status(201).json(followUp);
  } catch (error) {
    console.error('Create follow-up error:', error);
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

// Update follow-up
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, dueDate, assignee, status } = req.body;

    const followUp = await prisma.followUp.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignee,
        status
      }
    });

    res.json(followUp);
  } catch (error) {
    console.error('Update follow-up error:', error);
    res.status(500).json({ error: 'Failed to update follow-up' });
  }
});

// Delete follow-up
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.followUp.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error('Delete follow-up error:', error);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

export default router;
