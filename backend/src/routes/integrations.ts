import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { google } from 'googleapis';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

// ── Google OAuth helpers ─────────────────────────────────────────────────────

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback'
  );
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

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

// ── Google Calendar OAuth ─────────────────────────────────────────────────────

/**
 * GET /api/integrations/google/auth
 * Returns the Google OAuth consent URL for the client to redirect to.
 */
router.get('/google/auth', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'Google integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }

  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
    // Pass user ID in state so the callback knows which user to update
    state: req.user!.id,
  });

  res.json({ url: authUrl });
});

/**
 * GET /api/integrations/google/callback
 * Called by Google after the user grants consent.
 * Exchanges the code for tokens and persists them in the Integration model.
 */
router.get('/google/callback', async (req: AuthRequest, res: Response) => {
  const { code, state: userId, error } = req.query as Record<string, string>;

  if (error) {
    return res.status(400).json({ error: `Google OAuth error: ${error}` });
  }
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Upsert the google_calendar integration row
    const existing = await prisma.integration.findFirst({
      where: { name: 'google_calendar' },
    });

    const config = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      tokenType: tokens.token_type,
      connectedUserId: userId || null,
    };

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { status: 'connected', config },
      });
    } else {
      await prisma.integration.create({
        data: {
          name: 'google_calendar',
          type: 'calendar',
          status: 'connected',
          config,
        },
      });
    }

    // Redirect to frontend success page (or return JSON if no frontend)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/integrations?google=connected`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).json({ error: 'Failed to exchange authorization code for tokens' });
  }
});

/**
 * POST /api/integrations/google/sync
 * Fetches the next 50 upcoming Google Calendar events and creates/updates
 * Meeting records in the database.
 */
router.post('/google/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const integration = await prisma.integration.findFirst({
      where: { name: 'google_calendar', status: 'connected' },
    });

    if (!integration || !integration.config) {
      return res.status(404).json({
        error: 'Google Calendar is not connected. Complete OAuth first via GET /api/integrations/google/auth',
      });
    }

    const cfg = integration.config as Record<string, any>;

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: cfg.accessToken,
      refresh_token: cfg.refreshToken,
      expiry_date: cfg.expiryDate,
    });

    // Automatically refresh tokens if expired and persist the new tokens
    oauth2Client.on('tokens', async (tokens) => {
      const updatedConfig = {
        ...cfg,
        accessToken: tokens.access_token ?? cfg.accessToken,
        refreshToken: tokens.refresh_token ?? cfg.refreshToken,
        expiryDate: tokens.expiry_date ?? cfg.expiryDate,
      };
      await prisma.integration.update({
        where: { id: integration.id },
        data: { config: updatedConfig },
      });
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: thirtyDaysOut.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = eventsResponse.data.items ?? [];
    const createdMeetings: string[] = [];
    const skippedMeetings: string[] = [];

    for (const event of events) {
      if (!event.start?.dateTime || !event.end?.dateTime) continue; // skip all-day events

      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      const externalId = event.id!;

      // Skip if a meeting with the same external ID already exists (stored in meetingLink)
      const exists = await prisma.meeting.findFirst({
        where: { meetingLink: `google:${externalId}` },
      });

      if (exists) {
        skippedMeetings.push(externalId);
        continue;
      }

      const meeting = await prisma.meeting.create({
        data: {
          title: event.summary || 'Untitled Google Calendar Event',
          description: event.description ?? undefined,
          startTime,
          endTime,
          status: 'scheduled',
          meetingLink: `google:${externalId}`,
          userId: req.user!.id,
          participants: event.attendees
            ? {
                create: event.attendees
                  .filter((a) => a.email)
                  .map((a) => ({
                    name: a.displayName || a.email!,
                    email: a.email!,
                    role: a.organizer ? 'host' : 'attendee',
                    status:
                      a.responseStatus === 'accepted'
                        ? 'accepted'
                        : a.responseStatus === 'declined'
                        ? 'declined'
                        : 'pending',
                  })),
              }
            : undefined,
        },
      });

      createdMeetings.push(meeting.id);
    }

    res.json({
      synced: createdMeetings.length,
      skipped: skippedMeetings.length,
      total: events.length,
      meetingIds: createdMeetings,
    });
  } catch (err) {
    console.error('Google Calendar sync error:', err);
    res.status(500).json({ error: 'Failed to sync Google Calendar events' });
  }
});

export default router;
