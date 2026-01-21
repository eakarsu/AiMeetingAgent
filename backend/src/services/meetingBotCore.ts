import puppeteer, { Browser, Page, CDPSession } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, createWriteStream } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Configuration
const RECORDINGS_DIR = join(process.cwd(), 'recordings');
const BOT_NAME = 'AI Meeting Agent';

// Ensure recordings directory exists
if (!existsSync(RECORDINGS_DIR)) {
  mkdirSync(RECORDINGS_DIR, { recursive: true });
}

interface MeetingSession {
  id: string;
  meetingId: string;
  meetingUrl: string;
  platform: string;
  browser: Browser | null;
  page: Page | null;
  cdpSession: CDPSession | null;
  ffmpegProcess: ChildProcess | null;
  screencastFrames: Buffer[];
  status: 'joining' | 'in_meeting' | 'recording' | 'ended' | 'error';
  startTime: Date;
  transcriptSegments: TranscriptSegment[];
  videoFilePath: string;
  audioFilePath: string;
  framesDir: string;
  screenshotPaths: string[];
  captionInterval: NodeJS.Timeout | null;
  screencastInterval: NodeJS.Timeout | null;
  isRecording: boolean;
  frameCount: number;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number;
}

// Active meeting sessions
const activeSessions: Map<string, MeetingSession> = new Map();

// File to persist session metadata (survives server restart)
const SESSIONS_FILE = join(RECORDINGS_DIR, 'active_sessions.json');

interface PersistedSession {
  meetingId: string;
  sessionId: string;
  platform: string;
  framesDir: string;
  startTime: string;
  frameCount: number;
}

// Load persisted sessions on startup
function loadPersistedSessions(): Map<string, PersistedSession> {
  try {
    if (existsSync(SESSIONS_FILE)) {
      const data = readFileSync(SESSIONS_FILE, 'utf-8');
      const sessions = JSON.parse(data);
      return new Map(Object.entries(sessions));
    }
  } catch (e) {
    console.log('[Bot] No persisted sessions to load');
  }
  return new Map();
}

// Save session to file
function persistSession(meetingId: string, session: Partial<PersistedSession>) {
  try {
    const sessions = loadPersistedSessions();
    sessions.set(meetingId, session as PersistedSession);
    writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(sessions), null, 2));
  } catch (e) {
    console.error('[Bot] Failed to persist session:', e);
  }
}

// Remove session from file
function removePersistedSession(meetingId: string) {
  try {
    const sessions = loadPersistedSessions();
    sessions.delete(meetingId);
    writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(sessions), null, 2));
  } catch (e) {
    console.error('[Bot] Failed to remove persisted session:', e);
  }
}

const persistedSessions = loadPersistedSessions();
console.log(`[Bot] Loaded ${persistedSessions.size} persisted sessions`);

// Initialize OpenAI for Whisper transcription
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[Bot] OPENAI_API_KEY not set - Whisper transcription will not be available');
    return null;
  }
  return new OpenAI({ apiKey });
};

// Initialize OpenRouter for AI features (summaries, action items)
const getOpenRouterClient = () => {
  return new OpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Meeting Agent'
    }
  });
};

// Detect meeting platform from URL
function detectPlatform(url: string): { platform: string; type: string } {
  if (url.includes('zoom.us') || url.includes('zoom.com')) {
    return { platform: 'zoom', type: 'web' };
  }
  if (url.includes('meet.google.com')) {
    return { platform: 'google_meet', type: 'web' };
  }
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) {
    return { platform: 'teams', type: 'web' };
  }
  if (url.includes('webex.com')) {
    return { platform: 'webex', type: 'web' };
  }
  return { platform: 'unknown', type: 'web' };
}

// Enable Live Captions in Google Meet
async function enableGoogleMeetCaptions(page: Page): Promise<void> {
  try {
    console.log('[Bot] Attempting to enable Google Meet captions...');
    await new Promise(r => setTimeout(r, 2000));

    // Method 1: Click CC button directly
    const ccClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (ariaLabel.includes('caption') || ariaLabel.includes('subtitle') || ariaLabel.includes('cc')) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (ccClicked) {
      console.log('[Bot] Clicked captions button in Google Meet');
      return;
    }

    // Method 2: Use keyboard shortcut (c for captions)
    console.log('[Bot] Trying keyboard shortcut for captions...');
    await page.keyboard.press('c');

    console.log('[Bot] Google Meet captions setup attempted');
  } catch (error) {
    console.log('[Bot] Failed to enable Google Meet captions:', error);
  }
}

// Join Google Meet
async function joinGoogleMeet(page: Page, meetingUrl: string, botName: string): Promise<boolean> {
  try {
    console.log('[Bot] Navigating to Google Meet...');

    // Debug directory
    const debugDir = join(RECORDINGS_DIR, 'debug');
    if (!existsSync(debugDir)) mkdirSync(debugDir, { recursive: true });

    await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: join(debugDir, 'gmeet_step1_initial.png') });
    console.log('[Bot] Debug screenshot saved: gmeet_step1_initial.png');

    // Dismiss any dialogs
    try {
      const gotItButton = await page.$('button[aria-label="Got it"]');
      if (gotItButton) await gotItButton.click();
    } catch {}

    // Enter name if required
    try {
      const nameInput = await page.$('input[aria-label="Your name"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await page.keyboard.type(botName, { delay: 50 });
        console.log('[Bot] Entered name:', botName);
      }
    } catch {}

    await page.screenshot({ path: join(debugDir, 'gmeet_step2_name.png') });

    // Turn off camera and microphone before joining
    console.log('[Bot] Turning off camera and microphone...');
    try {
      // Camera off
      const cameraOff = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (ariaLabel.includes('camera') && !ariaLabel.includes('off')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      console.log('[Bot] Camera toggle clicked:', cameraOff);

      // Mic off
      const micOff = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (ariaLabel.includes('microphone') && !ariaLabel.includes('off')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      console.log('[Bot] Microphone toggle clicked:', micOff);
    } catch {}

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: join(debugDir, 'gmeet_step3_devices_off.png') });

    // Click "Join now" or "Ask to join"
    console.log('[Bot] Looking for Join button...');
    let joinClicked = false;

    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && (text.toLowerCase().includes('join now') || text.toLowerCase().includes('ask to join'))) {
          await btn.click();
          console.log('[Bot] Clicked join button:', text);
          joinClicked = true;
          break;
        }
      }
    } catch {}

    if (!joinClicked) {
      // Try selectors
      const joinSelectors = [
        'button[aria-label="Join now"]',
        'button[aria-label="Ask to join"]',
        'button[jsname="Qx7uuf"]'
      ];
      for (const selector of joinSelectors) {
        try {
          const joinButton = await page.$(selector);
          if (joinButton) {
            await joinButton.click();
            console.log('[Bot] Clicked join button via selector:', selector);
            joinClicked = true;
            break;
          }
        } catch {}
      }
    }

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: join(debugDir, 'gmeet_step4_after_join.png') });

    // Wait for actual meeting entry
    console.log('[Bot] Waiting for admission to meeting...');
    let inMeeting = false;

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 1000));

      try {
        const meetingStatus = await page.evaluate(() => {
          const pageText = document.body.innerText.toLowerCase();

          // Check if waiting
          const waiting = pageText.includes('asking to join') ||
                         pageText.includes('waiting for') ||
                         pageText.includes('someone will let you in');

          // Check if in meeting
          const hasEndButton = document.querySelector('button[aria-label*="Leave" i], button[aria-label*="end" i]') !== null;
          const hasMeetingUI = document.querySelector('[data-self-name], [data-participant-id]') !== null;
          const hasChat = document.querySelector('[aria-label*="Chat" i]') !== null;

          return {
            waiting,
            inMeeting: (hasEndButton || hasMeetingUI || hasChat) && !waiting
          };
        });

        if (meetingStatus.inMeeting) {
          console.log('[Bot] Successfully entered Google Meet!');
          inMeeting = true;

          // Enable captions
          await enableGoogleMeetCaptions(page);
          break;
        }

        if (meetingStatus.waiting && i % 10 === 0) {
          console.log(`[Bot] Waiting for host to admit... (${i}s)`);
        }
      } catch (e) {
        console.log('[Bot] Page transitioning...');
      }
    }

    await page.screenshot({ path: join(debugDir, 'gmeet_step5_final.png') });
    console.log('[Bot] Google Meet join sequence completed');
    return inMeeting;
  } catch (error) {
    console.error('[Bot] Error joining Google Meet:', error);
    return false;
  }
}

