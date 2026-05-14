import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { getAIClient, parseAIJson } from '../services/aiClient.js';

const router = Router();

const InferSchema = z.object({
  decisionId: z.string().uuid(),
  // How many recent prior decisions to consider when looking for relations
  candidateLimit: z.coerce.number().int().min(5).max(100).optional().default(30),
});

const ListQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  decisionId: z.string().uuid().optional(),
});

/**
 * POST /api/decision-links/infer
 * Asks the AI which prior decisions (within candidateLimit) the given decision
 * overrules / refines / references and persists those edges in DecisionLink.
 */
router.post('/infer', validateBody(InferSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { decisionId, candidateLimit } = req.body;

    const subject = await prisma.decision.findUnique({
      where: { id: decisionId },
      include: { meeting: { select: { title: true, startTime: true } } },
    });
    if (!subject) return res.status(404).json({ error: 'Decision not found' });

    const candidates = await prisma.decision.findMany({
      where: {
        id: { not: decisionId },
        createdAt: { lte: subject.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      take: candidateLimit,
      include: { meeting: { select: { title: true, startTime: true } } },
    });

    const { client, model } = getAIClient();
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content:
            'You are a corporate-governance specialist. Identify which prior decisions a new decision overrules, refines, or references. Be conservative — only emit a link when there is clear topical overlap. Respond with raw JSON only.',
        },
        {
          role: 'user',
          content: `New decision (id=${subject.id}):
Title: ${subject.title}
Description: ${subject.description || ''}

Candidate prior decisions (id, title, description):
${candidates
  .map(
    (c) =>
      `- ${c.id}: ${c.title} — ${c.description?.slice(0, 200) || ''} [meeting: ${c.meeting?.title || 'n/a'}]`
  )
  .join('\n')}

Return JSON of this exact schema:
{
  "links": [
    { "toDecisionId": "uuid", "relationType": "overrules" | "refines" | "references", "confidence": 0.0-1.0, "reason": "short string" }
  ]
}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = parseAIJson<{ links: any[] }>(raw, { links: [] });
    const validRelations = new Set(['overrules', 'refines', 'references']);
    const candidateIds = new Set(candidates.map((c) => c.id));

    const created: any[] = [];
    for (const link of parsed.links || []) {
      if (
        !link?.toDecisionId ||
        !validRelations.has(link.relationType) ||
        !candidateIds.has(link.toDecisionId)
      ) {
        continue;
      }
      try {
        const row = await prisma.decisionLink.upsert({
          where: {
            fromDecisionId_toDecisionId_relationType: {
              fromDecisionId: subject.id,
              toDecisionId: link.toDecisionId,
              relationType: link.relationType,
            },
          },
          update: {
            confidence: Math.max(0, Math.min(1, Number(link.confidence) || 0.5)),
            aiResults: { reason: link.reason, raw, model },
          },
          create: {
            fromDecisionId: subject.id,
            toDecisionId: link.toDecisionId,
            relationType: link.relationType,
            confidence: Math.max(0, Math.min(1, Number(link.confidence) || 0.5)),
            aiResults: { reason: link.reason, raw, model },
          },
        });
        created.push(row);
      } catch (e) {
        console.error('Failed to upsert decision link:', e);
      }
    }

    res.json({ inferred: created.length, links: created });
  } catch (err) {
    console.error('decision-links infer error:', err);
    res.status(500).json({ error: 'Failed to infer decision links' });
  }
});

/**
 * GET /api/decision-links — list edges (paginated)
 */
router.get('/', validateQuery(ListQuery), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { page, limit, decisionId } = (req as any).parsedQuery as z.infer<typeof ListQuery>;

    const where = decisionId
      ? { OR: [{ fromDecisionId: decisionId }, { toDecisionId: decisionId }] }
      : {};
    const [items, total] = await Promise.all([
      prisma.decisionLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.decisionLink.count({ where }),
    ]);

    res.json({
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('decision-links list error:', err);
    res.status(500).json({ error: 'Failed to list decision links' });
  }
});

/**
 * GET /api/decision-links/graph/:decisionId
 * Returns nodes + edges suitable for a small graph visualisation.
 */
router.get('/graph/:decisionId', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { decisionId } = req.params;

    const edges = await prisma.decisionLink.findMany({
      where: { OR: [{ fromDecisionId: decisionId }, { toDecisionId: decisionId }] },
    });
    const nodeIds = new Set<string>([decisionId]);
    edges.forEach((e) => {
      nodeIds.add(e.fromDecisionId);
      nodeIds.add(e.toDecisionId);
    });
    const nodes = await prisma.decision.findMany({
      where: { id: { in: Array.from(nodeIds) } },
      select: { id: true, title: true, status: true, createdAt: true },
    });

    res.json({ nodes, edges });
  } catch (err) {
    console.error('decision-links graph error:', err);
    res.status(500).json({ error: 'Failed to build graph' });
  }
});

export default router;
