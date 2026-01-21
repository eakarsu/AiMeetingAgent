import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all participants for a meeting
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId } = req.query;

    const participants = await prisma.participant.findMany({
      where: meetingId ? { meetingId: meetingId as string } : undefined,
      include: {
        meeting: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// Get single participant
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const participant = await prisma.participant.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true, startTime: true } }
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json(participant);
  } catch (error) {
    console.error('Get participant error:', error);
    res.status(500).json({ error: 'Failed to get participant' });
  }
});

// Add participant to meeting
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, name, email, role } = req.body;

    const participant = await prisma.participant.create({
      data: {
        meetingId,
        name,
        email,
        role: role || 'attendee'
      },
      include: {
        meeting: { select: { title: true } }
      }
    });

    res.status(201).json(participant);
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

// Update participant
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, email, role, status } = req.body;

    const participant = await prisma.participant.update({
      where: { id: req.params.id },
      data: { name, email, role, status }
    });

    res.json(participant);
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// Remove participant
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.participant.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

export default router;