// Enable Live Captions in Zoom
async function enableZoomCaptions(page: Page): Promise<void> {
  try {
    console.log('[Bot] Attempting to enable Zoom captions...');
    await new Promise(r => setTimeout(r, 2000));

    // Method 1: Click CC button in toolbar
    const ccClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.textContent || '').toLowerCase();
        if (ariaLabel.includes('caption') || ariaLabel.includes('cc') ||
            ariaLabel.includes('subtitle') || ariaLabel.includes('transcript') ||
            text.includes('caption') || text.includes('cc')) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (ccClicked) {
      console.log('[Bot] Clicked captions button in Zoom');
      await new Promise(r => setTimeout(r, 1000));

      // If there's a submenu, click "Show Subtitle" or "Enable"
      await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], button, div'));
        for (const item of menuItems) {
          const text = (item.textContent || '').toLowerCase();
          if (text.includes('show subtitle') || text.includes('enable') || text.includes('turn on')) {
            (item as HTMLElement).click();
            break;
          }
        }
      });
      return;
    }

    // Method 2: Look for "More" menu and enable captions from there
    const moreClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (ariaLabel.includes('more') || ariaLabel === '...') {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (moreClicked) {
      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], button'));
        for (const item of menuItems) {
          const text = (item.textContent || '').toLowerCase();
          if (text.includes('caption') || text.includes('subtitle') || text.includes('transcript')) {
            (item as HTMLElement).click();
            break;
          }
        }
      });
    }

    console.log('[Bot] Zoom captions setup attempted');
  } catch (error) {
    console.log('[Bot] Failed to enable Zoom captions:', error);
  }
}

// Join Zoom (web client)
async function joinZoom(page: Page, meetingUrl: string, botName: string): Promise<boolean> {
  try {
    console.log('[Bot] Navigating to Zoom...');

    // Debug directory
    const debugDir = join(RECORDINGS_DIR, 'debug');
    if (!existsSync(debugDir)) mkdirSync(debugDir, { recursive: true });

    // Convert to web client URL if needed
    let webUrl = meetingUrl;
    if (!meetingUrl.includes('/wc/')) {
      const match = meetingUrl.match(/\/j\/(\d+)/);
      if (match) {
        webUrl = `https://zoom.us/wc/${match[1]}/join`;
      }
    }

    await page.goto(webUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: join(debugDir, 'zoom_step1_initial.png') });
    console.log('[Bot] Debug screenshot saved: zoom_step1_initial.png');

    // Accept cookies if prompted
    try {
      const acceptButton = await page.$('#onetrust-accept-btn-handler');
      if (acceptButton) await acceptButton.click();
    } catch {}

    // Enter name
    try {
      const nameInput = await page.$('#inputname, input[placeholder*="name" i], input[aria-label*="name" i]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await page.keyboard.type(botName, { delay: 50 });
        console.log('[Bot] Entered name:', botName);
      }
    } catch {}

    await page.screenshot({ path: join(debugDir, 'zoom_step2_name.png') });

    // Enter passcode if required
    try {
      const passcodeInput = await page.$('input[placeholder*="passcode" i], input[aria-label*="passcode" i]');
      if (passcodeInput) {
        console.log('[Bot] Passcode required - please provide in meeting URL');
      }
    } catch {}

    // Click Join button
    console.log('[Bot] Looking for Join button...');
    let joinClicked = false;

    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.toLowerCase().includes('join')) {
          await btn.click();
          console.log('[Bot] Clicked join button:', text);
          joinClicked = true;
          break;
        }
      }
    } catch {}

    if (!joinClicked) {
      try {
        const joinButton = await page.$('#joinBtn, button[type="submit"]');
        if (joinButton) {
          await joinButton.click();
          joinClicked = true;
        }
      } catch {}
    }

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: join(debugDir, 'zoom_step3_after_join.png') });

    // Handle audio join dialog
    try {
      const joinAudioButton = await page.$('button[aria-label*="Join Audio" i], button[aria-label*="audio" i]');
      if (joinAudioButton) {
        await joinAudioButton.click();
        await new Promise(r => setTimeout(r, 1000));

        const computerAudioButton = await page.$('button.join-audio-by-voip__join-btn, button[aria-label*="computer audio" i]');
        if (computerAudioButton) await computerAudioButton.click();
      }
    } catch {}

    // Turn off camera and microphone
    console.log('[Bot] Turning off camera and microphone...');
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          if ((ariaLabel.includes('video') || ariaLabel.includes('camera')) &&
              !ariaLabel.includes('off') && !ariaLabel.includes('start')) {
            (btn as HTMLElement).click();
          }
          if (ariaLabel.includes('mute') && !ariaLabel.includes('unmute')) {
            (btn as HTMLElement).click();
          }
        }
      });
    } catch {}

    await page.screenshot({ path: join(debugDir, 'zoom_step4_devices.png') });

    // Wait for actual meeting entry
    console.log('[Bot] Waiting for admission to meeting...');
    let inMeeting = false;

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 1000));

      try {
        const meetingStatus = await page.evaluate(() => {
          const pageText = document.body.innerText.toLowerCase();

          // Check if waiting
          const waiting = pageText.includes('waiting room') ||
                         pageText.includes('please wait') ||
                         pageText.includes('host will let you in');

          // Check if in meeting
          const hasLeaveButton = document.querySelector('button[aria-label*="Leave" i], button[aria-label*="End" i]') !== null;
          const hasMeetingControls = document.querySelector('.meeting-client, .meeting-app, [class*="meeting"]') !== null;
          const hasParticipants = document.querySelector('[aria-label*="Participants" i]') !== null;

          return {
            waiting,
            inMeeting: (hasLeaveButton || hasParticipants) && !waiting
          };
        });

        if (meetingStatus.inMeeting) {
          console.log('[Bot] Successfully entered Zoom meeting!');
          inMeeting = true;

          // Enable captions
          await enableZoomCaptions(page);
          break;
        }

        if (meetingStatus.waiting && i % 10 === 0) {
          console.log(`[Bot] In waiting room, waiting for host... (${i}s)`);
        }
      } catch (e) {
        console.log('[Bot] Page transitioning...');
      }
    }

    await page.screenshot({ path: join(debugDir, 'zoom_step5_final.png') });
    console.log('[Bot] Zoom join sequence completed');
    return inMeeting;
  } catch (error) {
    console.error('[Bot] Error joining Zoom:', error);
    return false;
  }
}

