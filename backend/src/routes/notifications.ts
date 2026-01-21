import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all notifications
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { status } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.id,
        ...(status && { status: status as string })
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Get single notification
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ error: 'Failed to get notification' });
  }
});

// Create notification
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, message, type } = req.body;

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || 'system',
        userId: req.user!.id
      }
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { status: 'read' }
    });

    res.json(notification);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    await prisma.notification.updateMany({
      where: { userId: req.user!.id, status: 'unread' },
      data: { status: 'read' }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Dismiss notification
router.put('/:id/dismiss', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { status: 'dismissed' }
    });

    res.json(notification);
  } catch (error) {
    console.error('Dismiss error:', error);
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.notification.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
