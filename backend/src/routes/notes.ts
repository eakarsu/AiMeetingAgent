import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all notes
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId } = req.query;

    const notes = await prisma.meetingNote.findMany({
      where: meetingId ? { meetingId: meetingId as string } : { authorId: req.user!.id },
      include: {
        meeting: { select: { title: true } },
        author: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// Get single note
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const note = await prisma.meetingNote.findUnique({
      where: { id: req.params.id },
      include: {
        meeting: { select: { id: true, title: true } },
        author: { select: { id: true, name: true, email: true } }
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to get note' });
  }
});

// Create note
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, content, type } = req.body;

    const note = await prisma.meetingNote.create({
      data: {
        meetingId,
        content,
        type: type || 'manual',
        authorId: req.user!.id
      },
      include: {
        meeting: { select: { title: true } },
        author: { select: { name: true, email: true } }
      }
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { content } = req.body;

    const note = await prisma.meetingNote.update({
      where: { id: req.params.id },
      data: { content }
    });

    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.meetingNote.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
