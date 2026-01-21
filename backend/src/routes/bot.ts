import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { selfHostedBot } from '../services/meetingBotCore.js';
import OpenAI from 'openai';
import { existsSync, createReadStream, statSync } from 'fs';
import { join } from 'path';

const router = Router();

// Initialize AI client - uses OpenAI directly with OPENAI_API_KEY
const getAIClient = () => {
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  // Use OpenAI directly
  return {
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    }),
    model
  };
};

// Join a meeting with the AI bot
router.post('/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId, meetingUrl, botName } = req.body;

    if (!meetingUrl) {
      return res.status(400).json({ error: 'Meeting URL is required' });
    }

    // If meetingId provided, use existing meeting, otherwise create new one
    let meeting;
    if (meetingId) {
      meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
    } else {
      // Detect platform from URL
      let platform = 'Meeting';
      if (meetingUrl.includes('zoom')) platform = 'Zoom';
      else if (meetingUrl.includes('meet.google')) platform = 'Google Meet';
      else if (meetingUrl.includes('teams')) platform = 'Microsoft Teams';
      else if (meetingUrl.includes('webex')) platform = 'Webex';

      // Create new meeting record
      meeting = await prisma.meeting.create({
        data: {
          title: `${platform} Meeting - ${new Date().toLocaleString()}`,
          description: 'Auto-created meeting from bot join',
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: 'in_progress',
          meetingLink: meetingUrl,
          userId: req.user!.id
        }
      });
    }

    // Join the meeting with our self-hosted bot
    const result = await selfHostedBot.joinMeeting(meeting.id, meetingUrl, { botName });

    if (result.success) {
      // Create notification
      await prisma.notification.create({
        data: {
          title: 'Bot Joined Meeting',
          message: `AI Meeting Agent has joined: ${meeting.title}. Recording: ${result.recordingStarted ? 'Started' : 'Not available'}`,
          type: 'system',
          userId: req.user!.id
        }
      });
    }

    res.json({
      success: result.success,
      meetingId: meeting.id,
      ...result
    });
  } catch (error: any) {
    console.error('Error joining meeting:', error);
    res.status(500).json({ error: error.message || 'Failed to join meeting' });
  }
});

