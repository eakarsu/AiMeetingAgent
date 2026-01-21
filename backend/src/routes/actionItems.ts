import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all action items
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, status, priority } = req.query;

    const actionItems = await prisma.actionItem.findMany({
      where: {
        ...(meetingId && { meetingId: meetingId as string }),
        ...(status && { status: status as string }),
        ...(priority && { priority: priority as string }),
        OR: [
          { assigneeId: req.user!.id },
          { meeting: { userId: req.user!.id } }
        ]
      },
      include: {
        meeting: { select: { title: true } },
        assignee: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(actionItems);
  } catch (error) {
    console.error('Get action items error:', error);
    res.status(500).json({ error: 'Failed to get action items' });
  }
});

// Get single action item
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const actionItem = await prisma.actionItem.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true, email: true } }
      }
    });

    if (!actionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json(actionItem);
  } catch (error) {
    console.error('Get action item error:', error);
    res.status(500).json({ error: 'Failed to get action item' });
  }
});

// Create action item
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, meetingId, assigneeId, priority, dueDate } = req.body;

    const actionItem = await prisma.actionItem.create({
      data: {
        title,
        description,
        meetingId,
        assigneeId: assigneeId || req.user!.id,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        meeting: { select: { title: true } },
        assignee: { select: { name: true, email: true } }
      }
    });

    res.status(201).json(actionItem);
  } catch (error) {
    console.error('Create action item error:', error);
    res.status(500).json({ error: 'Failed to create action item' });
  }
});

// Update action item
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    const actionItem = await prisma.actionItem.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assigneeId
      },
      include: {
        meeting: { select: { title: true } },
        assignee: { select: { name: true, email: true } }
      }
    });

    res.json(actionItem);
  } catch (error) {
    console.error('Update action item error:', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

// Delete action item
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.actionItem.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Action item deleted successfully' });
  } catch (error) {
    console.error('Delete action item error:', error);
    res.status(500).json({ error: 'Failed to delete action item' });
  }
});

export default router;
