import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all agenda items
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId } = req.query;

    const agendaItems = await prisma.agendaItem.findMany({
      where: meetingId ? { meetingId: meetingId as string } : undefined,
      include: {
        meeting: { select: { title: true } }
      },
      orderBy: [{ meetingId: 'asc' }, { order: 'asc' }]
    });
    res.json(agendaItems);
  } catch (error) {
    console.error('Get agenda items error:', error);
    res.status(500).json({ error: 'Failed to get agenda items' });
  }
});

// Get single agenda item
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const agendaItem = await prisma.agendaItem.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true } }
      }
    });

    if (!agendaItem) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }

    res.json(agendaItem);
  } catch (error) {
    console.error('Get agenda item error:', error);
    res.status(500).json({ error: 'Failed to get agenda item' });
  }
});

// Create agenda item
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, title, description, duration, order } = req.body;

    // Get current max order for the meeting
    const maxOrder = await prisma.agendaItem.aggregate({
      where: { meetingId },
      _max: { order: true }
    });

    const agendaItem = await prisma.agendaItem.create({
      data: {
        meetingId,
        title,
        description,
        duration,
        order: order ?? (maxOrder._max.order || 0) + 1
      },
      include: {
        meeting: { select: { title: true } }
      }
    });

    res.status(201).json(agendaItem);
  } catch (error) {
    console.error('Create agenda item error:', error);
    res.status(500).json({ error: 'Failed to create agenda item' });
  }
});

// Update agenda item
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, duration, order, status } = req.body;

    const agendaItem = await prisma.agendaItem.update({
      where: { id: req.params.id },
      data: { title, description, duration, order, status }
    });

    res.json(agendaItem);
  } catch (error) {
    console.error('Update agenda item error:', error);
    res.status(500).json({ error: 'Failed to update agenda item' });
  }
});

// Delete agenda item
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.agendaItem.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Agenda item deleted successfully' });
  } catch (error) {
    console.error('Delete agenda item error:', error);
    res.status(500).json({ error: 'Failed to delete agenda item' });
  }
});

export default router;
