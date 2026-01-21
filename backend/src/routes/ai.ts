import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Initialize AI client - uses model from AI_MODEL env var
const getAIClient = () => {
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

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

  // Fallback to OpenAI
  return {
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    }),
    model
  };
};

// Generate meeting summary
router.post('/summarize', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that summarizes meeting transcripts. Provide a concise, well-structured summary highlighting key points, decisions made, and action items discussed.'
        },
        {
          role: 'user',
          content: `Please summarize the following meeting transcript:\n\n${transcript}`
        }
      ],
      max_tokens: 1000
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';

    // Save as AI insight
    if (meetingId) {
      await prisma.aIInsight.create({
        data: {
          meetingId,
          type: 'summary',
          content: summary,
          confidence: 0.9,
          userId: req.user!.id
        }
      });
    }

    res.json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Extract action items from transcript
router.post('/extract-actions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that extracts action items from meeting transcripts. Return a JSON array of action items with fields: title, description, assignee (if mentioned), priority (low/medium/high), dueDate (if mentioned, in ISO format).'
        },
        {
          role: 'user',
          content: `Extract all action items from this meeting transcript. Return ONLY a valid JSON array:\n\n${transcript}`
        }
      ],
      max_tokens: 1000
    });

    const responseContent = completion.choices[0]?.message?.content || '[]';
    let actionItems = [];

    try {
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        actionItems = JSON.parse(jsonMatch[0]);
      }
    } catch {
      actionItems = [];
    }

    // Save action items if meetingId provided
    if (meetingId && actionItems.length > 0) {
      for (const item of actionItems) {
        await prisma.actionItem.create({
          data: {
            meetingId,
            title: item.title,
            description: item.description,
            priority: item.priority || 'medium',
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            assigneeId: req.user!.id
          }
        });
      }
    }

    res.json({ actionItems });
  } catch (error) {
    console.error('Extract actions error:', error);
    res.status(500).json({ error: 'Failed to extract action items' });
  }
});

// Analyze sentiment
router.post('/sentiment', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of this meeting transcript. Return a JSON object with: overall (positive/negative/neutral), score (0-100), highlights (array of notable moments with sentiment).'
        },
        {
          role: 'user',
          content: `Analyze the sentiment:\n\n${transcript}`
        }
      ],
      max_tokens: 500
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    let sentiment = { overall: 'neutral', score: 50, highlights: [] };

    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sentiment = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Use default
    }

    // Save as AI insight
    if (meetingId) {
      await prisma.aIInsight.create({
        data: {
          meetingId,
          type: 'sentiment',
          content: JSON.stringify(sentiment),
          confidence: sentiment.score / 100,
          userId: req.user!.id
        }
      });
    }

    res.json({ sentiment });
  } catch (error) {
    console.error('Sentiment error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Extract key topics
router.post('/topics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Extract the key topics discussed in this meeting. Return a JSON array of objects with: topic, importance (1-10), timeSpent (estimated percentage), keyPoints (array of strings).'
        },
        {
          role: 'user',
          content: `Extract key topics:\n\n${transcript}`
        }
      ],
      max_tokens: 800
    });

    const responseContent = completion.choices[0]?.message?.content || '[]';
    let topics = [];

    try {
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      }
    } catch {
      topics = [];
    }

    // Save as AI insight
    if (meetingId) {
      await prisma.aIInsight.create({
        data: {
          meetingId,
          type: 'key_topics',
          content: JSON.stringify(topics),
          confidence: 0.85,
          userId: req.user!.id
        }
      });
    }

    res.json({ topics });
  } catch (error) {
    console.error('Topics error:', error);
    res.status(500).json({ error: 'Failed to extract topics' });
  }
});

// Generate follow-up email
router.post('/follow-up-email', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingTitle, summary, actionItems, recipients } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that generates professional follow-up emails after meetings. Be concise, clear, and action-oriented.'
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
      max_tokens: 800
    });

    const email = completion.choices[0]?.message?.content || 'Unable to generate email';

    res.json({ email });
  } catch (error) {
    console.error('Follow-up email error:', error);
    res.status(500).json({ error: 'Failed to generate follow-up email' });
  }
});

// Suggest agenda items
router.post('/suggest-agenda', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingTitle, context, previousMeetings } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that suggests agenda items for meetings. Return a JSON array of agenda items with: title, description, estimatedDuration (in minutes), priority (1-5).'
        },
        {
          role: 'user',
          content: `Suggest agenda items for this meeting:
Title: ${meetingTitle}
Context: ${context || 'General meeting'}
Previous meetings context: ${previousMeetings || 'None provided'}`
        }
      ],
      max_tokens: 800
    });

    const responseContent = completion.choices[0]?.message?.content || '[]';
    let suggestions = [];

    try {
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      suggestions = [];
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggest agenda error:', error);
    res.status(500).json({ error: 'Failed to suggest agenda items' });
  }
});

// Chat with AI about meetings
router.post('/chat', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message, context } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an AI meeting assistant. Help users with meeting-related questions, provide insights, and offer suggestions. ${context ? `Context: ${context}` : ''}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I was unable to process your request.';

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Generate meeting notes from transcript
router.post('/generate-notes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, transcript } = req.body;

    const { client, model } = getAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Generate comprehensive, well-formatted meeting notes from this transcript. Include: key discussion points, decisions made, action items, and next steps. Use markdown formatting.'
        },
        {
          role: 'user',
          content: `Generate meeting notes from this transcript:\n\n${transcript}`
        }
      ],
      max_tokens: 1500
    });

    const notes = completion.choices[0]?.message?.content || 'Unable to generate notes';

    // Save notes if meetingId provided
    if (meetingId) {
      await prisma.meetingNote.create({
        data: {
          meetingId,
          content: notes,
          type: 'ai_generated',
          authorId: req.user!.id
        }
      });
    }

    res.json({ notes });
  } catch (error) {
    console.error('Generate notes error:', error);
    res.status(500).json({ error: 'Failed to generate notes' });
  }
});

export default router;
