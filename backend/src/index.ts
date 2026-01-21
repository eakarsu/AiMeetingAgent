import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

import authRoutes from './routes/auth.js';
import meetingsRoutes from './routes/meetings.js';
import actionItemsRoutes from './routes/actionItems.js';
import participantsRoutes from './routes/participants.js';
import notesRoutes from './routes/notes.js';
import transcriptsRoutes from './routes/transcripts.js';
import agendaRoutes from './routes/agenda.js';
import decisionsRoutes from './routes/decisions.js';
import followUpsRoutes from './routes/followUps.js';
import insightsRoutes from './routes/insights.js';
import templatesRoutes from './routes/templates.js';
import integrationsRoutes from './routes/integrations.js';
import notificationsRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import calendarRoutes from './routes/calendar.js';
import aiRoutes from './routes/ai.js';
import botRoutes from './routes/bot.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available to routes
app.set('prisma', prisma);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/action-items', actionItemsRoutes);
app.use('/api/participants', participantsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/transcripts', transcriptsRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/decisions', decisionsRoutes);
app.use('/api/follow-ups', followUpsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bot', botRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Meeting Agent Backend running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
