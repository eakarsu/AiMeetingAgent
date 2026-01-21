import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all calendar events
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { startDate, endDate } = req.query;

    const events = await prisma.calendarEvent.findMany({
      where: {
        ...(startDate && endDate && {
          startTime: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        })
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(events);
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

// Get single calendar event
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const event = await prisma.calendarEvent.findUnique({
      where: { id: req.params.id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get calendar event error:', error);
    res.status(500).json({ error: 'Failed to get calendar event' });
  }
});

// Create calendar event
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, startTime, endTime, location, isAllDay, recurrence, reminders } = req.body;

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        isAllDay: isAllDay || false,
        recurrence,
        reminders
      }
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Update calendar event
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, startTime, endTime, location, isAllDay, recurrence, reminders } = req.body;

    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        location,
        isAllDay,
        recurrence,
        reminders
      }
    });

    res.json(event);
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// Delete calendar event
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.calendarEvent.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Calendar event deleted successfully' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

export default router;
