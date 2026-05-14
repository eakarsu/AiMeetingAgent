import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

// ── Validation schemas ────────────────────────────────────────────────────────

const TranscriptSchema = z.object({
  meetingId: z.string().uuid().optional(),
  transcript: z.string().min(10, 'Transcript must be at least 10 characters').max(200_000, 'Transcript too long'),
});

const ExtractActionsSchema = TranscriptSchema;

const SentimentSchema = TranscriptSchema;

const TopicsSchema = TranscriptSchema;

const GenerateNotesSchema = TranscriptSchema;

const ExtractDecisionsSchema = TranscriptSchema;

const TranscribeSchema = z.object({
  meetingId: z.string().uuid().optional(),
  rawText: z.string().min(10, 'Raw text must be at least 10 characters').max(200_000, 'Text too long'),
  speakers: z.array(z.string()).optional(),
});

const FollowUpEmailSchema = z.object({
  meetingTitle: z.string().min(1, 'Meeting title is required').max(500),
  summary: z.string().min(1, 'Summary is required').max(50_000),
  actionItems: z.array(z.any()).optional(),
  recipients: z.array(z.string()).optional(),
});

const SuggestAgendaSchema = z.object({
  meetingTitle: z.string().min(1, 'Meeting title is required').max(500),
  context: z.string().max(10_000).optional(),
  previousMeetings: z.string().max(10_000).optional(),
});

const ChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10_000),
  context: z.string().max(50_000).optional(),
});

const DailyPlannerSchema = z.object({
  date: z.string().optional(),
  meetings: z.array(z.any()).optional(),
  actionItems: z.array(z.any()).optional(),
  priorities: z.string().max(2_000).optional(),
});

const DraftFollowupSchema = z.object({
  meetingTitle: z.string().min(1, 'Meeting title is required').max(500),
  summary: z.string().max(50_000).optional(),
  actionItems: z.array(z.any()).optional(),
  decisions: z.array(z.any()).optional(),
  recipients: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'formal']).optional(),
});

const GenerateSummarySchema = z.object({
  meetingId: z.string().uuid().optional(),
  transcript: z.string().min(10, 'Transcript must be at least 10 characters').max(200_000, 'Transcript too long'),
  format: z.enum(['executive', 'detailed', 'bullet', 'email', 'slack']).optional(),
});

const MeetingQualityScoreSchema = TranscriptSchema;

const ParticipantEngagementSchema = TranscriptSchema;

const DecisionConsensusCheckSchema = TranscriptSchema;

const NextMeetingOptimizerSchema = z.object({
  meetingId: z.string().uuid().optional(),
  meetingSeriesTitle: z.string().min(1).max(500),
  recentMeetingSummaries: z.array(z.string().max(20_000)).min(1, 'Provide at least one prior meeting summary').max(20),
  upcomingAgendaDraft: z.string().max(20_000).optional(),
  participants: z.array(z.string()).optional(),
  cadence: z.enum(['weekly', 'biweekly', 'monthly', 'adhoc']).optional(),
});

const router = Router();

// Robustly parse JSON from AI responses — handles code fences, preamble text, etc.
const parseAIJson = (text: string, fallback: any): any => {
  const cleaned = text.trim();

  // 1. Try direct parse (ideal case: AI returned pure JSON)
  try { return JSON.parse(cleaned); } catch {}

  // 2. Strip markdown code fences and try again
  const stripped = cleaned
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
  try { return JSON.parse(stripped); } catch {}

  // 3. Find the outermost JSON structure using bracket-depth tracking
  //    This correctly handles braces inside quoted strings
  const firstBrace = stripped.indexOf('{');
  const firstBracket = stripped.indexOf('[');
  let startIdx: number;
  let openCh: string;
  let closeCh: string;
  if (firstBrace === -1 && firstBracket === -1) return fallback;
  if (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket)) {
    startIdx = firstBrace; openCh = '{'; closeCh = '}';
  } else {
    startIdx = firstBracket; openCh = '['; closeCh = ']';
  }

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = startIdx; i < stripped.length; i++) {
    const c = stripped[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === openCh) depth++;
    else if (c === closeCh) depth--;
    if (depth === 0) {
      try { return JSON.parse(stripped.substring(startIdx, i + 1)); } catch {}
      return fallback;
    }
  }

  return fallback;
};

class NoApiKeyError extends Error {
  code = 'NO_API_KEY';
  constructor() { super('AI service unavailable: no LLM API key configured'); }
}

