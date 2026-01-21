import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all meetings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const meetings = await prisma.meeting.findMany({
      where: { userId: req.user!.id },
      include: {
        participants: true,
        _count: {
          select: {
            actionItems: true,
            notes: true,
            agendaItems: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
    res.json(meetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

// Get single meeting
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      include: {
        participants: true,
        actionItems: true,
        notes: { include: { author: { select: { name: true, email: true } } } },
        transcript: true,
        agendaItems: { orderBy: { order: 'asc' } },
        decisions: true,
        followUps: true,
        insights: true
      }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Create meeting
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, startTime, endTime, meetingLink, participants } = req.body;

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetingLink,
        userId: req.user!.id,
        participants: participants ? {
          create: participants.map((p: any) => ({
            name: p.name,
            email: p.email,
            role: p.role || 'attendee'
          }))
        } : undefined
      },
      include: {
        participants: true
      }
    });

    res.status(201).json(meeting);
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Update meeting
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, startTime, endTime, status, meetingLink, recordingUrl } = req.body;

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        status,
        meetingLink,
        recordingUrl
      },
      include: {
        participants: true
      }
    });

    res.json(meeting);
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// Delete meeting
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.meeting.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

export default router;
