import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all integrations
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const integrations = await prisma.integration.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(integrations);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to get integrations' });
  }
});

// Get single integration
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const integration = await prisma.integration.findUnique({
      where: { id: req.params.id }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json(integration);
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(500).json({ error: 'Failed to get integration' });
  }
});

// Create integration
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, type, status, config } = req.body;

    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        status: status || 'disconnected',
        config
      }
    });

    res.status(201).json(integration);
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Update integration (connect/disconnect)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { status, config } = req.body;

    const integration = await prisma.integration.update({
      where: { id: req.params.id },
      data: { status, config }
    });

    res.json(integration);
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Connect integration
router.post('/:id/connect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { config } = req.body;

    const integration = await prisma.integration.update({
      where: { id: req.params.id },
      data: { status: 'connected', config }
    });

    res.json(integration);
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ error: 'Failed to connect integration' });
  }
});

// Disconnect integration
router.post('/:id/disconnect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const integration = await prisma.integration.update({
      where: { id: req.params.id },
      data: { status: 'disconnected', config: Prisma.DbNull }
    });

    res.json(integration);
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

// Delete integration
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.integration.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

export default router;