const hasLLMKey = (): boolean => {
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey && !orKey.includes('your-')) return true;
  const oaKey = process.env.OPENAI_API_KEY;
  if (oaKey && !oaKey.includes('your-')) return true;
  return false;
};

// Initialize AI client - uses OPENROUTER_MODEL from env
const getAIClient = () => {
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

  // Use OpenRouter if OPENROUTER_API_KEY is set and not a placeholder
  if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('your-')) {
    return {
      client: new OpenAI({
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Meeting Agent'
        }
      }),
      model
    };
  }

  // Fallback to OpenAI with fallback model
  return {
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    }),
    model: 'gpt-4o-mini'
  };
};

// Generate meeting summary
router.post('/summarize', authenticateToken, validateBody(TranscriptSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a senior meeting analyst with 15+ years of experience summarizing executive and team meetings. Your summaries are known for being concise yet comprehensive, capturing every important nuance.

Instructions:
- Identify the meeting type (standup, planning, review, brainstorm, etc.)
- Capture ALL key decisions, not just the obvious ones
- Note any unresolved tensions or disagreements
- Highlight commitments people made (even informal ones)
- Use specific names, numbers, and dates when mentioned
- Structure the summary with clear sections

Return ONLY a plain text summary with clear sections using markdown headers. No JSON, no code fences. Include:
## Meeting Overview
## Key Discussion Points
## Decisions Made
## Action Items
## Open Questions / Parking Lot
## Next Steps`
        },
        {
          role: 'user',
          content: `Please summarize the following meeting transcript:\n\n${transcript}`
        }
      ],
      max_tokens: 4096
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';

    // Always save as AI insight
    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'summary',
        content: summary,
        confidence: 0.9,
        userId: req.user!.id
      }
    });

    res.json({ summary, savedId: saved.id });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Extract action items from transcript
router.post('/extract-actions', authenticateToken, validateBody(ExtractActionsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert project manager who excels at identifying action items from meeting discussions. You catch both explicit commitments ("I'll do X by Friday") and implicit ones ("We should probably look into Y").

Instructions:
- Extract EVERY action item, even subtle ones
- Assign the correct person if mentioned by name
- Infer priority from context and urgency cues
- Extract deadlines when mentioned, even relative ones ("next week" → calculate from today)
- Include the context of WHY the action item exists
- Be specific — "Review the Q3 budget proposal" not "Review budget"

Return ONLY a valid JSON array (no markdown, no code fences). Each item must have:
[
  {
    "title": "Clear, actionable title starting with a verb",
    "description": "Context and details about what needs to be done",
    "assignee": "Person's name if mentioned, or null",
    "priority": "low | medium | high",
    "dueDate": "ISO date string if mentioned, or null"
  }
]`
        },
        {
          role: 'user',
          content: `Extract all action items from this meeting transcript. Return ONLY a valid JSON array:\n\n${transcript}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '[]';
    let actionItems = parseAIJson(rawContent, []);
    if (!Array.isArray(actionItems)) actionItems = [];

    // Always save action items
    const savedIds: string[] = [];
    if (actionItems.length > 0) {
      for (const item of actionItems) {
        const saved = await prisma.actionItem.create({
          data: {
            meetingId: meetingId || undefined,
            title: item.title,
            description: item.description,
            priority: item.priority || 'medium',
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            assigneeId: req.user!.id
          }
        });
        savedIds.push(saved.id);
      }
    }

    res.json({ actionItems, savedIds });
  } catch (error) {
    console.error('Extract actions error:', error);
    res.status(500).json({ error: 'Failed to extract action items' });
  }
});