// Join Microsoft Teams
// Enable Live Captions in Teams for transcript capture
async function enableLiveCaptions(page: Page): Promise<void> {
  try {
    console.log('[Bot] Attempting to enable Live Captions...');
    await new Promise(r => setTimeout(r, 2000)); // Wait for meeting UI to stabilize

    // Method 1: Click "More actions" button (three dots) and then "Turn on live captions"
    const moreActionsClicked = await page.evaluate(() => {
      // Find "More actions" or "More" button
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const text = (btn.textContent || '').toLowerCase();
        if (ariaLabel.includes('more action') || ariaLabel.includes('more option') ||
            title.includes('more action') || title.includes('more option') ||
            ariaLabel === 'more' || text === '...' || text === '⋯') {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (moreActionsClicked) {
      console.log('[Bot] Clicked More actions menu');
      await new Promise(r => setTimeout(r, 1000)); // Wait for menu to open

      // Now look for "Turn on live captions" or "Start transcription" option
      const captionsEnabled = await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], button, div[tabindex]'));
        for (const item of menuItems) {
          const text = (item.textContent || '').toLowerCase();
          if (text.includes('live caption') || text.includes('turn on caption') ||
              text.includes('start caption') || text.includes('transcription') ||
              text.includes('start transcript')) {
            (item as HTMLElement).click();
            return text;
          }
        }
        return null;
      });

      if (captionsEnabled) {
        console.log('[Bot] Enabled captions via menu:', captionsEnabled);
        return;
      }
    }

    // Method 2: Try keyboard shortcut (Ctrl+Shift+U for captions in Teams)
    console.log('[Bot] Trying keyboard shortcut for captions...');
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('u');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 500));

    // Method 3: Look for captions button in the meeting bar
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (ariaLabel.includes('caption') || ariaLabel.includes('subtitle') ||
            ariaLabel.includes('cc') || ariaLabel.includes('closed caption')) {
          (btn as HTMLElement).click();
          console.log('Clicked captions button');
          return;
        }
      }
    });

    console.log('[Bot] Live Captions setup attempted');
  } catch (error) {
    console.log('[Bot] Failed to enable live captions:', error);
  }
}

