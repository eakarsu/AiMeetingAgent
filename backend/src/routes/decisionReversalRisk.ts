import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const AnalyzeSchema = z.object({
  decisionTitle: z.string().min(3),
  decisionRationale: z.string().min(10),
  meetingSummary: z.string().min(10),
  stakeholders: z.array(z.string()).optional().default([]),
  openRisks: z.array(z.string()).optional().default([]),
  priorDecisionCount: z.coerce.number().int().min(0).max(50).optional().default(0),
  dissentSignals: z.coerce.number().int().min(0).max(20).optional().default(0),
});

router.post('/analyze', async (req: AuthRequest, res: Response) => {
  const parsed = AnalyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid decision reversal risk input', details: parsed.error.flatten() });
  }

  const input = parsed.data;
  const unresolvedRiskWeight = Math.min(30, input.openRisks.length * 6);
  const dissentWeight = Math.min(25, input.dissentSignals * 4);
  const rationaleWeight = input.decisionRationale.length < 180 ? 15 : 4;
  const historyWeight = Math.min(15, input.priorDecisionCount * 2);
  const stakeholderWeight = input.stakeholders.length < 2 ? 10 : Math.max(0, 8 - input.stakeholders.length);
  const score = Math.min(100, unresolvedRiskWeight + dissentWeight + rationaleWeight + historyWeight + stakeholderWeight + 12);

  const band = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const watchpoints = [
    ...(input.openRisks.length ? input.openRisks.slice(0, 4) : ['No explicit open risks were supplied.']),
    ...(input.dissentSignals > 2 ? ['Multiple dissent signals indicate the decision may not be durable.'] : []),
    ...(input.priorDecisionCount > 3 ? ['Several prior related decisions increase override or refinement risk.'] : []),
  ];

  res.json({
    feature: 'Decision Reversal Risk',
    score,
    band,
    leadingIndicators: watchpoints,
    mitigationPlan: [
      'Capture the explicit decision owner, review date, and reversal criteria.',
      'Send a stakeholder confirmation note with unresolved objections listed separately.',
      'Attach assumptions to the decision record so future changes are treated as controlled refinements.',
    ],
    auditFields: {
      stakeholderCount: input.stakeholders.length,
      openRiskCount: input.openRisks.length,
      dissentSignals: input.dissentSignals,
      priorDecisionCount: input.priorDecisionCount,
    },
  });
});

export default router;