// Analyze sentiment
router.post('/sentiment', authenticateToken, validateBody(SentimentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an organizational psychologist specializing in team dynamics and communication analysis. You can detect subtle emotional undercurrents, passive-aggressive communication, genuine enthusiasm, and hidden frustrations.

Instructions:
- Analyze the overall emotional tone of the meeting
- Identify sentiment shifts throughout the conversation
- Note individual speaker sentiments when possible
- Detect signs of agreement, disagreement, enthusiasm, frustration, or confusion
- Score from 0 (extremely negative) to 100 (extremely positive), with 50 being neutral
- Provide specific quotes or moments as evidence

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "overall": "positive | negative | neutral | mixed",
  "score": 0-100,
  "highlights": [
    {
      "text": "Description of the notable moment",
      "sentiment": "positive | negative | neutral",
      "speaker": "Name if identifiable",
      "significance": "Why this moment matters"
    }
  ],
  "teamDynamics": "Brief assessment of team collaboration quality",
  "concerns": ["Any red flags or concerns about team morale"]
}`
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this meeting transcript:\n\n${transcript}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const sentiment = parseAIJson(rawContent, { overall: 'neutral', score: 50, highlights: [] });

    // Always save as AI insight
    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'sentiment',
        content: JSON.stringify(sentiment),
        confidence: (sentiment.score || 50) / 100,
        userId: req.user!.id
      }
    });

    res.json({ sentiment, savedId: saved.id });
  } catch (error) {
    console.error('Sentiment error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Extract key topics
router.post('/topics', authenticateToken, validateBody(TopicsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a meeting intelligence analyst who maps the knowledge landscape of conversations. You identify not just what was discussed, but how topics connect, which ones generated the most engagement, and which need further exploration.

Instructions:
- Identify ALL distinct topics discussed (aim for 4-8 topics)
- Rate importance based on time spent, number of speakers, and decision impact
- Estimate time allocation as percentages (should sum to ~100%)
- Extract 2-5 key points per topic
- Note how topics relate to each other
- Identify topics that were raised but not fully addressed

Return ONLY a valid JSON array (no markdown, no code fences):
[
  {
    "topic": "Clear, descriptive topic name",
    "importance": 1-10,
    "timeSpent": "percentage as number (e.g., 25)",
    "keyPoints": ["Specific point 1", "Specific point 2"],
    "speakers": ["Names of people who discussed this"],
    "status": "resolved | ongoing | needs-follow-up",
    "relatedTopics": ["Other topic names this connects to"]
  }
]`
        },
        {
          role: 'user',
          content: `Extract the key topics from this meeting transcript:\n\n${transcript}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '[]';
    let topics = parseAIJson(rawContent, []);
    if (!Array.isArray(topics)) topics = [];

    // Always save as AI insight
    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'key_topics',
        content: JSON.stringify(topics),
        confidence: 0.85,
        userId: req.user!.id
      }
    });

    res.json({ topics, savedId: saved.id });
  } catch (error) {
    console.error('Topics error:', error);
    res.status(500).json({ error: 'Failed to extract topics' });
  }
});

// Generate follow-up email
router.post('/follow-up-email', authenticateToken, validateBody(FollowUpEmailSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingTitle, summary, actionItems, recipients } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a senior executive communications specialist who crafts follow-up emails that drive action and accountability. Your emails are known for being clear, professional, and effective at getting results.

Instructions:
- Write a professional follow-up email that people actually want to read
- Start with a brief, engaging summary (not "This email is to summarize...")
- Clearly list action items with owners and deadlines
- Use bold for names and deadlines for scannability
- Include a "Next Steps" section
- Keep the tone professional but warm
- End with a clear call to action
- Include a subject line

Return the email as plain text with the subject line on the first line prefixed with "Subject: "`
        },
        {
          role: 'user',
          content: `Generate a follow-up email for this meeting:
Title: ${meetingTitle}
Recipients: ${recipients?.join(', ') || 'Team'}
Summary: ${summary}
Action Items: ${JSON.stringify(actionItems || [])}`
        }
      ],
      max_tokens: 4096
    });

    const email = completion.choices[0]?.message?.content || 'Unable to generate email';

    // Save as AI insight
    const saved = await prisma.aIInsight.create({
      data: {
        type: 'follow_up_email',
        content: email,
        confidence: 0.9,
        userId: req.user!.id
      }
    });

    res.json({ email, savedId: saved.id });
  } catch (error) {
    console.error('Follow-up email error:', error);
    res.status(500).json({ error: 'Failed to generate follow-up email' });
  }
});

