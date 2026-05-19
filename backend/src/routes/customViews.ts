// Custom Views router — supplies data for 4 custom views:
//   1) Meeting Timeline (viz)
//   2) Attendee Network (viz)
//   3) Meeting Summary PDF (non-viz)
//   4) Action Item Extractor (non-viz)
//
// Mounted under /api/custom-views in src/index.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// ───────────────────────────────────────────────────────────────────────────────
// 1) GET /timeline  → recent meetings grouped per "project"
// ───────────────────────────────────────────────────────────────────────────────
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const meetings = await prisma.meeting.findMany({
      orderBy: { startTime: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    // Bucket each meeting into a "project" derived from the first word of the title
    // (so the bar chart can color-group meetings without schema changes).
    const items = meetings.map((m) => {
      const project = (m.title || 'General').split(/[\s\-:]+/)[0] || 'General';
      const start = m.startTime ? new Date(m.startTime).getTime() : Date.now();
      const end = m.endTime ? new Date(m.endTime).getTime() : start + 30 * 60 * 1000;
      const durationMin = Math.max(15, Math.round((end - start) / 60000));
      return {
        id: m.id,
        title: m.title,
        project,
        status: m.status || 'scheduled',
        startTime: m.startTime,
        endTime: m.endTime,
        durationMin,
        // recharts-friendly numeric x-axis (days from earliest)
        startMs: start,
      };
    });

    return res.json({ items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'timeline failed' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 2) GET /attendee-network  → nodes (attendees) + edges (co-attendance weight)
// ───────────────────────────────────────────────────────────────────────────────
router.get('/attendee-network', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const participants = await prisma.participant.findMany({
      select: { id: true, name: true, email: true, meetingId: true, role: true },
    });

    // Build per-meeting attendee lists
    const byMeeting: Record<string, { name: string; email: string }[]> = {};
    for (const p of participants) {
      if (!p.meetingId) continue;
      if (!byMeeting[p.meetingId]) byMeeting[p.meetingId] = [];
      byMeeting[p.meetingId].push({ name: p.name, email: p.email });
    }

    // Nodes keyed by email (fallback to name)
    const nodeMap = new Map<string, { id: string; label: string; count: number }>();
    for (const p of participants) {
      const key = (p.email || p.name || '').toLowerCase();
      if (!key) continue;
      const existing = nodeMap.get(key);
      if (existing) existing.count += 1;
      else nodeMap.set(key, { id: key, label: p.name || p.email, count: 1 });
    }

    // Edges weighted by # of meetings two attendees both attended
    const edgeMap = new Map<string, { source: string; target: string; weight: number }>();
    for (const mId of Object.keys(byMeeting)) {
      const list = byMeeting[mId];
      const ids = Array.from(
        new Set(list.map((p) => (p.email || p.name || '').toLowerCase()).filter(Boolean))
      );
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = [ids[i], ids[j]].sort();
          const k = `${a}::${b}`;
          const existing = edgeMap.get(k);
          if (existing) existing.weight += 1;
          else edgeMap.set(k, { source: a, target: b, weight: 1 });
        }
      }
    }

    const nodes = Array.from(nodeMap.values()).slice(0, 40);
    const allowed = new Set(nodes.map((n) => n.id));
    const edges = Array.from(edgeMap.values()).filter(
      (e) => allowed.has(e.source) && allowed.has(e.target)
    );

    return res.json({ nodes, edges });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'attendee-network failed' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 3a) GET /meetings  → lightweight picker list
// 3b) GET /summary-pdf/:id  → PDF (pdfkit) for chosen meeting
// ───────────────────────────────────────────────────────────────────────────────
router.get('/meetings', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const meetings = await prisma.meeting.findMany({
      orderBy: { startTime: 'desc' },
      take: 50,
      select: { id: true, title: true, startTime: true, status: true },
    });
    return res.json({ meetings });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'meetings list failed' });
  }
});

