import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import adminRoutes from './routes/admin.js';
import meetingCoachRoutes from './routes/meetingCoach.js';
import meetingSeriesRoutes from './routes/meetingSeries.js';
import decisionLinksRoutes from './routes/decisionLinks.js';
import customViewsRoutes from './routes/customViews.js';
import decisionReversalRiskRoutes from './routes/decisionReversalRisk.js';

// === BATCH 05 AUTO-MOUNT imports ===
import liveFacilitatorAgentRouter from './routes/live-facilitator-agent';
import multiModalCaptureRouter from './routes/multi-modal-capture';
import actionOrchestrationRouter from './routes/action-orchestration';
import decisionGraphStreamRouter from './routes/decision-graph-stream';
import verticalMeetingIntelRouter from './routes/vertical-meeting-intel';

import { authenticateToken } from './middleware/auth.js';
import { aiRateLimiter } from './middleware/aiRateLimiter.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ── Rate limiting ────────────────────────────────────────────────────────────
// General limit: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// AI endpoints limit: 20 requests per 15 minutes (expensive calls)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait before making more AI requests.' },
});

// ── Helmet (sane production defaults; CSP off because frontend is served separately) ──
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(generalLimiter);
app.use(express.json({ limit: '5mb' }));

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
// AI router uses BOTH a per-IP coarse limiter and a per-user 20/hr limiter (after auth)
app.use('/api/ai', aiLimiter, authenticateToken, aiRateLimiter, aiRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/admin', adminRoutes);

// NEW: Meeting Coach analytics, recurring meeting series intelligence, decision graph
app.use('/api/meeting-coach', authenticateToken, aiRateLimiter, meetingCoachRoutes);
app.use('/api/meeting-series', authenticateToken, aiRateLimiter, meetingSeriesRoutes);
app.use('/api/decision-links', authenticateToken, aiRateLimiter, decisionLinksRoutes);
app.use('/api/decision-reversal-risk', authenticateToken, aiRateLimiter, decisionReversalRiskRoutes);

// Custom Views (Meeting Views) — 4 endpoints used by the CustomViewsPage
app.use('/api/custom-views', customViewsRoutes);

// Version endpoint for ops/observability
app.get('/api/version', (_req, res) => {
  res.json({
    name: 'ai-meeting-agent-backend',
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    uptimeSec: Math.round(process.uptime()),
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Meeting Agent Backend running on http://localhost:${PORT}`);
  // Wire the previously-orphaned analytics cron
  if (process.env.DISABLE_SCHEDULER !== '1') {
    import('./jobs/scheduler.js').then(({ startScheduler }) => startScheduler(prisma));
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };

// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/live-facilitator-agent', liveFacilitatorAgentRouter);
app.use('/api/multi-modal-capture', multiModalCaptureRouter);
app.use('/api/action-orchestration', actionOrchestrationRouter);
app.use('/api/decision-graph-stream', decisionGraphStreamRouter);
app.use('/api/vertical-meeting-intel', verticalMeetingIntelRouter);

// === Batch 05 Gaps & Frontend Mounts ===
try { const _gap_meeting_quality_score = require('./routes/gap-meeting-quality-score'); (app as any).use('/api/gap-meeting-quality-score', _gap_meeting_quality_score.default || _gap_meeting_quality_score); } catch(e) { console.error('gap mount fail meeting-quality-score:', (e as any).message); }
try { const _gap_decision_consensus_check = require('./routes/gap-decision-consensus-check'); (app as any).use('/api/gap-decision-consensus-check', _gap_decision_consensus_check.default || _gap_decision_consensus_check); } catch(e) { console.error('gap mount fail decision-consensus-check:', (e as any).message); }
try { const _gap_next_meeting_optimizer = require('./routes/gap-next-meeting-optimizer'); (app as any).use('/api/gap-next-meeting-optimizer', _gap_next_meeting_optimizer.default || _gap_next_meeting_optimizer); } catch(e) { console.error('gap mount fail next-meeting-optimizer:', (e as any).message); }
try { const _gap_participant_engagement_analyzer = require('./routes/gap-participant-engagement-analyzer'); (app as any).use('/api/gap-participant-engagement-analyzer', _gap_participant_engagement_analyzer.default || _gap_participant_engagement_analyzer); } catch(e) { console.error('gap mount fail participant-engagement-analyzer:', (e as any).message); }
try { const _gap_video = require('./routes/gap-video'); (app as any).use('/api/gap-video', _gap_video.default || _gap_video); } catch(e) { console.error('gap mount fail video:', (e as any).message); }
try { const _gap_in_meeting = require('./routes/gap-in-meeting'); (app as any).use('/api/gap-in-meeting', _gap_in_meeting.default || _gap_in_meeting); } catch(e) { console.error('gap mount fail in-meeting:', (e as any).message); }
try { const _gap_compliance = require('./routes/gap-compliance'); (app as any).use('/api/gap-compliance', _gap_compliance.default || _gap_compliance); } catch(e) { console.error('gap mount fail compliance:', (e as any).message); }
try { const _gap_full_text = require('./routes/gap-full-text'); (app as any).use('/api/gap-full-text', _gap_full_text.default || _gap_full_text); } catch(e) { console.error('gap mount fail full-text:', (e as any).message); }
try { const _gap_long_term = require('./routes/gap-long-term'); (app as any).use('/api/gap-long-term', _gap_long_term.default || _gap_long_term); } catch(e) { console.error('gap mount fail long-term:', (e as any).message); }
try { const _gap_outlook = require('./routes/gap-outlook'); (app as any).use('/api/gap-outlook', _gap_outlook.default || _gap_outlook); } catch(e) { console.error('gap mount fail outlook:', (e as any).message); }
try { const _gap_mobile = require('./routes/gap-mobile'); (app as any).use('/api/gap-mobile', _gap_mobile.default || _gap_mobile); } catch(e) { console.error('gap mount fail mobile:', (e as any).message); }
// === End Batch 05 Mounts ===