// Suggest agenda items
router.post('/suggest-agenda', authenticateToken, validateBody(SuggestAgendaSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingTitle, context, previousMeetings } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a meeting facilitation expert with deep experience in running effective, outcome-driven meetings. You design agendas that maximize meeting productivity and ensure all critical topics are addressed.

Instructions:
- Suggest 5-8 well-structured agenda items
- Order them strategically (warm-up → critical decisions → creative discussion → wrap-up)
- Include realistic time estimates that account for discussion
- Add a "buffer" or "open discussion" slot
- Ensure each item has a clear purpose and expected outcome
- Consider including a quick wins section early for momentum
- End with clear next steps / action items review

Return ONLY a valid JSON array (no markdown, no code fences):
[
  {
    "title": "Clear agenda item title",
    "description": "What will be discussed and the expected outcome",
    "estimatedDuration": 10,
    "priority": 1-5,
    "type": "discussion | decision | update | brainstorm | review",
    "expectedOutcome": "What success looks like for this item"
  }
]`
        },
        {
          role: 'user',
          content: `Suggest agenda items for this meeting:
Title: ${meetingTitle}
Context: ${context || 'General meeting'}
Previous meetings context: ${previousMeetings || 'None provided'}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '[]';
    let suggestions = parseAIJson(rawContent, []);
    if (!Array.isArray(suggestions)) suggestions = [];

    // Save as AgendaItem records
    const savedIds: string[] = [];
    if (suggestions.length > 0) {
      for (let i = 0; i < suggestions.length; i++) {
        const item = suggestions[i];
        const saved = await prisma.agendaItem.create({
          data: {
            title: item.title,
            description: item.description,
            duration: item.estimatedDuration || null,
            order: i + 1,
            status: 'pending'
          }
        });
        savedIds.push(saved.id);
      }
    }

    res.json({ suggestions, savedIds });
  } catch (error) {
    console.error('Suggest agenda error:', error);
    res.status(500).json({ error: 'Failed to suggest agenda items' });
  }
});

// Chat with AI about meetings
router.post('/chat', authenticateToken, validateBody(ChatSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { message, context } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a senior meeting productivity consultant and AI assistant with deep expertise in:
- Meeting facilitation and best practices
- Team dynamics and communication
- Productivity optimization and time management
- Agenda design and meeting structure
- Action item tracking and accountability
- Remote/hybrid meeting challenges
- Meeting analytics and improvement

Provide thoughtful, specific, actionable advice. Use examples when helpful. If the question is about a specific meeting, reference details from the context provided. Be conversational but professional.${context ? `\n\nContext: ${context}` : ''}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 4096
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I was unable to process your request.';

    // Save chat exchange as AI insight
    const saved = await prisma.aIInsight.create({
      data: {
        type: 'chat_response',
        content: JSON.stringify({ question: message, response }),
        confidence: 0.85,
        userId: req.user!.id
      }
    });

    res.json({ response, savedId: saved.id });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Generate meeting notes from transcript
router.post('/generate-notes', authenticateToken, validateBody(GenerateNotesSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert note-taker who has documented thousands of high-stakes meetings for Fortune 500 companies. Your notes are legendary for capturing not just what was said, but the context, nuance, and implications.

Instructions:
- Use clear markdown formatting with headers, bullets, and bold text
- Organize by topic, not chronologically
- Capture the "why" behind discussions, not just the "what"
- Include direct quotes for important statements
- Note any disagreements or alternative viewpoints
- Flag items that need follow-up or clarification
- Include an "Attendees" section if names are mentioned
- End with a "Key Takeaways" section (3-5 bullet points)

Structure:
# Meeting Notes
## Attendees (if identifiable)
## Key Discussion Points
## Decisions Made
## Action Items
## Open Issues
## Key Takeaways`
        },
        {
          role: 'user',
          content: `Generate comprehensive meeting notes from this transcript:\n\n${transcript}`
        }
      ],
      max_tokens: 4096
    });

    const notes = completion.choices[0]?.message?.content || 'Unable to generate notes';

    // Always save notes
    const saved = await prisma.meetingNote.create({
      data: {
        meetingId: meetingId || undefined,
        content: notes,
        type: 'ai_generated',
        authorId: req.user!.id
      }
    });

    res.json({ notes, savedId: saved.id });
  } catch (error) {
    console.error('Generate notes error:', error);
    res.status(500).json({ error: 'Failed to generate notes' });
  }
});