router.get('/summary-pdf/:id', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        participants: true,
        agendaItems: true,
        decisions: true,
        actionItems: true,
        followUps: true,
      },
    });
    if (!meeting) return res.status(404).json({ error: 'meeting not found' });

    // Lazy require so the route loads even if pdfkit is being installed
    const PDFDocument = (await import('pdfkit')).default as any;
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meeting-${meeting.id}-summary.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(20).text(`Meeting Summary: ${meeting.title}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text(
      `Status: ${meeting.status}   |   ${
        meeting.startTime ? new Date(meeting.startTime).toLocaleString() : 'n/a'
      }`
    );
    doc.moveDown();

    const section = (label: string) => {
      doc.moveDown(0.5);
      doc.fillColor('#000').fontSize(14).text(label, { underline: true });
      doc.fontSize(10).fillColor('#333');
    };

    section('Attendees');
    if (!meeting.participants.length) doc.text('• (none recorded)');
    meeting.participants.forEach((p) =>
      doc.text(`• ${p.name} <${p.email}> — ${p.role}`)
    );

    section('Agenda');
    if (!meeting.agendaItems.length) doc.text('• (no agenda items)');
    meeting.agendaItems.forEach((a: any, i: number) =>
      doc.text(`${i + 1}. ${a.title}${a.description ? ' — ' + a.description : ''}`)
    );

    section('Decisions');
    if (!meeting.decisions.length) doc.text('• (no decisions recorded)');
    meeting.decisions.forEach((d: any) =>
      doc.text(`• ${d.title}${d.description ? ': ' + d.description : ''}`)
    );

    section('Action Items');
    if (!meeting.actionItems.length) doc.text('• (no action items)');
    meeting.actionItems.forEach((a: any) =>
      doc.text(
        `• [${a.status}] ${a.title}${a.dueDate ? ' (due ' + new Date(a.dueDate).toLocaleDateString() + ')' : ''}`
      )
    );

    section('Next Steps / Follow-ups');
    if (!meeting.followUps.length) doc.text('• (no follow-ups scheduled)');
    meeting.followUps.forEach((f: any) =>
      doc.text(`• ${f.title || f.type || 'follow-up'}${f.notes ? ' — ' + f.notes : ''}`)
    );

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#888').text(`Generated ${new Date().toISOString()}`);
    doc.end();
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'pdf generation failed' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// 4) POST /extract-actions  → regex-based action item extraction from transcript
// ───────────────────────────────────────────────────────────────────────────────
router.post('/extract-actions', (req: Request, res: Response) => {
  try {
    const { transcript } = req.body || {};
    if (typeof transcript !== 'string' || transcript.trim().length === 0) {
      return res.status(400).json({ error: 'transcript (string) is required' });
    }

    // Heuristics: split into sentences; lines that look like commitments are kept.
    const sentences = transcript
      .replace(/\r/g, '')
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const actionVerbs =
      /\b(will|shall|should|need(s|ed)? to|must|to do|todo|action|follow[- ]?up|send|prepare|review|draft|create|schedule|finalize|update|share|deliver|investigate|contact|email)\b/i;

    // Owner: "<Name> will/should/needs to ..."  or  "@name", "assigned to <Name>"
    const ownerPatterns = [
      /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|shall|should|needs? to|to)/,
      /assigned\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /@([a-zA-Z][a-zA-Z0-9_.-]+)/,
    ];

    // Due date matchers (very forgiving)
    const datePatterns = [
      /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\bby\s+(tomorrow|today|next week|end of (?:day|week|month))\b/i,
      /\bby\s+([A-Z][a-z]+\s+\d{1,2}(?:,\s*\d{4})?)\b/,
      /\b(\d{4}-\d{2}-\d{2})\b/,
      /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
    ];

    const items: {
      text: string;
      owner: string | null;
      dueDate: string | null;
    }[] = [];

    for (const s of sentences) {
      if (!actionVerbs.test(s)) continue;
      let owner: string | null = null;
      for (const p of ownerPatterns) {
        const m = s.match(p);
        if (m && m[1]) {
          owner = m[1];
          break;
        }
      }
      let dueDate: string | null = null;
      for (const p of datePatterns) {
        const m = s.match(p);
        if (m && m[1]) {
          dueDate = m[1];
          break;
        }
      }
      items.push({ text: s, owner, dueDate });
    }

    return res.json({ count: items.length, items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'extract failed' });
  }
});

export default router;