async function joinTeams(page: Page, meetingUrl: string, botName: string): Promise<boolean> {
  try {
    console.log('[Bot] Navigating to Microsoft Teams...');
    await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Take debug screenshot
    const debugDir = join(RECORDINGS_DIR, 'debug');
    if (!existsSync(debugDir)) mkdirSync(debugDir, { recursive: true });
    await page.screenshot({ path: join(debugDir, `teams_step1_initial.png`) });
    console.log('[Bot] Debug screenshot saved: teams_step1_initial.png');

    await new Promise(r => setTimeout(r, 2000));

    // Step 1: Look for and click "Continue on this browser" / "Join on the web" button
    console.log('[Bot] Looking for web join option...');

    const webJoinClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const webJoinTexts = [
        'continue on this browser',
        'join on the web',
        'continue without',
        'use web instead',
        'join anonymously'
      ];

      for (const el of elements) {
        const text = (el.textContent || '').toLowerCase();
        for (const joinText of webJoinTexts) {
          if (text.includes(joinText)) {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });
    console.log('[Bot] Web join button clicked:', webJoinClicked);

    // Step 2: WAIT for pre-join page to load (wait for name input or Join button to appear)
    console.log('[Bot] Waiting for pre-join page to load...');

    let prejoinLoaded = false;
    for (let attempt = 0; attempt < 30; attempt++) { // Wait up to 30 seconds
      await new Promise(r => setTimeout(r, 1000));

      // Check if pre-join page elements are visible (with error handling for navigation)
      try {
        const hasElements = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input'));
          const buttons = Array.from(document.querySelectorAll('button'));

          const hasNameInput = inputs.some(i =>
            (i.placeholder || '').toLowerCase().includes('name') ||
            (i.placeholder || '').toLowerCase().includes('type your')
          );
          const hasJoinButton = buttons.some(b =>
            (b.textContent || '').toLowerCase().includes('join now')
          );

          return hasNameInput || hasJoinButton;
        });

        if (hasElements) {
          console.log(`[Bot] Pre-join page loaded after ${attempt + 1} seconds`);
          prejoinLoaded = true;
          break;
        }
      } catch (e) {
        // Page might be navigating, wait and retry
        console.log(`[Bot] Page navigating... waiting (${attempt}s)`);
        await new Promise(r => setTimeout(r, 1000));
      }

      if (attempt % 5 === 0 && attempt > 0) {
        console.log(`[Bot] Still waiting for pre-join page... (${attempt}s)`);
      }
    }

    await page.screenshot({ path: join(debugDir, `teams_step2_prejoin_loaded.png`) });
    console.log('[Bot] Debug screenshot saved: teams_step2_prejoin_loaded.png');

    if (!prejoinLoaded) {
      console.log('[Bot] Warning: Pre-join page may not have loaded properly');
    }

    // Step 3: Find and fill the name input field using KEYBOARD typing (React-compatible)
    console.log('[Bot] Looking for name input field...');

    // Find and click the name input to focus it
    const nameInputSelector = 'input[placeholder*="name" i], input[placeholder*="Type your" i]';

    try {
      // Wait for the input to be available
      await page.waitForSelector(nameInputSelector, { timeout: 5000 });

      // Click the input to focus it
      await page.click(nameInputSelector);
      await new Promise(r => setTimeout(r, 300));

      // Select all existing text and delete it (use Meta for Mac, Control for others)
      await page.keyboard.down('Meta');
      await page.keyboard.press('a');
      await page.keyboard.up('Meta');
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 200));

      // Type the name character by character (this properly triggers React state updates)
      await page.keyboard.type(botName, { delay: 50 });
      console.log('[Bot] Typed name using keyboard:', botName);

      // Press Tab to move focus away and trigger blur/validation
      await new Promise(r => setTimeout(r, 500));
      await page.keyboard.press('Tab');

    } catch (e) {
      console.log('[Bot] Primary keyboard typing failed, trying alternative...');

      // Alternative: use page.type directly on the selector
      try {
        await page.click(nameInputSelector, { clickCount: 3 });
        await page.type(nameInputSelector, botName, { delay: 50 });
        console.log('[Bot] Used page.type fallback');
      } catch (e2) {
        console.log('[Bot] All name input methods failed');
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: join(debugDir, `teams_step3_after_name.png`) });
    console.log('[Bot] Debug screenshot saved: teams_step3_after_name.png');

    // Verify the name was actually entered
    const nameValue = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="name" i], input[placeholder*="Type your" i]') as HTMLInputElement;
      return input ? input.value : null;
    });
    console.log('[Bot] Name field value after typing:', nameValue);

    // Step 3.5: Turn OFF camera before joining
    console.log('[Bot] Turning off camera...');

    try {
      // Method 1: Click the camera toggle directly using Puppeteer
      // First, find ALL toggle/switch elements on the page
      const toggles = await page.$$('input[type="checkbox"], [role="switch"], [class*="toggle"], [class*="switch"]');
      console.log(`[Bot] Found ${toggles.length} potential toggle elements`);

      // Click the FIRST visible checked toggle (should be camera toggle in video preview)
      let cameraClicked = false;
      for (let i = 0; i < Math.min(toggles.length, 5); i++) {
        try {
          const toggle = toggles[i];
          const box = await toggle.boundingBox();
          if (box && box.width > 0 && box.height > 0) {
            // This toggle is visible - click it
            await toggle.click();
            console.log(`[Bot] Clicked toggle ${i} at position (${box.x}, ${box.y})`);
            cameraClicked = true;
            break;
          }
        } catch (e) {
          // Continue to next toggle
        }
      }

      // Method 2: If no toggle found, try clicking by finding the video area and clicking the toggle there
      if (!cameraClicked) {
        console.log('[Bot] Trying to find camera toggle in video preview...');

        // Look for the camera/video button or icon
        const cameraButtons = await page.$$('button');
        for (const btn of cameraButtons) {
          const ariaLabel = await btn.evaluate(el => el.getAttribute('aria-label') || '');
          if (ariaLabel.toLowerCase().includes('camera') || ariaLabel.toLowerCase().includes('video')) {
            // Found camera button - look for toggle nearby
            const box = await btn.boundingBox();
            if (box) {
              // Click slightly to the right of the camera button (where toggle usually is)
              await page.mouse.click(box.x + box.width + 20, box.y + box.height / 2);
              console.log('[Bot] Clicked near camera button');
              cameraClicked = true;
              break;
            }
          }
        }
      }

      // Method 3: Select "Don't use audio" radio button to disable audio at least
      try {
        await page.evaluate(() => {
          const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
          for (const radio of radios) {
            const label = radio.closest('label')?.textContent || '';
            const nearby = radio.closest('div')?.textContent || '';
            if (label.toLowerCase().includes("don't use") || nearby.toLowerCase().includes("don't use audio")) {
              (radio as HTMLElement).click();
              console.log('Selected "Don\'t use audio" option');
            }
          }
        });
      } catch (e) {}

      console.log('[Bot] Camera toggle attempted:', cameraClicked);

    } catch (e) {
      console.log('[Bot] Camera toggle failed:', e);
    }

    // Turn off microphone
    try {
      const micOff = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const title = (btn.getAttribute('title') || '').toLowerCase();
          if (ariaLabel.includes('microphone') || ariaLabel.includes('mic') || ariaLabel.includes('mute') ||
              title.includes('microphone') || title.includes('mic')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      console.log('[Bot] Microphone toggle clicked:', micOff);
    } catch (e) {
      console.log('[Bot] Microphone toggle failed');
    }

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: join(debugDir, `teams_step3b_camera_off.png`) });

    // Step 4: Click "Join now" button using direct Puppeteer click
    console.log('[Bot] Looking for Join now button...');

    await new Promise(r => setTimeout(r, 500));

    // Find and click Join now button using Puppeteer (more reliable than evaluate)
    let joinClicked = false;
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.toLowerCase().includes('join now')) {
          // Use Puppeteer's click which simulates real mouse events
          await btn.click();
          console.log('[Bot] Clicked Join now button via Puppeteer');
          joinClicked = true;
          break;
        }
      }
    } catch (e) {
      console.log('[Bot] Puppeteer join click failed:', e);
    }

    // Fallback: try clicking by coordinates
    if (!joinClicked) {
      try {
        // Find the button's position and click it
        const btnBox = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            if ((btn.textContent || '').toLowerCase().includes('join now')) {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            }
          }
          return null;
        });

        if (btnBox) {
          await page.mouse.click(btnBox.x, btnBox.y);
          console.log('[Bot] Clicked Join now via mouse coordinates');
          joinClicked = true;
        }
      } catch (e) {
        console.log('[Bot] Coordinate click failed');
      }
    }

    console.log('[Bot] Join now clicked:', joinClicked);

    await new Promise(r => setTimeout(r, 2000));

    // Handle "Continue without audio or video" dialog if it appears
    try {
      const continueClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase();
          if (text.includes('continue without') || text.includes('continue anyway')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      if (continueClicked) {
        console.log('[Bot] Clicked "Continue without audio or video"');
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {}

    await page.screenshot({ path: join(debugDir, `teams_step4_after_join.png`) });
    console.log('[Bot] Debug screenshot saved: teams_step4_after_join.png');

    // Wait for actual meeting entry (not just lobby)
    console.log('[Bot] Waiting for admission to meeting...');

    let inMeeting = false;
    for (let i = 0; i < 120; i++) { // Wait up to 2 minutes for admission
      await new Promise(r => setTimeout(r, 1000));

      try {
        // Check if we're in the actual meeting (look for meeting indicators)
        const meetingStatus = await page.evaluate(() => {
          const pageText = document.body.innerText.toLowerCase();

          // Check if still in lobby
          const inLobby = pageText.includes('someone will let you in') ||
                         pageText.includes('waiting for') ||
                         pageText.includes('let you in shortly');

          // Check if in actual meeting (look for meeting controls)
          const hasLeaveButton = document.querySelector('button[aria-label*="Leave" i], button[aria-label*="Hang up" i]') !== null;
          const hasMeetingControls = document.querySelector('[data-tid="meeting-control-bar"]') !== null;
          const hasParticipants = pageText.includes('participants') || pageText.includes('in this meeting');
          const hasChat = document.querySelector('[aria-label*="Chat" i]') !== null;

          // Still on pre-join page
          const onPreJoin = document.querySelector('input[placeholder*="name" i]') !== null &&
                           document.querySelector('button')?.textContent?.toLowerCase().includes('join now');

          return {
            inLobby,
            inMeeting: (hasLeaveButton || hasMeetingControls || hasChat) && !onPreJoin && !inLobby,
            onPreJoin
          };
        });

        if (meetingStatus.inMeeting) {
          console.log('[Bot] Successfully entered the meeting!');
          inMeeting = true;

          // Enable Live Captions for transcript capture
          await enableLiveCaptions(page);

          break;
        }

        if (meetingStatus.inLobby) {
          if (i % 10 === 0) {
            console.log(`[Bot] Still in lobby, waiting for host to admit... (${i}s)`);
          }
        } else if (meetingStatus.onPreJoin) {
          console.log('[Bot] Still on pre-join page, trying to click Join now again...');
          // Try clicking Join now again
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const btn of buttons) {
              if ((btn.textContent || '').toLowerCase().includes('join now')) {
                (btn as HTMLElement).click();
                break;
              }
            }
          });
        }
      } catch (e) {
        // Page might be navigating
        console.log('[Bot] Page transitioning...');
      }

      // Take periodic screenshots
      if (i === 30 || i === 60) {
        await page.screenshot({ path: join(debugDir, `teams_waiting_${i}s.png`) });
      }
    }

    await page.screenshot({ path: join(debugDir, `teams_step5_final.png`) });
    console.log('[Bot] Debug screenshot saved: teams_step5_final.png');

    if (!inMeeting) {
      console.log('[Bot] Warning: May not have fully entered meeting (timeout or still in lobby)');
    }

    console.log('[Bot] Teams join sequence completed');
    return inMeeting;
  } catch (error) {
    console.error('[Bot] Error joining Teams:', error);
    return false;
  }
}