// AI Daily Planner - Generate daily plan based on meetings and tasks
router.post('/daily-planner', authenticateToken, validateBody(DailyPlannerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { date, meetings, actionItems, priorities } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a world-class productivity coach who designs optimal daily schedules. You understand energy management, deep work principles, and the science of peak performance. Your schedules account for cognitive load, meeting fatigue, and natural energy rhythms.

Instructions:
- Create a realistic, hour-by-hour schedule from 8 AM to 6 PM
- Place high-cognitive tasks during peak energy hours (usually 9-11 AM)
- Schedule breaks every 90 minutes (Pomodoro-style)
- Account for meeting prep time (15 min before important meetings)
- Include lunch and short breaks
- Leave buffer time for unexpected issues
- Warn about back-to-back meeting risks
- Consider context-switching costs

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "schedule": [
    {
      "time": "HH:MM",
      "duration": 30,
      "activity": "Clear description of what to do",
      "type": "meeting | task | break | focus",
      "priority": "high | medium | low",
      "notes": "Additional context or tips"
    }
  ],
  "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
  "suggestions": ["Actionable productivity suggestion"],
  "estimatedProductivity": 75,
  "warnings": ["Any scheduling concerns"]
}`
        },
        {
          role: 'user',
          content: `Create an optimized daily plan for ${date || 'today'}:
Meetings: ${JSON.stringify(meetings || [])}
Action Items: ${JSON.stringify(actionItems || [])}
Priority Focus: ${priorities || 'Balance meetings with deep work time'}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const defaultPlan = { schedule: [], topPriorities: [], suggestions: [], estimatedProductivity: 70, warnings: [] };
    const dailyPlan = parseAIJson(rawContent, defaultPlan);

    // Save as AI insight
    const saved = await prisma.aIInsight.create({
      data: {
        type: 'daily_plan',
        content: JSON.stringify(dailyPlan),
        confidence: 0.8,
        userId: req.user!.id
      }
    });

    res.json({ dailyPlan, rawResponse: rawContent, savedId: saved.id });
  } catch (error) {
    console.error('Daily planner error:', error);
    res.status(500).json({ error: 'Failed to generate daily plan' });
  }
});

// AI Decision Logger - Extract and structure decisions from meeting content
router.post('/extract-decisions', authenticateToken, validateBody(ExtractDecisionsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a governance and decision-tracking specialist. You identify decisions — both explicit votes/agreements and implicit consensus — in meeting conversations. You understand the difference between a decision, a suggestion, and an action item.

Instructions:
- Identify ALL decisions, including informal consensus ("So we're all agreed that...")
- Distinguish between final decisions and proposals still being discussed
- Capture who made or championed each decision
- Note the rationale and any dissenting opinions
- Assess the impact level based on scope, cost, and reversibility
- Include concrete next steps for each decision
- If no clear decisions were made, identify the closest things to decisions

Return ONLY a valid JSON array (no markdown, no code fences):
[
  {
    "title": "Clear, concise decision statement",
    "description": "Full context of what was decided and why",
    "status": "approved | proposed | rejected | deferred",
    "madeBy": "Name of person who made/proposed it",
    "rationale": "The reasoning behind this decision",
    "impact": "high | medium | low",
    "nextSteps": ["Concrete next step 1", "Concrete next step 2"],
    "relatedTopics": ["Related topic or project"]
  }
]`
        },
        {
          role: 'user',
          content: `Extract all decisions from this meeting content:\n\n${transcript}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '[]';
    let decisions: any[] = parseAIJson(rawContent, []);
    if (!Array.isArray(decisions)) decisions = [];

    // Always save decisions
    const savedIds: string[] = [];
    if (decisions.length > 0) {
      for (const decision of decisions) {
        const saved = await prisma.decision.create({
          data: {
            meetingId: meetingId || undefined,
            title: decision.title,
            description: decision.description,
            status: decision.status || 'proposed',
            madeBy: decision.madeBy || 'Team'
          }
        });
        savedIds.push(saved.id);
      }
    }

    res.json({ decisions, savedIds });
  } catch (error) {
    console.error('Extract decisions error:', error);
    res.status(500).json({ error: 'Failed to extract decisions' });
  }
});

// AI Transcriber - Clean up and format raw transcript
router.post('/transcribe', authenticateToken, validateBody(TranscribeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, rawText, speakers } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a professional transcription editor who transforms raw, messy transcripts into polished, readable documents. You fix grammar while preserving the speaker's voice, identify speakers accurately, and organize content logically.

Instructions:
- Fix grammar, punctuation, and filler words (um, uh, like, you know)
- Identify and consistently label speakers throughout
- Add paragraph breaks at topic transitions
- Preserve important pauses or emotional moments with [brackets]
- Estimate speaking time per person based on content volume
- Identify the main topics covered
- Assess transcript quality based on coherence and completeness

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "formattedTranscript": "The full cleaned-up transcript with speaker labels",
  "speakers": [
    {
      "name": "Speaker name or identifier",
      "speakingTime": "Estimated percentage or duration",
      "mainPoints": ["Key point they raised"]
    }
  ],
  "duration": "Estimated meeting duration",
  "quality": "excellent | good | fair | poor",
  "topics": ["Topic 1", "Topic 2"]
}`
        },
        {
          role: 'user',
          content: `Format this raw meeting transcript${speakers ? ` (Speakers: ${speakers.join(', ')})` : ''}:\n\n${rawText}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const defaultResult = { formattedTranscript: rawText, speakers: [], duration: 'Unknown', quality: 'good', topics: [] };
    const result = parseAIJson(rawContent, defaultResult);

    // Save as AI insight (transcript table requires unique meetingId, so use insight)
    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'formatted_transcript',
        content: JSON.stringify(result),
        confidence: result.quality === 'excellent' ? 0.95 : result.quality === 'good' ? 0.85 : result.quality === 'fair' ? 0.7 : 0.5,
        userId: req.user!.id
      }
    });

    res.json({ transcript: result, savedId: saved.id });
  } catch (error) {
    console.error('Transcribe error:', error);
    res.status(500).json({ error: 'Failed to process transcript' });
  }
});

