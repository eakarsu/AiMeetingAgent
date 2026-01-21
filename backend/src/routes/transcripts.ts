import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all transcripts
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const transcripts = await prisma.transcript.findMany({
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            startTime: true,
            userId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter to user's meetings
    const userTranscripts = transcripts.filter(t => t.meeting.userId === req.user!.id);
    res.json(userTranscripts);
  } catch (error) {
    console.error('Get transcripts error:', error);
    res.status(500).json({ error: 'Failed to get transcripts' });
  }
});

// Get single transcript
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const transcript = await prisma.transcript.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true, startTime: true, endTime: true } }
      }
    });

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(transcript);
  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

// Create/update transcript for meeting
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, content, language, duration } = req.body;

    const transcript = await prisma.transcript.upsert({
      where: { meetingId },
      create: {
        meetingId,
        content,
        language: language || 'en',
        duration
      },
      update: {
        content,
        language,
        duration
      },
      include: {
        meeting: { select: { title: true } }
      }
    });

    res.status(201).json(transcript);
  } catch (error) {
    console.error('Create transcript error:', error);
    res.status(500).json({ error: 'Failed to create transcript' });
  }
});

// Delete transcript
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.transcript.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Transcript deleted successfully' });
  } catch (error) {
    console.error('Delete transcript error:', error);
    res.status(500).json({ error: 'Failed to delete transcript' });
  }
});

export default router;