// Enable Live Captions in Webex
async function enableWebexCaptions(page: Page): Promise<void> {
  try {
    console.log('[Bot] Attempting to enable Webex captions...');
    await new Promise(r => setTimeout(r, 2000));

    // Method 1: Click CC/Captions button in toolbar
    const ccClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const text = (btn.textContent || '').toLowerCase();
        if (ariaLabel.includes('caption') || ariaLabel.includes('closed caption') ||
            ariaLabel.includes('subtitle') || title.includes('caption') ||
            text.includes('cc') || text.includes('caption')) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (ccClicked) {
      console.log('[Bot] Clicked captions button in Webex');
      await new Promise(r => setTimeout(r, 1000));

      // Enable if there's a toggle
      await page.evaluate(() => {
        const toggles = Array.from(document.querySelectorAll('[role="switch"], input[type="checkbox"], button'));
        for (const toggle of toggles) {
          const text = (toggle.textContent || '').toLowerCase();
          const ariaLabel = (toggle.getAttribute('aria-label') || '').toLowerCase();
          if (text.includes('enable') || text.includes('turn on') ||
              ariaLabel.includes('enable') || ariaLabel.includes('turn on')) {
            (toggle as HTMLElement).click();
            break;
          }
        }
      });
      return;
    }

    // Method 2: Look for "More options" menu
    const moreClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        if (ariaLabel.includes('more') || title.includes('more') || ariaLabel.includes('...')) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (moreClicked) {
      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], button, div'));
        for (const item of items) {
          const text = (item.textContent || '').toLowerCase();
          if (text.includes('caption') || text.includes('subtitle') || text.includes('transcript')) {
            (item as HTMLElement).click();
            break;
          }
        }
      });
    }

    console.log('[Bot] Webex captions setup attempted');
  } catch (error) {
    console.log('[Bot] Failed to enable Webex captions:', error);
  }
}

// Join Webex Meeting
async function joinWebex(page: Page, meetingUrl: string, botName: string): Promise<boolean> {
  try {
    console.log('[Bot] Navigating to Webex...');

    // Debug directory
    const debugDir = join(RECORDINGS_DIR, 'debug');
    if (!existsSync(debugDir)) mkdirSync(debugDir, { recursive: true });

    await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: join(debugDir, 'webex_step1_initial.png') });
    console.log('[Bot] Debug screenshot saved: webex_step1_initial.png');

    // Look for "Join from browser" or similar option
    const browserJoinClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a, button, [role="button"]'));
      const joinTexts = ['join from browser', 'join from your browser', 'browser', 'web app', 'continue without'];
      for (const el of elements) {
        const text = (el.textContent || '').toLowerCase();
        for (const joinText of joinTexts) {
          if (text.includes(joinText)) {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });
    console.log('[Bot] Browser join option clicked:', browserJoinClicked);

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: join(debugDir, 'webex_step2_browser.png') });

    // Enter name
    try {
      const nameInput = await page.$('input[placeholder*="name" i], input[aria-label*="name" i], input[id*="name" i]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await page.keyboard.type(botName, { delay: 50 });
        console.log('[Bot] Entered name:', botName);
      }
    } catch {}

    // Enter email if required
    try {
      const emailInput = await page.$('input[placeholder*="email" i], input[type="email"], input[aria-label*="email" i]');
      if (emailInput) {
        await emailInput.click({ clickCount: 3 });
        await page.keyboard.type('bot@meeting-agent.local', { delay: 50 });
        console.log('[Bot] Entered email');
      }
    } catch {}

    await page.screenshot({ path: join(debugDir, 'webex_step3_name.png') });

    // Turn off camera and microphone
    console.log('[Bot] Turning off camera and microphone...');
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const title = (btn.getAttribute('title') || '').toLowerCase();
          // Turn off video/camera
          if ((ariaLabel.includes('video') || ariaLabel.includes('camera') ||
               title.includes('video') || title.includes('camera')) &&
              !ariaLabel.includes('off') && !title.includes('off')) {
            (btn as HTMLElement).click();
          }
          // Mute audio
          if ((ariaLabel.includes('mute') || ariaLabel.includes('microphone') ||
               title.includes('mute') || title.includes('microphone')) &&
              !ariaLabel.includes('unmute')) {
            (btn as HTMLElement).click();
          }
        }
      });
    } catch {}

    await page.screenshot({ path: join(debugDir, 'webex_step4_devices.png') });

    // Click Join button
    console.log('[Bot] Looking for Join button...');
    let joinClicked = false;

    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && (text.toLowerCase().includes('join meeting') ||
                     text.toLowerCase().includes('join') ||
                     text.toLowerCase().includes('start'))) {
          await btn.click();
          console.log('[Bot] Clicked join button:', text);
          joinClicked = true;
          break;
        }
      }
    } catch {}

    if (!joinClicked) {
      try {
        const joinButton = await page.$('button[data-test*="join" i], button[class*="join" i]');
        if (joinButton) {
          await joinButton.click();
          joinClicked = true;
        }
      } catch {}
    }

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: join(debugDir, 'webex_step5_after_join.png') });

    // Wait for actual meeting entry
    console.log('[Bot] Waiting for admission to meeting...');
    let inMeeting = false;

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 1000));

      try {
        const meetingStatus = await page.evaluate(() => {
          const pageText = document.body.innerText.toLowerCase();

          // Check if waiting
          const waiting = pageText.includes('waiting') ||
                         pageText.includes('lobby') ||
                         pageText.includes('host will let you in') ||
                         pageText.includes('please wait');

          // Check if in meeting
          const hasLeaveButton = document.querySelector('button[aria-label*="Leave" i], button[aria-label*="End" i], button[title*="Leave" i]') !== null;
          const hasMeetingControls = document.querySelector('[class*="meeting-control"], [class*="control-bar"]') !== null;
          const hasParticipants = document.querySelector('[aria-label*="Participants" i], [title*="Participants" i]') !== null;

          return {
            waiting,
            inMeeting: (hasLeaveButton || hasMeetingControls || hasParticipants) && !waiting
          };
        });

        if (meetingStatus.inMeeting) {
          console.log('[Bot] Successfully entered Webex meeting!');
          inMeeting = true;

          // Enable captions
          await enableWebexCaptions(page);
          break;
        }

        if (meetingStatus.waiting && i % 10 === 0) {
          console.log(`[Bot] In lobby, waiting for host... (${i}s)`);
        }
      } catch (e) {
        console.log('[Bot] Page transitioning...');
      }
    }

    await page.screenshot({ path: join(debugDir, 'webex_step6_final.png') });
    console.log('[Bot] Webex join sequence completed');
    return inMeeting;
  } catch (error) {
    console.error('[Bot] Error joining Webex:', error);
    return false;
  }
}