// AI Follow-up Drafter - Generate comprehensive follow-up communications
router.post('/draft-followup', authenticateToken, validateBody(DraftFollowupSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingTitle, summary, actionItems, decisions, recipients, tone } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a senior communications director who creates comprehensive post-meeting follow-up packages. Your communications drive accountability, ensure alignment, and move projects forward. You craft messages tailored to each channel.

Instructions:
- Create a professional email with clear subject, body, and priority
- Craft a concise Slack message that's scannable and action-oriented
- Write an executive summary for leadership (2-3 sentences max)
- Extract clear key takeaways (3-5 bullet points)
- Identify all deadlines with task, assignee, and date
- Suggest agenda items for the next meeting based on open items
- Adjust tone based on the requested tone setting

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "email": {
    "subject": "Clear, specific subject line",
    "body": "Full email body with formatting",
    "priority": "high | normal | low"
  },
  "slackMessage": "Concise Slack-formatted message with bold and bullets",
  "executiveSummary": "2-3 sentence summary for leadership",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
  "deadlines": [
    {
      "task": "What needs to be done",
      "assignee": "Who is responsible",
      "dueDate": "When it's due"
    }
  ],
  "nextMeetingAgenda": ["Agenda item for follow-up meeting"]
}`
        },
        {
          role: 'user',
          content: `Draft follow-up communications for this meeting:
Title: ${meetingTitle}
Recipients: ${recipients?.join(', ') || 'Team'}
Tone: ${tone || 'professional'}
Summary: ${summary || 'No summary provided'}
Action Items: ${JSON.stringify(actionItems || [])}
Decisions: ${JSON.stringify(decisions || [])}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const defaultFollowUp = {
      email: { subject: '', body: '', priority: 'normal' },
      slackMessage: '',
      executiveSummary: '',
      keyTakeaways: [],
      deadlines: [],
      nextMeetingAgenda: []
    };
    const followUp = parseAIJson(rawContent, defaultFollowUp);

    // Save follow-up items from deadlines as FollowUp records
    const savedIds: string[] = [];
    if (followUp.deadlines?.length > 0) {
      for (const deadline of followUp.deadlines) {
        const saved = await prisma.followUp.create({
          data: {
            title: deadline.task,
            description: `Assignee: ${deadline.assignee || 'TBD'}`,
            assignee: deadline.assignee || null,
            dueDate: deadline.dueDate ? new Date(deadline.dueDate) : null,
            status: 'pending'
          }
        });
        savedIds.push(saved.id);
      }
    }

    // Also save the full response as AI insight
    const insightSaved = await prisma.aIInsight.create({
      data: {
        type: 'draft_followup',
        content: JSON.stringify(followUp),
        confidence: 0.88,
        userId: req.user!.id
      }
    });
    savedIds.push(insightSaved.id);

    res.json({ followUp, savedIds });
  } catch (error) {
    console.error('Draft follow-up error:', error);
    res.status(500).json({ error: 'Failed to draft follow-up' });
  }
});

