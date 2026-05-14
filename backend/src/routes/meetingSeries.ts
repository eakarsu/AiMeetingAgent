import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { getAIClient, parseAIJson } from '../services/aiClient.js';

const router = Router();

const DetectSchema = z.object({
  // Optional explicit name; otherwise the route attempts to discover series automatically.
  name: z.string().min(1).max(200).optional(),
  cadence: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  windowDays: z.coerce.number().int().min(7).max(365).optional().default(60),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  riskLevel: z.enum(['healthy', 'at_risk', 'redundant']).optional(),
});

/**
 * Title-normalisation helper: removes dates, episode numbers, and common
 * recurring-meeting suffixes so meetings of the same series cluster.
 *   "Engineering Standup — Mar 12" → "engineering standup"
 *   "Q2 Roadmap Review #4"          → "q2 roadmap review"
 */
function normalizeMeetingName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[—–-]+\s*[a-z]{3,}\s*\d{1,4}.*$/i, '') // dashes followed by month/day text
    .replace(/#\d+/g, '')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * POST /api/meeting-series/detect
 * Walks recent meetings, clusters by normalised title, and creates/refreshes
 * MeetingSeries rows for any clusters with >=3 meetings inside the window.
 * Then asks AI to analyse decision/action density and assign risk level.
 */
router.post('/detect', validateBody(DetectSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { windowDays } = req.body;
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const meetings = await prisma.meeting.findMany({
      where: { startTime: { gte: cutoff }, userId: req.user!.id },
      include: {
        decisions: { select: { id: true } },
        actionItems: { select: { id: true } },
        participants: { select: { email: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Cluster meetings by normalised title
    const clusters = new Map<
      string,
      Array<(typeof meetings)[number]>
    >();
    for (const m of meetings) {
      const key = normalizeMeetingName(m.title);
      if (!key) continue;
      const arr = clusters.get(key) || [];
      arr.push(m);
      clusters.set(key, arr);
    }

    const results: any[] = [];

    for (const [normName, items] of clusters.entries()) {
      if (items.length < 3) continue;

      // Detect cadence from average interval
      const intervals: number[] = [];
      for (let i = 1; i < items.length; i++) {
        intervals.push(
          (items[i].startTime.getTime() - items[i - 1].startTime.getTime()) /
            (24 * 60 * 60 * 1000)
        );
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let cadence: string = 'monthly';
      if (avgInterval < 2) cadence = 'daily';
      else if (avgInterval < 10) cadence = 'weekly';
      else if (avgInterval < 18) cadence = 'biweekly';

      const totalDecisions = items.reduce((a, m) => a + m.decisions.length, 0);
      const totalActions = items.reduce((a, m) => a + m.actionItems.length, 0);
      const decisionDensity = totalDecisions / items.length;
      const actionDensity = totalActions / items.length;

      // Determine risk level
      let riskLevel = 'healthy';
      if (decisionDensity < 0.3 && actionDensity < 0.5) riskLevel = 'redundant';
      else if (decisionDensity < 1 && actionDensity < 1.5) riskLevel = 'at_risk';

      // Aggregate canonical participants
      const participantSet = new Set<string>();
      items.forEach((m) => m.participants.forEach((p) => participantSet.add(p.email.toLowerCase())));

      // ── Ask AI for narrative analysis ───────────────────────────────────────
      const { client, model } = getAIClient();
      const completion = await client.chat.completions.create({
        model,
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content:
              'You are a meeting-effectiveness analyst. Given a recurring meeting series and density metrics, produce a 3-4 sentence narrative on whether the series is healthy, at risk, or should be cancelled or restructured.',
          },
          {
            role: 'user',
            content: `Series: "${normName}"
Cadence: ${cadence}
Meetings in window: ${items.length}
Avg decisions/meeting: ${decisionDensity.toFixed(2)}
Avg action items/meeting: ${actionDensity.toFixed(2)}
Risk classification: ${riskLevel}

Write the narrative now.`,
          },
        ],
      });
      const aiAnalysis = completion.choices?.[0]?.message?.content?.trim() || '';

      // Upsert by normalised name
      const existing = await prisma.meetingSeries.findFirst({ where: { name: normName } });
      const data = {
        name: normName,
        cadence,
        participants: Array.from(participantSet),
        meetingIds: items.map((m) => m.id),
        decisionDensity,
        actionDensity,
        riskLevel,
        aiAnalysis,
        aiResults: { rawCompletion: completion.choices?.[0]?.message?.content || '', model },
        lastAnalyzedAt: new Date(),
      };

      const series = existing
        ? await prisma.meetingSeries.update({ where: { id: existing.id }, data })
        : await prisma.meetingSeries.create({ data });
      results.push(series);
    }

    res.json({ detected: results.length, series: results });
  } catch (err) {
    console.error('meeting-series detect error:', err);
    res.status(500).json({ error: 'Failed to detect meeting series' });
  }
});

/**
 * GET /api/meeting-series — paginated, filterable
 */
router.get('/', validateQuery(ListQuerySchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { page, limit, riskLevel } = (req as any).parsedQuery as z.infer<typeof ListQuerySchema>;

    const where = riskLevel ? { riskLevel } : {};
    const [items, total] = await Promise.all([
      prisma.meetingSeries.findMany({
        where,
        orderBy: { lastAnalyzedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.meetingSeries.count({ where }),
    ]);

    res.json({
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('meeting-series list error:', err);
    res.status(500).json({ error: 'Failed to list series' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const series = await prisma.meetingSeries.findUnique({ where: { id: req.params.id } });
    if (!series) return res.status(404).json({ error: 'Series not found' });
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

export default router;