// Transcribe audio using OpenAI Whisper API
async function transcribeWithWhisper(audioFilePath: string): Promise<TranscriptSegment[]> {
  const openai = getOpenAIClient();
  if (!openai) {
    console.log('[Bot] OpenAI client not available for Whisper transcription');
    return [];
  }

  try {
    console.log('[Bot] Transcribing audio with Whisper...');

    if (!existsSync(audioFilePath)) {
      console.log('[Bot] Audio file not found:', audioFilePath);
      return [];
    }

    const audioBuffer = readFileSync(audioFilePath);
    if (audioBuffer.length < 1000) {
      console.log('[Bot] Audio file too small, skipping transcription');
      return [];
    }

    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    console.log('[Bot] Whisper transcription complete');

    const segments = (transcription as any).segments || [];
    return segments.map((seg: any) => ({
      speaker: 'Speaker',
      text: seg.text?.trim() || '',
      timestamp: Math.floor((seg.start || 0) * 1000),
      confidence: seg.confidence || 0.9
    }));
  } catch (error: any) {
    console.error('[Bot] Whisper transcription error:', error.message);
    return [];
  }
}

// Convert frames to video using FFmpeg, optionally merge with audio
async function convertFramesToVideo(framesDir: string, videoPath: string, fps: number = 2, audioPath?: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      console.log('[Bot] Converting frames to video...');

      let ffmpegArgs: string[];

      if (audioPath && existsSync(audioPath)) {
        // Merge video frames with audio
        console.log('[Bot] Merging video with audio...');
        ffmpegArgs = [
          '-framerate', fps.toString(),
          '-i', join(framesDir, 'frame_%06d.png'),
          '-i', audioPath,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-crf', '23',
          '-preset', 'fast',
          '-shortest',
          '-y',
          videoPath
        ];
      } else {
        // Video only (no audio)
        ffmpegArgs = [
          '-framerate', fps.toString(),
          '-i', join(framesDir, 'frame_%06d.png'),
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-crf', '23',
          '-preset', 'fast',
          '-y',
          videoPath
        ];
      }

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('[Bot] Video conversion complete (with audio)');
          resolve(true);
        } else {
          console.error('[Bot] FFmpeg exited with code:', code);
          resolve(false);
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('[Bot] FFmpeg error:', err);
        resolve(false);
      });

      setTimeout(() => {
        ffmpeg.kill();
        resolve(false);
      }, 300000);
    } catch (error) {
      console.error('[Bot] Error converting frames:', error);
      resolve(false);
    }
  });
}

// Main Meeting Bot Manager
export class SelfHostedMeetingBot {