// AI Summary Generator - Multiple summary formats
router.post('/generate-summary', authenticateToken, validateBody(GenerateSummarySchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript, format } = req.body;

    const { client, model } = getAIClient();

    const formatInstructions: Record<string, string> = {
      executive: 'Create a brief executive summary (2-3 paragraphs) for C-level readers. Focus on business impact, key decisions, and strategic implications. Skip tactical details.',
      detailed: 'Create a comprehensive, detailed summary covering every discussion point, decision, and action item. Include context and nuance. This is the "official record" of the meeting.',
      bullet: 'Create a scannable bullet-point summary organized by topic. Use nested bullets for sub-points. Perfect for quick reference and meeting archives.',
      email: 'Create a summary formatted for email distribution to stakeholders who weren\'t present. Include enough context for them to understand without having attended.',
      slack: 'Create a concise summary suitable for Slack. Use bold, bullets, and emoji sparingly. Keep it under 500 words. Prioritize action items and decisions.'
    };

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a senior meeting analyst who creates perfectly formatted meeting summaries. You adapt your style to match the requested format while never losing important information.

${formatInstructions[format] || formatInstructions.detailed}

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "summary": "The full formatted summary text",
  "format": "${format || 'detailed'}",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Action item with owner and deadline"],
  "participants": ["Name 1", "Name 2"],
  "duration": "Estimated meeting duration",
  "nextSteps": ["Next step 1", "Next step 2"]
}`
        },
        {
          role: 'user',
          content: `Generate a ${format || 'detailed'} summary of this meeting:\n\n${transcript}`
        }
      ],
      max_tokens: 4096
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const defaultSummary = { summary: '', format: format || 'detailed', keyPoints: [], decisions: [], actionItems: [], participants: [], duration: '', nextSteps: [] };
    const result = parseAIJson(rawContent, defaultSummary);
    if (!result.summary && typeof rawContent === 'string') result.summary = rawContent;

    // Always save as AI insight
    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'summary',
        content: JSON.stringify(result),
        confidence: 0.92,
        userId: req.user!.id
      }
    });

    res.json({ result, savedId: saved.id });
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ── NEW: SSE streaming summary endpoint ────────────────────────────────────
// Streams summary tokens to the client as they arrive from the AI provider so
// the UI can render text progressively instead of waiting for full completion.
function sseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}
function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post('/stream-summary', authenticateToken, validateBody(TranscriptSchema), async (req: AuthRequest, res: Response) => {
  sseHeaders(res);
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;
    const { client, model } = getAIClient();

    let fullText = '';
    const stream = await client.chat.completions.create({
      model,
      stream: true,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: 'You are an expert meeting summarizer. Produce a clear, well-structured summary in markdown.' },
        { role: 'user', content: `Summarize this meeting transcript:\n\n${transcript}` },
      ],
    });

    for await (const chunk of stream as any) {
      const token: string = chunk?.choices?.[0]?.delta?.content || '';
      if (token) {
        sseWrite(res, 'token', { token });
        fullText += token;
      }
    }

    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'summary',
        content: fullText,
        confidence: 0.9,
        userId: req.user!.id,
      },
    });

    sseWrite(res, 'done', { savedId: saved.id });
    res.end();
  } catch (err: any) {
    console.error('stream-summary error:', err);
    sseWrite(res, 'error', { error: err?.message || 'streaming failed' });
    res.end();
  }
});

// Meeting quality score — assess effectiveness
router.post('/meeting-quality-score', authenticateToken, validateBody(MeetingQualityScoreSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;
    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a meeting effectiveness coach. Score meeting quality and recommend improvements.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "overall_score": 0-100,
  "dimensions": {
    "clarity_of_purpose": 0-100,
    "decision_quality": 0-100,
    "action_orientation": 0-100,
    "time_efficiency": 0-100,
    "participation_balance": 0-100
  },
  "strengths": [string],
  "improvement_areas": [{"area": string, "evidence": string, "recommendation": string}],
  "next_meeting_suggestions": [string]
}`,
        },
        { role: 'user', content: `Score this meeting transcript:\n\n${transcript}` },
      ],
      max_tokens: 2048,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const quality = parseAIJson(rawContent, { overall_score: 50, dimensions: {}, strengths: [], improvement_areas: [] });

    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'quality-score',
        content: JSON.stringify(quality),
        confidence: (quality.overall_score || 50) / 100,
        userId: req.user!.id,
      },
    });

    res.json({ quality, savedId: saved.id });
  } catch (error) {
    console.error('Meeting quality score error:', error);
    res.status(500).json({ error: 'Failed to score meeting quality' });
  }
});