// Leave a meeting
router.post('/leave/:meetingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingId } = req.params;
    const { generateSummary = true, extractActions = true } = req.body;

    // Leave the meeting and get transcript
    const result = await selfHostedBot.leaveMeeting(meetingId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Update meeting with video recording path
    if (result.videoPath) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          recordingUrl: result.videoPath,
          status: 'completed',
          endTime: new Date()
        }
      });
    }

    // Save meeting notes from transcript
    if (result.transcript && result.transcript.length > 50) {
      await prisma.meetingNote.create({
        data: {
          meetingId,
          content: `## Auto-Generated Meeting Notes\n\n${result.transcript}`,
          authorId: req.user!.id
        }
      });
    }

    // Process with AI if we have a transcript
    if (result.transcript && result.transcript.length > 100) {
      const { client, model } = getAIClient();

      // Generate comprehensive AI analysis
      try {
        const analysisCompletion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `You are an AI meeting analyst. Analyze the meeting transcript and return a JSON object with:
{
  "summary": "A concise 2-3 paragraph summary of the meeting",
  "keyPoints": ["array of key discussion points"],
  "decisions": [{"title": "decision title", "description": "details", "status": "approved/pending/rejected"}],
  "actionItems": [{"title": "task", "description": "details", "assignee": "person name or null", "priority": "low/medium/high", "dueDate": "suggested date or null"}],
  "followUps": [{"title": "follow-up item", "description": "details", "priority": "low/medium/high"}],
  "participants": ["names mentioned in the meeting"],
  "topics": ["main topics discussed"],
  "sentiment": "positive/neutral/negative",
  "nextSteps": "recommended next steps"
}`
            },
            {
              role: 'user',
              content: `Analyze this meeting transcript:\n\n${result.transcript}`
            }
          ],
          max_tokens: 3000
        });

        const responseContent = analysisCompletion.choices[0]?.message?.content || '{}';
        let analysis: any = {};

        try {
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.error('Failed to parse AI analysis JSON');
        }

        // Save summary as AI insight
        if (analysis.summary) {
          await prisma.aIInsight.create({
            data: {
              meetingId,
              type: 'summary',
              content: analysis.summary,
              confidence: 0.9,
              userId: req.user!.id
            }
          });
          result.summary = analysis.summary;
        }

        // Save key points as AI insight
        if (analysis.keyPoints && analysis.keyPoints.length > 0) {
          await prisma.aIInsight.create({
            data: {
              meetingId,
              type: 'key_points',
              content: analysis.keyPoints.join('\n• '),
              confidence: 0.85,
              userId: req.user!.id
            }
          });
        }

        // Save decisions
        if (analysis.decisions && analysis.decisions.length > 0) {
          for (const decision of analysis.decisions) {
            await prisma.decision.create({
              data: {
                meetingId,
                title: decision.title,
                description: decision.description || '',
                status: decision.status || 'pending',
                madeBy: req.user!.email || 'AI Agent'
              }
            });
          }
          result.decisions = analysis.decisions;
        }

        // Save action items
        if (analysis.actionItems && analysis.actionItems.length > 0) {
          for (const item of analysis.actionItems) {
            await prisma.actionItem.create({
              data: {
                meetingId,
                title: item.title,
                description: item.description || '',
                priority: item.priority || 'medium',
                dueDate: item.dueDate ? new Date(item.dueDate) : null,
                assigneeId: req.user!.id
              }
            });
          }
          result.actionItems = analysis.actionItems;
        }

        // Save follow-ups
        if (analysis.followUps && analysis.followUps.length > 0) {
          for (const followUp of analysis.followUps) {
            await prisma.followUp.create({
              data: {
                meetingId,
                title: followUp.title,
                description: followUp.description || '',
                assignee: req.user!.email || 'Unassigned'
              }
            });
          }
          result.followUps = analysis.followUps;
        }

        // Save sentiment analysis as insight
        if (analysis.sentiment) {
          await prisma.aIInsight.create({
            data: {
              meetingId,
              type: 'sentiment',
              content: `Meeting sentiment: ${analysis.sentiment}`,
              confidence: 0.8,
              userId: req.user!.id
            }
          });
        }

        // Save next steps as insight
        if (analysis.nextSteps) {
          await prisma.aIInsight.create({
            data: {
              meetingId,
              type: 'next_steps',
              content: analysis.nextSteps,
              confidence: 0.85,
              userId: req.user!.id
            }
          });
        }

        // Save topics as insight
        if (analysis.topics && analysis.topics.length > 0) {
          await prisma.aIInsight.create({
            data: {
              meetingId,
              type: 'topics',
              content: `Topics discussed: ${analysis.topics.join(', ')}`,
              confidence: 0.9,
              userId: req.user!.id
            }
          });
        }

        result.analysis = analysis;

      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    // Create notification with details
    await prisma.notification.create({
      data: {
        title: 'Meeting Recording Complete',
        message: `AI Meeting Agent has finished processing your meeting. ${result.actionItems?.length || 0} action items, ${result.decisions?.length || 0} decisions extracted.`,
        type: 'system',
        userId: req.user!.id
      }
    });

    res.json({
      success: true,
      meetingId,
      duration: result.duration,
      transcript: result.transcript,
      videoPath: result.videoPath,
      screenshots: result.screenshots,
      summary: result.summary,
      actionItems: result.actionItems,
      decisions: result.decisions,
      followUps: result.followUps,
      analysis: result.analysis
    });
  } catch (error: any) {
    console.error('Error leaving meeting:', error);
    res.status(500).json({ error: error.message || 'Failed to leave meeting' });
  }
});

