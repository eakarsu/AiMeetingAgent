import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

// ── Cross-meeting semantic search ────────────────────────────────────────────
const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query (q) is required').max(500, 'Query too long'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * GET /api/meetings/search?q=...
 *
 * Full-text search across meeting titles, descriptions, transcripts, notes,
 * and action item descriptions using PostgreSQL's to_tsvector / plainto_tsquery.
 *
 * Each result includes:
 *   - The matching Meeting row (with basic includes)
 *   - A `snippets` object with highlighted excerpts from whichever fields matched
 *   - A `rank` score for ordering
 */
router.get(
  '/search',
  authenticateToken,
  validateQuery(SearchQuerySchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const prisma: PrismaClient = req.app.get('prisma');
      const { q, limit, offset } = (req as any).parsedQuery as z.infer<typeof SearchQuerySchema>;

      // ── PostgreSQL full-text search via raw query ────────────────────────
      // We search across four text sources:
      //   1. Meeting.title + Meeting.description  (weight A+B)
      //   2. Transcript.content                   (weight B)
      //   3. MeetingNote.content                  (weight C)
      //   4. ActionItem.title + description        (weight C)
      //
      // We join them all with a CTE, compute ts_rank, and return the top hits.
      const searchResults = await prisma.$queryRaw<
        Array<{
          meeting_id: string;
          rank: number;
          title_snippet: string | null;
          transcript_snippet: string | null;
          note_snippet: string | null;
          action_snippet: string | null;
        }>
      >`
        WITH meeting_search AS (
          SELECT
            m.id                                                         AS meeting_id,
            ts_rank(
              to_tsvector('english',
                coalesce(m.title, '') || ' ' ||
                coalesce(m.description, '') || ' ' ||
                coalesce(t.content, '') || ' ' ||
                coalesce(string_agg(DISTINCT mn.content, ' '), '') || ' ' ||
                coalesce(string_agg(DISTINCT (ai.title || ' ' || coalesce(ai.description, '')), ' '), '')
              ),
              plainto_tsquery('english', ${q})
            )                                                            AS rank,
            -- Snippet from title/description
            CASE WHEN to_tsvector('english', coalesce(m.title,'') || ' ' || coalesce(m.description,''))
                        @@ plainto_tsquery('english', ${q})
              THEN ts_headline('english',
                     coalesce(m.title,'') || ' ' || coalesce(m.description,''),
                     plainto_tsquery('english', ${q}),
                     'MaxWords=30, MinWords=10, StartSel=<mark>, StopSel=</mark>')
              ELSE NULL
            END                                                           AS title_snippet,
            -- Snippet from transcript
            CASE WHEN t.content IS NOT NULL AND
                      to_tsvector('english', t.content) @@ plainto_tsquery('english', ${q})
              THEN ts_headline('english', t.content,
                     plainto_tsquery('english', ${q}),
                     'MaxWords=40, MinWords=15, StartSel=<mark>, StopSel=</mark>')
              ELSE NULL
            END                                                           AS transcript_snippet,
            -- Snippet from notes
            CASE WHEN to_tsvector('english', coalesce(string_agg(DISTINCT mn.content, ' '), ''))
                        @@ plainto_tsquery('english', ${q})
              THEN ts_headline('english',
                     coalesce(string_agg(DISTINCT mn.content, ' '), ''),
                     plainto_tsquery('english', ${q}),
                     'MaxWords=40, MinWords=15, StartSel=<mark>, StopSel=</mark>')
              ELSE NULL
            END                                                           AS note_snippet,
            -- Snippet from action items
            CASE WHEN to_tsvector('english',
                        coalesce(string_agg(DISTINCT (ai.title || ' ' || coalesce(ai.description,'')), ' '), ''))
                        @@ plainto_tsquery('english', ${q})
              THEN ts_headline('english',
                     coalesce(string_agg(DISTINCT (ai.title || ' ' || coalesce(ai.description,'')), ' '), ''),
                     plainto_tsquery('english', ${q}),
                     'MaxWords=30, MinWords=10, StartSel=<mark>, StopSel=</mark>')
              ELSE NULL
            END                                                           AS action_snippet
          FROM "Meeting"        m
          LEFT JOIN "Transcript"   t  ON t."meetingId" = m.id
          LEFT JOIN "MeetingNote"  mn ON mn."meetingId" = m.id
          LEFT JOIN "ActionItem"   ai ON ai."meetingId" = m.id
          WHERE
            m."userId" = ${req.user!.id}
            AND (
              to_tsvector('english',
                coalesce(m.title, '') || ' ' ||
                coalesce(m.description, '') || ' ' ||
                coalesce(t.content, '')
              ) @@ plainto_tsquery('english', ${q})
              OR EXISTS (
                SELECT 1 FROM "MeetingNote" mn2
                WHERE mn2."meetingId" = m.id
                  AND to_tsvector('english', mn2.content) @@ plainto_tsquery('english', ${q})
              )
              OR EXISTS (
                SELECT 1 FROM "ActionItem" ai2
                WHERE ai2."meetingId" = m.id
                  AND to_tsvector('english', ai2.title || ' ' || coalesce(ai2.description,''))
                      @@ plainto_tsquery('english', ${q})
              )
            )
          GROUP BY m.id, t.content
          ORDER BY rank DESC
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT * FROM meeting_search
      `;

      if (searchResults.length === 0) {
        return res.json({ results: [], total: 0, query: q });
      }

      // Fetch full meeting rows for the matched IDs (preserves rank order)
      const meetingIds = searchResults.map((r) => r.meeting_id);
      const meetings = await prisma.meeting.findMany({
        where: { id: { in: meetingIds } },
        include: {
          participants: true,
          _count: { select: { actionItems: true, notes: true } },
        },
      });

      // Build a lookup map and merge snippets
      const meetingMap = new Map(meetings.map((m) => [m.id, m]));

      const results = searchResults
        .filter((r) => meetingMap.has(r.meeting_id))
        .map((r) => ({
          meeting: meetingMap.get(r.meeting_id),
          rank: r.rank,
          snippets: {
            ...(r.title_snippet ? { title: r.title_snippet } : {}),
            ...(r.transcript_snippet ? { transcript: r.transcript_snippet } : {}),
            ...(r.note_snippet ? { notes: r.note_snippet } : {}),
            ...(r.action_snippet ? { actionItems: r.action_snippet } : {}),
          },
        }));

      res.json({ results, total: results.length, query: q });
    } catch (error) {
      console.error('Meeting search error:', error);
      res.status(500).json({ error: 'Failed to search meetings' });
    }
  }
);

// Get all meetings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const meetings = await prisma.meeting.findMany({
      where: { userId: req.user!.id },
      include: {
        participants: true,
        _count: {
          select: {
            actionItems: true,
            notes: true,
            agendaItems: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
    res.json(meetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

// Get single meeting
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      include: {
        participants: true,
        actionItems: true,
        notes: { include: { author: { select: { name: true, email: true } } } },
        transcript: true,
        agendaItems: { orderBy: { order: 'asc' } },
        decisions: true,
        followUps: true,
        insights: true
      }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Create meeting
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, startTime, endTime, meetingLink, participants } = req.body;

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetingLink,
        userId: req.user!.id,
        participants: participants ? {
          create: participants.map((p: any) => ({
            name: p.name,
            email: p.email,
            role: p.role || 'attendee'
          }))
        } : undefined
      },
      include: {
        participants: true
      }
    });

    res.status(201).json(meeting);
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Update meeting
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { title, description, startTime, endTime, status, meetingLink, recordingUrl } = req.body;

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        status,
        meetingLink,
        recordingUrl
      },
      include: {
        participants: true
      }
    });

    res.json(meeting);
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// Delete meeting
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.meeting.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

export default router;