// Participant engagement analyzer — who spoke, who was silent
router.post('/participant-engagement-analyzer', authenticateToken, validateBody(ParticipantEngagementSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;
    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a meeting facilitation analyst. Estimate participant engagement from a transcript.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "participants": [
    {
      "name": string,
      "estimated_speaking_share_percent": number,
      "engagement_level": "high" | "medium" | "low",
      "contribution_summary": string,
      "topics_owned": [string]
    }
  ],
  "silent_or_underrepresented": [string],
  "dominant_speakers": [string],
  "facilitation_recommendations": [string]
}`,
        },
        { role: 'user', content: `Analyze participant engagement:\n\n${transcript}` },
      ],
      max_tokens: 2048,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const engagement = parseAIJson(rawContent, { participants: [], silent_or_underrepresented: [], dominant_speakers: [] });

    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'engagement',
        content: JSON.stringify(engagement),
        confidence: 0.7,
        userId: req.user!.id,
      },
    });

    res.json({ engagement, savedId: saved.id });
  } catch (error) {
    console.error('Participant engagement error:', error);
    res.status(500).json({ error: 'Failed to analyze participant engagement' });
  }
});

// Decision consensus check — analyze whether a transcript actually achieved consensus
router.post('/decision-consensus-check', authenticateToken, validateBody(DecisionConsensusCheckSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!hasLLMKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY (or OPENAI_API_KEY) not configured' });
    }
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;
    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a decision-making and consensus analyst. Given a meeting transcript, evaluate whether each apparent "decision" achieved real consensus or whether dissent was suppressed, glossed over, or unresolved.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "decisions": [
    {
      "title": string,
      "consensus_level": "unanimous" | "majority" | "split" | "implicit" | "unresolved",
      "supporters": [string],
      "dissenters": [string],
      "silent_participants": [string],
      "evidence_quotes": [string],
      "risk_if_premature": string,
      "follow_up_required": boolean,
      "follow_up_recommendation": string
    }
  ],
  "overall_consensus_health": "strong" | "fragile" | "weak",
  "facilitation_recommendations": [string]
}`,
        },
        { role: 'user', content: `Analyze decision consensus in this transcript:\n\n${transcript}` },
      ],
      max_tokens: 2048,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const consensus = parseAIJson(rawContent, { decisions: [], overall_consensus_health: 'fragile', facilitation_recommendations: [] });

    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'consensus-check',
        content: JSON.stringify(consensus),
        confidence: 0.7,
        userId: req.user!.id,
      },
    });

    res.json({ consensus, savedId: saved.id });
  } catch (error) {
    console.error('Decision consensus check error:', error);
    res.status(500).json({ error: 'Failed to analyze decision consensus' });
  }
});

// Next meeting optimizer — suggest agenda, attendees, cadence improvements for a meeting series
router.post('/next-meeting-optimizer', authenticateToken, validateBody(NextMeetingOptimizerSchema), async (req: AuthRequest, res: Response) => {
  try {
    if (!hasLLMKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY (or OPENAI_API_KEY) not configured' });
    }
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, meetingSeriesTitle, recentMeetingSummaries, upcomingAgendaDraft, participants, cadence } = req.body;
    const { client, model } = getAIClient();

    const userPayload = `Meeting series: ${meetingSeriesTitle}
Cadence: ${cadence || 'unspecified'}
Participants: ${participants ? participants.join(', ') : 'unspecified'}

Recent meeting summaries (newest last):
${recentMeetingSummaries.map((s: string, i: number) => `--- meeting ${i + 1} ---\n${s}`).join('\n\n')}

${upcomingAgendaDraft ? `Draft agenda for next meeting:\n${upcomingAgendaDraft}` : 'No agenda drafted yet.'}`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a meeting effectiveness coach. Given recent meeting history and an optional agenda draft, recommend how to optimize the NEXT meeting in this series.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "recommended_agenda": [
    { "topic": string, "outcome_target": string, "owner": string | null, "time_minutes": number }
  ],
  "carry_over_action_items": [string],
  "open_decisions_to_close": [string],
  "people_to_invite": [string],
  "people_to_excuse": [string],
  "suggested_duration_minutes": number,
  "suggested_cadence_change": "keep" | "more_frequent" | "less_frequent" | "split_into_two" | "merge_with_other_series",
  "preparation_required_from_attendees": [string],
  "risks_if_not_addressed": [string]
}`,
        },
        { role: 'user', content: userPayload },
      ],
      max_tokens: 2048,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const plan = parseAIJson(rawContent, {
      recommended_agenda: [],
      carry_over_action_items: [],
      open_decisions_to_close: [],
      people_to_invite: [],
      people_to_excuse: [],
      suggested_duration_minutes: 30,
      suggested_cadence_change: 'keep',
      preparation_required_from_attendees: [],
      risks_if_not_addressed: [],
    });

    const saved = await prisma.aIInsight.create({
      data: {
        meetingId: meetingId || undefined,
        type: 'next-meeting-optimizer',
        content: JSON.stringify(plan),
        confidence: 0.7,
        userId: req.user!.id,
      },
    });

    res.json({ plan, savedId: saved.id });
  } catch (error) {
    console.error('Next meeting optimizer error:', error);
    res.status(500).json({ error: 'Failed to optimize next meeting' });
  }
});

export default router;
