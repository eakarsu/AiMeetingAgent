import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Meeting Bot Service - Handles joining meetings and capturing content
// Supports: Zoom, Google Meet, Microsoft Teams, Webex

interface BotConfig {
  meetingUrl: string;
  meetingId: string;
  botName?: string;
  recordAudio?: boolean;
  recordVideo?: boolean;
  captureScreenShare?: boolean;
  enableTranscription?: boolean;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number;
}

// Option 1: Using Recall.ai API (recommended for production)
export class RecallMeetingBot {
  private apiKey: string;
  private baseUrl = 'https://api.recall.ai/api/v1';

  constructor() {
    this.apiKey = process.env.RECALL_API_KEY || '';
  }

  async createBot(config: BotConfig): Promise<any> {
    const response = await fetch(`${this.baseUrl}/bot`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meeting_url: config.meetingUrl,
        bot_name: config.botName || 'AI Meeting Agent',
        transcription_options: {
          provider: 'deepgram',
          language: 'en'
        },
        recording_mode: 'speaker_view',
        recording_mode_options: {
          participant_video_when_screenshare: 'hide'
        }
      })
    });

    return response.json();
  }

  async getBotStatus(botId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/bot/${botId}`, {
      headers: {
        'Authorization': `Token ${this.apiKey}`
      }
    });
    return response.json();
  }

  async getTranscript(botId: string): Promise<TranscriptSegment[]> {
    const response = await fetch(`${this.baseUrl}/bot/${botId}/transcript`, {
      headers: {
        'Authorization': `Token ${this.apiKey}`
      }
    });
    const data = await response.json();
    return data.transcript || [];
  }

  async getRecording(botId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/bot/${botId}/recording`, {
      headers: {
        'Authorization': `Token ${this.apiKey}`
      }
    });
    const data = await response.json();
    return data.video_url;
  }

  async stopBot(botId: string): Promise<void> {
    await fetch(`${this.baseUrl}/bot/${botId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`
      }
    });
  }
}

// Option 2: Using Assembly AI for transcription with custom bot
export class AssemblyAITranscriber {
  private apiKey: string;
  private baseUrl = 'https://api.assemblyai.com/v2';

  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY || '';
  }

  async transcribeAudio(audioUrl: string): Promise<any> {
    // Start transcription
    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        auto_highlights: true,
        summarization: true,
        summary_model: 'informative',
        summary_type: 'bullets'
      })
    });

    return response.json();
  }

  async getTranscript(transcriptId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
      headers: {
        'Authorization': this.apiKey
      }
    });
    return response.json();
  }

  // Real-time transcription via WebSocket
  async createRealtimeSession(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/realtime/token`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expires_in: 3600 })
    });
    const data = await response.json();
    return data.token;
  }
}

// Meeting Bot Manager - Orchestrates bot operations
export class MeetingBotManager {
  private recallBot: RecallMeetingBot;
  private transcriber: AssemblyAITranscriber;
  private activeBots: Map<string, any> = new Map();

  constructor() {
    this.recallBot = new RecallMeetingBot();
    this.transcriber = new AssemblyAITranscriber();
  }

  // Join a meeting with the AI bot
  async joinMeeting(meetingId: string, meetingUrl: string, options?: Partial<BotConfig>): Promise<any> {
    try {
      // Detect meeting platform
      const platform = this.detectPlatform(meetingUrl);
      console.log(`Joining ${platform} meeting: ${meetingUrl}`);

      // Create bot to join meeting
      const bot = await this.recallBot.createBot({
        meetingUrl,
        meetingId,
        botName: options?.botName || 'AI Meeting Agent',
        recordAudio: options?.recordAudio ?? true,
        recordVideo: options?.recordVideo ?? true,
        captureScreenShare: options?.captureScreenShare ?? true,
        enableTranscription: options?.enableTranscription ?? true
      });

      // Store active bot reference
      this.activeBots.set(meetingId, {
        botId: bot.id,
        platform,
        meetingUrl,
        startTime: new Date(),
        status: 'joining'
      });

      // Update meeting record
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'in_progress',
          recordingUrl: bot.id // Store bot ID temporarily
        }
      });

      return {
        success: true,
        botId: bot.id,
        message: `Bot is joining the ${platform} meeting...`
      };
    } catch (error) {
      console.error('Error joining meeting:', error);
      throw error;
    }
  }

  // Leave a meeting
  async leaveMeeting(meetingId: string): Promise<any> {
    const botInfo = this.activeBots.get(meetingId);
    if (!botInfo) {
      throw new Error('No active bot for this meeting');
    }

    try {
      // Stop the bot
      await this.recallBot.stopBot(botInfo.botId);

      // Get final transcript
      const transcript = await this.recallBot.getTranscript(botInfo.botId);
      const recordingUrl = await this.recallBot.getRecording(botInfo.botId);

      // Save transcript to database
      const transcriptText = transcript.map((s: TranscriptSegment) =>
        `[${this.formatTimestamp(s.timestamp)}] ${s.speaker}: ${s.text}`
      ).join('\n');

      await prisma.transcript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          content: transcriptText,
          language: 'en',
          duration: Math.floor((Date.now() - botInfo.startTime.getTime()) / 1000)
        },
        update: {
          content: transcriptText,
          duration: Math.floor((Date.now() - botInfo.startTime.getTime()) / 1000)
        }
      });

      // Update meeting record
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'completed',
          recordingUrl
        }
      });

      // Remove from active bots
      this.activeBots.delete(meetingId);

      return {
        success: true,
        transcript: transcriptText,
        recordingUrl,
        duration: Math.floor((Date.now() - botInfo.startTime.getTime()) / 1000)
      };
    } catch (error) {
      console.error('Error leaving meeting:', error);
      throw error;
    }
  }

  // Get real-time status and transcript
  async getMeetingStatus(meetingId: string): Promise<any> {
    const botInfo = this.activeBots.get(meetingId);
    if (!botInfo) {
      return { status: 'not_active' };
    }

    const botStatus = await this.recallBot.getBotStatus(botInfo.botId);
    const transcript = await this.recallBot.getTranscript(botInfo.botId);

    return {
      status: botStatus.status,
      platform: botInfo.platform,
      duration: Math.floor((Date.now() - botInfo.startTime.getTime()) / 1000),
      participantCount: botStatus.participant_count || 0,
      transcript: transcript.map((s: TranscriptSegment) => ({
        speaker: s.speaker,
        text: s.text,
        timestamp: this.formatTimestamp(s.timestamp)
      })),
      isRecording: botStatus.is_recording || false
    };
  }

  // Detect meeting platform from URL
  private detectPlatform(url: string): string {
    if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom';
    if (url.includes('meet.google.com')) return 'google_meet';
    if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams';
    if (url.includes('webex.com')) return 'webex';
    if (url.includes('whereby.com')) return 'whereby';
    if (url.includes('gather.town')) return 'gather';
    return 'unknown';
  }

  private formatTimestamp(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
}

// Singleton instance
export const meetingBotManager = new MeetingBotManager();