// Get real-time meeting status
router.get('/status/:meetingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const status = await selfHostedBot.getStatus(meetingId);
    res.json(status);
  } catch (error: any) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: error.message || 'Failed to get meeting status' });
  }
});

// Take screenshot
router.post('/screenshot/:meetingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const screenshotPath = await selfHostedBot.takeScreenshot(meetingId);

    if (screenshotPath) {
      res.json({ success: true, path: screenshotPath });
    } else {
      res.status(400).json({ error: 'Could not take screenshot' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle recording on/off
router.post('/recording/:meetingId/toggle', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const result = await selfHostedBot.toggleRecording(meetingId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recording file
router.get('/recording/:meetingId/video', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const status = await selfHostedBot.getStatus(meetingId);

    if (status.videoPath && existsSync(status.videoPath)) {
      const stat = statSync(status.videoPath);
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="meeting_${meetingId}.mp4"`
      });
      createReadStream(status.videoPath).pipe(res);
    } else {
      res.status(404).json({ error: 'Recording not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get audio file
router.get('/recording/:meetingId/audio', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingId } = req.params;
    const recordingsDir = join(process.cwd(), 'recordings');

    // Find audio file for this meeting
    const status = await selfHostedBot.getStatus(meetingId);

    if (status.status === 'not_active') {
      // Meeting ended, check for saved audio
      const prisma: PrismaClient = req.app.get('prisma');
      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
    }

    res.status(404).json({ error: 'Audio file not available yet' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Quick join - paste any meeting URL
router.post('/quick-join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { meetingUrl, title } = req.body;

    if (!meetingUrl) {
      return res.status(400).json({ error: 'Meeting URL is required' });
    }

    // Detect platform
    let platform = 'unknown';
    if (meetingUrl.includes('zoom')) platform = 'Zoom';
    else if (meetingUrl.includes('meet.google')) platform = 'Google Meet';
    else if (meetingUrl.includes('teams')) platform = 'Microsoft Teams';
    else if (meetingUrl.includes('webex')) platform = 'Webex';

    // Create meeting record
    const meeting = await prisma.meeting.create({
      data: {
        title: title || `${platform} Meeting - ${new Date().toLocaleString()}`,
        description: `Quick join meeting on ${platform}`,
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: 'scheduled',
        meetingLink: meetingUrl,
        userId: req.user!.id
      }
    });

    // Join with our self-hosted bot
    const result = await selfHostedBot.joinMeeting(meeting.id, meetingUrl, {
      botName: 'AI Meeting Agent'
    });

    res.json({
      success: result.success,
      meeting,
      platform,
      ...result
    });
  } catch (error: any) {
    console.error('Error in quick join:', error);
    res.status(500).json({ error: error.message || 'Failed to join meeting' });
  }
});

// Get supported platforms
router.get('/platforms', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    supported: [
      { id: 'zoom', name: 'Zoom', urlPattern: 'zoom.us/j/*', status: 'supported' },
      { id: 'google_meet', name: 'Google Meet', urlPattern: 'meet.google.com/*', status: 'supported' },
      { id: 'teams', name: 'Microsoft Teams', urlPattern: 'teams.microsoft.com/*', status: 'supported' },
      { id: 'webex', name: 'Cisco Webex', urlPattern: 'webex.com/*', status: 'beta' },
    ],
    features: {
      browserAutomation: true,
      screenCapture: true,
      videoRecording: true,
      captionCapture: true,
      chatCapture: true,
      participantTracking: true,
      aiSummary: true,
      actionItemExtraction: true,
      whisperTranscription: !!process.env.OPENAI_API_KEY
    },
    note: 'Self-hosted solution using Puppeteer with video recording. Whisper transcription available with OpenAI API key.'
  });
});

// Convert frames to video manually (for sessions that were lost)
router.post('/convert-frames/:sessionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const recordingsDir = join(process.cwd(), 'recordings');
    const framesDir = join(recordingsDir, `${sessionId}_frames`);
    const videoPath = join(recordingsDir, `${sessionId}_video.mp4`);

    if (!existsSync(framesDir)) {
      return res.status(404).json({ error: 'Frames directory not found' });
    }

    // Count frames
    const { readdirSync } = await import('fs');
    const frames = readdirSync(framesDir).filter(f => f.endsWith('.png'));

    if (frames.length === 0) {
      return res.status(400).json({ error: 'No frames found in directory' });
    }

    // Convert using FFmpeg
    const { spawn } = await import('child_process');
    const ffmpeg = spawn('ffmpeg', [
      '-framerate', '2',
      '-i', join(framesDir, 'frame_%06d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '23',
      '-preset', 'fast',
      '-y',
      videoPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          videoPath,
          frameCount: frames.length,
          duration: Math.floor(frames.length / 2) // 2 FPS
        });
      } else {
        res.status(500).json({ error: 'FFmpeg conversion failed' });
      }
    });

    ffmpeg.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List active/persisted sessions (for recovery after server restart)
router.get('/active-sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const recordingsDir = join(process.cwd(), 'recordings');
    const sessionsFile = join(recordingsDir, 'active_sessions.json');

    if (existsSync(sessionsFile)) {
      const data = JSON.parse(require('fs').readFileSync(sessionsFile, 'utf-8'));
      res.json(Object.values(data));
    } else {
      res.json([]);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List available frame sessions
router.get('/frame-sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const recordingsDir = join(process.cwd(), 'recordings');
    const { readdirSync } = await import('fs');

    const dirs = readdirSync(recordingsDir)
      .filter(d => d.endsWith('_frames'))
      .map(d => {
        const sessionId = d.replace('_frames', '');
        const framesDir = join(recordingsDir, d);
        const frames = readdirSync(framesDir).filter(f => f.endsWith('.png'));
        const videoExists = existsSync(join(recordingsDir, `${sessionId}_video.mp4`));

        return {
          sessionId,
          frameCount: frames.length,
          duration: Math.floor(frames.length / 2),
          hasVideo: videoExists
        };
      })
      .filter(s => s.frameCount > 0);

    res.json(dirs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all recordings for user - includes both meeting recordings and frame sessions
router.get('/recordings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const recordingsDir = join(process.cwd(), 'recordings');
    const { readdirSync } = await import('fs');

    // Get all frame session directories
    const recordings: any[] = [];

    if (existsSync(recordingsDir)) {
      const dirs = readdirSync(recordingsDir)
        .filter(d => d.endsWith('_frames'))
        .map(d => {
          const sessionId = d.replace('_frames', '');
          const framesDir = join(recordingsDir, d);
          const frames = readdirSync(framesDir).filter(f => f.endsWith('.png'));
          const hasVideo = existsSync(join(recordingsDir, `${sessionId}_video.mp4`));
          const hasAudio = existsSync(join(recordingsDir, `${sessionId}_audio.mp3`));

          // Get created time from first frame or directory
          let createdAt = new Date().toISOString();
          try {
            const stat = statSync(framesDir);
            createdAt = stat.birthtime.toISOString();
          } catch {}

          return {
            sessionId,
            frameCount: frames.length,
            duration: Math.floor(frames.length / 2), // 2 FPS
            hasVideo,
            hasAudio,
            createdAt
          };
        })
        .filter(s => s.frameCount > 0);

      recordings.push(...dirs);
    }

    // Sort by created date descending
    recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(recordings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stream video file for a session
router.get('/video/:sessionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const recordingsDir = join(process.cwd(), 'recordings');
    const videoPath = join(recordingsDir, `${sessionId}_video.mp4`);

    if (!existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for video seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      const file = createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      createReadStream(videoPath).pipe(res);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stream audio file for a session
router.get('/audio/:sessionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const recordingsDir = join(process.cwd(), 'recordings');
    const audioPath = join(recordingsDir, `${sessionId}_audio.mp3`);

    if (!existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    const stat = statSync(audioPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for audio seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      const file = createReadStream(audioPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      });
      createReadStream(audioPath).pipe(res);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