  // Join a meeting with full recording capabilities
  async joinMeeting(meetingId: string, meetingUrl: string, options?: { botName?: string }): Promise<any> {
    const sessionId = uuidv4();
    const { platform } = detectPlatform(meetingUrl);
    const botName = options?.botName || BOT_NAME;

    console.log(`[Bot] Starting session ${sessionId} for ${platform} meeting`);
    console.log(`[Bot] Meeting URL: ${meetingUrl}`);

    try {
      // Launch browser in headless mode (invisible - no popup)
      console.log(`[Bot] Launching headless browser (invisible)...`);

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--autoplay-policy=no-user-gesture-required'
        ],
        defaultViewport: { width: 1920, height: 1080 }
      });

      const page = await browser.newPage();

      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const context = browser.defaultBrowserContext();
      await context.overridePermissions(new URL(meetingUrl).origin, [
        'microphone',
        'camera',
        'notifications'
      ]);

      // Create CDP session for screen recording
      const cdpSession = await page.createCDPSession();

      // Create frames directory for this session
      const framesDir = join(RECORDINGS_DIR, `${sessionId}_frames`);
      mkdirSync(framesDir, { recursive: true });

      // Create session
      const session: MeetingSession = {
        id: sessionId,
        meetingId,
        meetingUrl,
        platform,
        browser,
        page,
        cdpSession,
        ffmpegProcess: null,
        screencastFrames: [],
        status: 'joining',
        startTime: new Date(),
        transcriptSegments: [],
        videoFilePath: join(RECORDINGS_DIR, `${sessionId}_video.mp4`),
        audioFilePath: join(RECORDINGS_DIR, `${sessionId}_audio.mp3`),
        framesDir,
        screenshotPaths: [],
        captionInterval: null,
        screencastInterval: null,
        isRecording: false,
        frameCount: 0
      };

      activeSessions.set(meetingId, session);

      // Join based on platform
      let joinSuccess = false;
      switch (platform) {
        case 'google_meet':
          joinSuccess = await joinGoogleMeet(page, meetingUrl, botName);
          break;
        case 'zoom':
          joinSuccess = await joinZoom(page, meetingUrl, botName);
          break;
        case 'teams':
          joinSuccess = await joinTeams(page, meetingUrl, botName);
          break;
        case 'webex':
          joinSuccess = await joinWebex(page, meetingUrl, botName);
          break;
        default:
          console.log('[Bot] Unknown platform, attempting generic join...');
          await page.goto(meetingUrl, { waitUntil: 'networkidle2' });
          joinSuccess = true;
      }

      if (joinSuccess) {
        session.status = 'in_meeting';

        await prisma.meeting.update({
          where: { id: meetingId },
          data: { status: 'in_progress' }
        });

        // Start screen recording using periodic screenshots
        await this.startRecording(session);

        // Persist session so it survives server restart
        persistSession(meetingId, {
          meetingId,
          sessionId,
          platform,
          framesDir: session.framesDir,
          startTime: session.startTime.toISOString(),
          frameCount: 0
        });

        // Start caption capture
        this.startCaptionCapture(session);

        console.log(`[Bot] Successfully joined meeting and started recording`);

        return {
          success: true,
          sessionId,
          platform,
          message: `Successfully joined ${platform} meeting with recording enabled`,
          recordingStarted: session.isRecording
        };
      } else {
        throw new Error('Failed to join meeting');
      }
    } catch (error: any) {
      console.error('[Bot] Error joining meeting:', error);

      const session = activeSessions.get(meetingId);
      if (session?.browser) {
        await session.browser.close();
      }
      activeSessions.delete(meetingId);

      return {
        success: false,
        error: error.message || 'Failed to join meeting'
      };
    }
  }

  // Start screen recording using periodic screenshots (CDP screencast)
  // Start audio recording using FFmpeg (captures system audio)
  private startAudioRecording(session: MeetingSession): void {
    try {
      console.log('[Bot] Starting audio recording for Whisper transcription...');

      // On macOS, capture system audio (requires BlackHole or similar virtual audio device)
      // On Linux, use PulseAudio
      // Default audio device index - can be configured via AUDIO_DEVICE env var
      const audioDevice = process.env.AUDIO_DEVICE || '0';

      let ffmpegArgs: string[];
      if (process.platform === 'darwin') {
        // macOS - use avfoundation
        // To capture system audio, you need BlackHole installed and configured
        // Otherwise this captures microphone input
        ffmpegArgs = [
          '-f', 'avfoundation',
          '-i', `:${audioDevice}`, // Audio only (: prefix means audio device)
          '-acodec', 'libmp3lame',
          '-ar', '16000', // 16kHz sample rate for Whisper
          '-ac', '1', // Mono
          '-b:a', '64k',
          '-y',
          session.audioFilePath
        ];
      } else {
        // Linux - use PulseAudio
        ffmpegArgs = [
          '-f', 'pulse',
          '-i', 'default',
          '-acodec', 'libmp3lame',
          '-ar', '16000',
          '-ac', '1',
          '-b:a', '64k',
          '-y',
          session.audioFilePath
        ];
      }

      session.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      session.ffmpegProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        // Only log errors, not progress
        if (output.includes('Error') || output.includes('error') || output.includes('Invalid')) {
          console.log('[Bot] FFmpeg audio:', output.substring(0, 200));
        }
      });

      session.ffmpegProcess.on('error', (err: Error) => {
        console.log('[Bot] FFmpeg audio recording not available:', err.message);
        console.log('[Bot] Tip: Install BlackHole on macOS for system audio capture');
      });

      session.ffmpegProcess.on('close', (code: number | null) => {
        console.log(`[Bot] Audio recording stopped with code: ${code}`);
      });

      console.log(`[Bot] Audio recording started: ${session.audioFilePath}`);
    } catch (error: any) {
      console.log('[Bot] Audio recording not available:', error.message);
      console.log('[Bot] Bot will rely on caption scraping for transcription');
    }
  }

  // Stop audio recording and transcribe with Whisper
  private async stopAudioRecording(session: MeetingSession): Promise<void> {
    if (session.ffmpegProcess) {
      console.log('[Bot] Stopping audio recording...');

      // Send quit command to FFmpeg
      try {
        session.ffmpegProcess.stdin?.write('q');
      } catch (e) {}

      // Give it a moment to finish writing
      await new Promise(r => setTimeout(r, 500));

      // Force kill if still running
      try {
        session.ffmpegProcess.kill('SIGTERM');
      } catch (e) {}

      session.ffmpegProcess = null;

      // Wait for file to be finalized
      await new Promise(r => setTimeout(r, 1000));

      // Transcribe with Whisper if audio file exists and has content
      if (existsSync(session.audioFilePath)) {
        const stats = require('fs').statSync(session.audioFilePath);
        console.log(`[Bot] Audio file size: ${stats.size} bytes`);

        if (stats.size > 5000) { // At least 5KB of audio
          console.log('[Bot] Transcribing audio with OpenAI Whisper...');
          try {
            const segments = await transcribeWithWhisper(session.audioFilePath);
            if (segments.length > 0) {
              session.transcriptSegments.push(...segments);
              console.log(`[Bot] Whisper transcription added ${segments.length} segments`);
            } else {
              console.log('[Bot] Whisper returned no segments (audio may be silent or unclear)');
            }
          } catch (error: any) {
            console.error('[Bot] Whisper transcription failed:', error.message);
          }
        } else {
          console.log('[Bot] Audio file too small for transcription');
        }
      } else {
        console.log('[Bot] No audio file found for transcription');
      }
    }
  }

  private async startRecording(session: MeetingSession): Promise<void> {
    if (!session.page || !session.cdpSession) return;

    try {
      console.log('[Bot] Starting screen recording...');

      session.isRecording = true;
      session.frameCount = 0;
      session.status = 'recording';

      // Start audio recording for Whisper transcription
      this.startAudioRecording(session);

      // Use Page.screencast for recording frames
      session.screencastInterval = setInterval(async () => {
        if (!session.isRecording || !session.page) return;

        try {
          const frameNumber = String(session.frameCount).padStart(6, '0');
          const framePath = join(session.framesDir, `frame_${frameNumber}.png`);

          await session.page.screenshot({
            path: framePath,
            type: 'png'
          });

          session.frameCount++;

          // Log progress every 30 frames (15 seconds at 2fps)
          if (session.frameCount % 30 === 0) {
            console.log(`[Bot] Recording: ${session.frameCount} frames captured`);
          }
        } catch (error) {
          // Page might have navigated, ignore
        }
      }, 500); // 2 FPS capture rate

      console.log(`[Bot] Recording started, saving frames to: ${session.framesDir}`);
    } catch (error) {
      console.error('[Bot] Error starting recording:', error);
      session.isRecording = false;
    }
  }

  // Stop recording
  private async stopRecording(session: MeetingSession): Promise<void> {
    if (!session.isRecording) return;

    try {
      console.log('[Bot] Stopping screen recording...');

      session.isRecording = false;

      if (session.screencastInterval) {
        clearInterval(session.screencastInterval);
        session.screencastInterval = null;
      }

      // Stop audio recording and transcribe with Whisper
      await this.stopAudioRecording(session);

      // Convert captured frames to video with audio
      if (session.frameCount > 0) {
        console.log(`[Bot] Converting ${session.frameCount} frames to video with audio...`);
        await convertFramesToVideo(session.framesDir, session.videoFilePath, 2, session.audioFilePath);
      }

      console.log(`[Bot] Recording saved: ${session.videoFilePath}`);
    } catch (error) {
      console.error('[Bot] Error stopping recording:', error);
    }
  }

  // Capture captions from meeting
  private startCaptionCapture(session: MeetingSession): void {
    session.captionInterval = setInterval(async () => {
      if (session.status !== 'in_meeting' && session.status !== 'recording') {
        if (session.captionInterval) clearInterval(session.captionInterval);
        return;
      }

      try {
        if (session.page) {
          const content = await session.page.evaluate(() => {
            // Google Meet captions
            const gmeetCaptions = Array.from(document.querySelectorAll('[class*="iOzk7"]'))
              .map(el => ({
                speaker: el.querySelector('[class*="zs0WlR"]')?.textContent?.trim() || 'Speaker',
                text: el.querySelector('[class*="iTTPOb"]')?.textContent?.trim() || ''
              }))
              .filter(c => c.text);

            // Zoom captions
            const zoomCaptions = Array.from(document.querySelectorAll('.caption-text, [class*="caption"]'))
              .map(el => ({
                speaker: 'Speaker',
                text: el.textContent?.trim() || ''
              }))
              .filter(c => c.text);

            // Teams captions - multiple selector strategies
            const teamsCaptions: Array<{speaker: string, text: string}> = [];

            // Strategy 1: data-tid selectors
            document.querySelectorAll('[data-tid="closed-caption-text"]').forEach(el => {
              const speaker = el.querySelector('[data-tid="closed-caption-name"]')?.textContent?.trim() || 'Speaker';
              const text = el.querySelector('[data-tid="closed-caption-content"]')?.textContent?.trim() || el.textContent?.trim() || '';
              if (text) teamsCaptions.push({ speaker, text });
            });

            // Strategy 2: Live captions container
            document.querySelectorAll('[data-tid="live-captions-container"] > div, [class*="caption" i], [class*="subtitle" i]').forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text && text.length > 2 && !teamsCaptions.some(c => c.text === text)) {
                teamsCaptions.push({ speaker: 'Speaker', text });
              }
            });

            // Strategy 3: Transcript panel
            document.querySelectorAll('[data-tid="transcript-segment"], [class*="transcript" i] [class*="segment" i]').forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text && text.length > 2 && !teamsCaptions.some(c => c.text === text)) {
                teamsCaptions.push({ speaker: 'Speaker', text });
              }
            });

            // Strategy 4: Any element with aria-live (captions often use this)
            document.querySelectorAll('[aria-live="polite"], [aria-live="assertive"]').forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text && text.length > 5 && text.length < 500 && !teamsCaptions.some(c => c.text === text)) {
                // Avoid UI elements
                if (!text.toLowerCase().includes('mute') && !text.toLowerCase().includes('camera')) {
                  teamsCaptions.push({ speaker: 'Speaker', text });
                }
              }
            });

            // Webex captions - multiple selector strategies
            const webexCaptions: Array<{speaker: string, text: string}> = [];

            // Strategy 1: Webex caption container
            document.querySelectorAll('[class*="caption" i], [class*="subtitle" i], [data-test*="caption" i]').forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text && text.length > 2 && !webexCaptions.some(c => c.text === text)) {
                webexCaptions.push({ speaker: 'Speaker', text });
              }
            });

            // Strategy 2: Webex transcript panel
            document.querySelectorAll('[class*="transcript" i] [class*="text" i], [class*="transcript" i] [class*="content" i]').forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text && text.length > 2 && !webexCaptions.some(c => c.text === text)) {
                webexCaptions.push({ speaker: 'Speaker', text });
              }
            });

            // Strategy 3: Webex closed captions overlay
            document.querySelectorAll('[class*="closed-caption" i], [class*="cc-text" i]').forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text && text.length > 2 && !webexCaptions.some(c => c.text === text)) {
                webexCaptions.push({ speaker: 'Speaker', text });
              }
            });

            return {
              captions: [...gmeetCaptions, ...zoomCaptions, ...teamsCaptions, ...webexCaptions]
            };
          });

          for (const caption of content.captions) {
            const lastSegment = session.transcriptSegments[session.transcriptSegments.length - 1];
            if (!lastSegment || lastSegment.text !== caption.text) {
              console.log(`[Bot] Caption captured: "${caption.text.substring(0, 50)}..." from ${caption.speaker}`);
              session.transcriptSegments.push({
                speaker: caption.speaker,
                text: caption.text,
                timestamp: Date.now() - session.startTime.getTime(),
                confidence: 0.95
              });
            }
          }

          // Log caption count periodically
          if (session.transcriptSegments.length > 0 && session.transcriptSegments.length % 5 === 0) {
            console.log(`[Bot] Total captions captured: ${session.transcriptSegments.length}`);
          }
        }
      } catch (error) {
        // Page might have navigated, ignore
      }
    }, 2000);
  }

  // Take screenshot
  async takeScreenshot(meetingId: string): Promise<string | null> {
    const session = activeSessions.get(meetingId);
    if (!session?.page) return null;

    try {
      const screenshotPath = join(RECORDINGS_DIR, `${session.id}_screenshot_${Date.now()}.png`);
      await session.page.screenshot({ path: screenshotPath, fullPage: false });
      session.screenshotPaths.push(screenshotPath);
      console.log(`[Bot] Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error('[Bot] Screenshot error:', error);
      return null;
    }
  }

  // Leave meeting and process recordings
  async leaveMeeting(meetingId: string): Promise<any> {
    let session = activeSessions.get(meetingId);

    // If no active session, check persisted sessions (for server restart recovery)
    if (!session) {
      const persisted = loadPersistedSessions().get(meetingId);
      if (persisted) {
        console.log(`[Bot] Recovering session from persistence: ${meetingId}`);
        // Create minimal session for video conversion
        return this.recoverAndProcessSession(persisted);
      }
      return { success: false, error: 'No active session for this meeting' };
    }

    console.log(`[Bot] Leaving meeting: ${meetingId}`);
    session.status = 'ended';

    try {
      if (session.captionInterval) {
        clearInterval(session.captionInterval);
      }

      await this.takeScreenshot(meetingId);

      await this.stopRecording(session);

      if (session.browser) {
        await session.browser.close();
      }

      const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);

      // Combine caption transcript
      const allTranscripts = [...session.transcriptSegments];
      allTranscripts.sort((a, b) => a.timestamp - b.timestamp);

      const transcriptText = allTranscripts.length > 0
        ? allTranscripts
            .map(seg => `[${this.formatTimestamp(seg.timestamp)}] ${seg.speaker}: ${seg.text}`)
            .join('\n')
        : 'No transcript captured. Enable live captions in the meeting for best results.';

      await prisma.transcript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          content: transcriptText,
          language: 'en',
          duration
        },
        update: {
          content: transcriptText,
          duration
        }
      });

      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'completed',
          endTime: new Date()
        }
      });

      activeSessions.delete(meetingId);
      removePersistedSession(meetingId);

      console.log(`[Bot] Meeting ended. Duration: ${duration}s, Frames: ${session.frameCount}, Transcript segments: ${allTranscripts.length}`);

      return {
        success: true,
        duration,
        transcript: transcriptText,
        transcriptSegments: allTranscripts,
        videoPath: existsSync(session.videoFilePath) ? session.videoFilePath : null,
        screenshots: session.screenshotPaths,
        frameCount: session.frameCount
      };
    } catch (error: any) {
      console.error('[Bot] Error leaving meeting:', error);
      activeSessions.delete(meetingId);
      removePersistedSession(meetingId);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get meeting status
  async getStatus(meetingId: string): Promise<any> {
    const session = activeSessions.get(meetingId);
    if (!session) {
      return { status: 'not_active' };
    }

    return {
      status: session.status,
      platform: session.platform,
      duration: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
      isRecording: session.isRecording,
      frameCount: session.frameCount,
      transcriptCount: session.transcriptSegments.length,
      transcript: session.transcriptSegments.slice(-20).map(seg => ({
        speaker: seg.speaker,
        text: seg.text,
        timestamp: this.formatTimestamp(seg.timestamp)
      })),
      videoPath: session.videoFilePath,
      screenshotCount: session.screenshotPaths.length
    };
  }

  // Toggle recording
  async toggleRecording(meetingId: string): Promise<{ isRecording: boolean }> {
    const session = activeSessions.get(meetingId);
    if (!session) {
      return { isRecording: false };
    }

    if (session.isRecording) {
      await this.stopRecording(session);
    } else {
      await this.startRecording(session);
    }

    return { isRecording: session.isRecording };
  }

  // Format timestamp
  private formatTimestamp(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  // Recover and process session after server restart
  private async recoverAndProcessSession(persisted: PersistedSession): Promise<any> {
    const { meetingId, sessionId, framesDir } = persisted;

    console.log(`[Bot] Processing recovered session: ${sessionId}`);

    try {
      // Check if frames exist
      if (!existsSync(framesDir)) {
        removePersistedSession(meetingId);
        return { success: false, error: 'Frames directory not found' };
      }

      const { readdirSync } = await import('fs');
      const frames = readdirSync(framesDir).filter((f: string) => f.endsWith('.png'));

      if (frames.length === 0) {
        removePersistedSession(meetingId);
        return { success: false, error: 'No frames found' };
      }

      // Convert frames to video
      const videoPath = join(RECORDINGS_DIR, `${sessionId}_video.mp4`);
      console.log(`[Bot] Converting ${frames.length} frames to video...`);

      await new Promise<void>((resolve, reject) => {
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
            console.log(`[Bot] Video created: ${videoPath}`);
            resolve();
          } else {
            reject(new Error('FFmpeg failed'));
          }
        });

        ffmpeg.on('error', reject);
      });

      const duration = Math.floor(frames.length / 2); // 2 FPS

      // Update meeting in database
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          recordingUrl: videoPath,
          status: 'completed',
          endTime: new Date()
        }
      });

      // Clean up persisted session
      removePersistedSession(meetingId);

      return {
        success: true,
        meetingId,
        duration,
        videoPath,
        frameCount: frames.length,
        transcript: 'Session recovered after server restart. No live transcript available.',
        message: 'Session recovered and video created from captured frames.'
      };
    } catch (error: any) {
      console.error('[Bot] Recovery error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const selfHostedBot = new SelfHostedMeetingBot();
