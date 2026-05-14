import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { getAIClient, parseAIJson } from '../services/aiClient.js';

const router = Router();

// ── Schemas ─────────────────────────────────────────────────────────────────
const AnalyzeSchema = z.object({
  meetingId: z.string().uuid(),
  transcript: z.string().min(20).max(200_000).optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  meetingId: z.string().uuid().optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Lightweight transcript analytics. Expects transcript lines tagged with a speaker:
 *   "Alice: blah blah\nBob: yeah ok ..."
 * Returns per-speaker speaking-time estimates (by word count → seconds), interruption
 * heuristics (speaker switches mid-sentence, detected via `--` or short next utterance),
 * and monologue counts (>3 consecutive turns or >300 words single utterance).
 */
function computeTranscriptStats(transcript: string) {
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const speakingWords: Record<string, number> = {};
  const interruptions: Record<string, number> = {};
  const monologues: Record<string, number> = {};

  let prevSpeaker: string | null = null;
  let consecutiveTurns: Record<string, number> = {};

  for (const line of lines) {
    const m = line.match(/^([^:]+?):\s*(.+)$/);
    if (!m) continue;
    const speaker = m[1].trim().slice(0, 80);
    const utter = m[2].trim();
    const wc = utter.split(/\s+/).filter(Boolean).length;

    speakingWords[speaker] = (speakingWords[speaker] || 0) + wc;

    // Monologues: utterances longer than 300 words
    if (wc > 300) {
      monologues[speaker] = (monologues[speaker] || 0) + 1;
    }

    // Interruption heuristic: previous utterance ended with "--" then a different speaker
    if (prevSpeaker && prevSpeaker !== speaker && /[-–—]{2,}\s*$/.test(line)) {
      interruptions[speaker] = (interruptions[speaker] || 0) + 1;
    }

    // Track consecutive turns for monologue detection
    if (prevSpeaker === speaker) {
      consecutiveTurns[speaker] = (consecutiveTurns[speaker] || 0) + 1;
      if (consecutiveTurns[speaker] >= 3) {
        monologues[speaker] = (monologues[speaker] || 0) + 1;
        consecutiveTurns[speaker] = 0;
      }
    } else {
      consecutiveTurns = { [speaker]: 1 };
    }

    prevSpeaker = speaker;
  }

  // Convert words → estimated seconds at ~150 wpm = 2.5 words/sec
  const speakingTime: Record<string, number> = {};
  let totalWords = 0;
  for (const [s, w] of Object.entries(speakingWords)) {
    speakingTime[s] = Math.round(w / 2.5);
    totalWords += w;
  }
  const totalDuration = Math.round(totalWords / 2.5);

  // Imbalance score: 0 = perfectly equal, 100 = single speaker dominated
  const speakers = Object.keys(speakingTime);
  let imbalanceScore = 0;
  if (speakers.length > 1 && totalDuration > 0) {
    const ideal = totalDuration / speakers.length;
    const variance =
      speakers.reduce((acc, s) => acc + Math.pow(speakingTime[s] - ideal, 2), 0) /
      speakers.length;
    const stddev = Math.sqrt(variance);
    imbalanceScore = Math.min(100, Math.round((stddev / ideal) * 100));
  }

  return {
    totalDuration,
    participantCount: speakers.length,
    speakingTime,
    interruptionRate: interruptions,
    monologueCount: monologues,
    imbalanceScore,
  };
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/meeting-coach/analyze
 * Compute speaking-time / interruption / monologue stats from a meeting transcript,
 * then ask the AI for coaching insights and persist a MeetingCoachReport row.
 */
router.post('/analyze', validateBody(AnalyzeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId } = req.body;
    let { transcript } = req.body;

    if (!transcript) {
      // Fall back to the stored transcript if none provided in the body
      const stored = await prisma.transcript.findUnique({ where: { meetingId } });
      if (!stored) {
        return res.status(404).json({ error: 'No transcript provided or stored for this meeting' });
      }
      transcript = stored.content;
    }

    const stats = computeTranscriptStats(transcript);

    // ── Ask AI for coaching insights based on the computed stats ───────────────
    const { client, model } = getAIClient();
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content:
            'You are an executive meeting coach. Given speaking-time and participation metrics, identify imbalances, dominant speakers, under-engaged participants, and offer 3-5 actionable recommendations. Respond with raw JSON only.',
        },
        {
          role: 'user',
          content: `Meeting participation metrics:
${JSON.stringify(stats, null, 2)}

Return JSON with this exact schema:
{
  "summary": "2-3 sentence high-level diagnostic",
  "recommendations": ["string", ...],
  "warnings": ["string", ...]
}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const aiInsights = parseAIJson(raw, {
      summary: raw.slice(0, 500),
      recommendations: [],
      warnings: [],
    });

    const report = await prisma.meetingCoachReport.create({
      data: {
        meetingId,
        totalDuration: stats.totalDuration,
        participantCount: stats.participantCount,
        speakingTime: stats.speakingTime,
        interruptionRate: stats.interruptionRate,
        monologueCount: stats.monologueCount,
        imbalanceScore: stats.imbalanceScore,
        aiInsights,
        aiResults: { raw, model },
      },
    });

    res.json({ report, stats, aiInsights });
  } catch (err) {
    console.error('meeting-coach analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze meeting' });
  }
});

/**
 * GET /api/meeting-coach
 * Paginated list of reports, optionally filtered by meetingId.
 */
router.get('/', validateQuery(ListQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { page, limit, meetingId } = (req as any).parsedQuery as z.infer<typeof ListQuerySchema>;

    const where = meetingId ? { meetingId } : {};
    const [items, total] = await Promise.all([
      prisma.meetingCoachReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.meetingCoachReport.count({ where }),
    ]);

    res.json({
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('meeting-coach list error:', err);
    res.status(500).json({ error: 'Failed to list coach reports' });
  }
});

/**
 * GET /api/meeting-coach/:id
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const report = await prisma.meetingCoachReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    console.error('meeting-coach detail error:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

export default router;
