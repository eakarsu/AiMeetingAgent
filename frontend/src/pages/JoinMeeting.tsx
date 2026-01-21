import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  StopIcon,
  PlayIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CameraIcon,
  FilmIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

interface MeetingStatus {
  status: string;
  platform: string;
  duration: number;
  isRecording: boolean;
  transcriptCount: number;
  screenshotCount: number;
  transcript: Array<{ speaker: string; text: string; timestamp: string }>;
}

export default function JoinMeeting() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<any>(null);
  const [status, setStatus] = useState<MeetingStatus | null>(null);
  const [error, setError] = useState('');
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const navigate = useNavigate();

  // Check for active sessions on page load (recovery after server restart)
  useEffect(() => {
    const checkActiveSessions = async () => {
      try {
        const response = await api.get('/bot/active-sessions');
        if (response.data && response.data.length > 0) {
          const session = response.data[0];
          console.log('Found active session:', session);
          setActiveMeeting({
            meetingId: session.meetingId,
            platform: session.platform,
            sessionId: session.sessionId
          });
        }
      } catch (err) {
        console.error('Failed to check active sessions:', err);
      }
    };
    checkActiveSessions();
  }, []);

  // Poll for status when meeting is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeMeeting) {
      interval = setInterval(async () => {
        try {
          const response = await api.get(`/bot/status/${activeMeeting.meetingId}`);
          setStatus(response.data);
        } catch (err) {
          console.error('Status poll error:', err);
        }
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [activeMeeting]);

  const detectPlatform = (url: string) => {
    if (url.includes('zoom')) return { name: 'Zoom', icon: '📹', color: 'bg-blue-500' };
    if (url.includes('meet.google')) return { name: 'Google Meet', icon: '🎥', color: 'bg-green-500' };
    if (url.includes('teams')) return { name: 'Microsoft Teams', icon: '💬', color: 'bg-purple-500' };
    if (url.includes('webex')) return { name: 'Webex', icon: '🌐', color: 'bg-red-500' };
    return { name: 'Meeting', icon: '📞', color: 'bg-gray-500' };
  };

  const handleJoin = async () => {
    if (!meetingUrl.trim()) {
      setError('Please enter a meeting URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/bot/quick-join', {
        meetingUrl,
        title: meetingTitle || undefined
      });

      setActiveMeeting(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join meeting. Please check the meeting URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    console.log('handleLeave called, activeMeeting:', activeMeeting);

    // If no active meeting in state, try to get it from server
    let meetingId = activeMeeting?.meetingId;
    if (!meetingId) {
      try {
        const sessionsResponse = await api.get('/bot/active-sessions');
        if (sessionsResponse.data && sessionsResponse.data.length > 0) {
          meetingId = sessionsResponse.data[0].meetingId;
          console.log('Got meetingId from active-sessions:', meetingId);
        }
      } catch (e) {
        console.error('Failed to get active sessions');
      }
    }

    if (!meetingId) {
      setError('No active meeting to leave');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log('Calling leave API for meeting:', meetingId);
      const response = await api.post(`/bot/leave/${meetingId}`, {
        generateSummary: true,
        extractActions: true
      });
      console.log('Leave response:', response.data);

      // Navigate to meeting detail with results
      navigate(`/meetings/${meetingId}`);
    } catch (err: any) {
      console.error('Leave error:', err);
      setError(err.response?.data?.error || 'Failed to leave meeting');
      setLoading(false);
    }
  };

  const handleScreenshot = async () => {
    if (!activeMeeting) return;

    setTakingScreenshot(true);
    try {
      await api.post(`/bot/screenshot/${activeMeeting.meetingId}`);
    } catch (err) {
      console.error('Screenshot error:', err);
    } finally {
      setTakingScreenshot(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!activeMeeting) return;

    try {
      const response = await api.post(`/bot/recording/${activeMeeting.meetingId}/toggle`);
      if (status) {
        setStatus({ ...status, isRecording: response.data.isRecording });
      }
    } catch (err) {
      console.error('Toggle recording error:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const platform = meetingUrl ? detectPlatform(meetingUrl) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <VideoCameraIcon className="h-7 w-7 text-primary-600" />
          Join Meeting as AI Agent
        </h1>
        <p className="text-gray-500">Paste any meeting link and the AI will join, record, and capture everything</p>
      </div>

      {!activeMeeting ? (
        <>
          {/* Join Form */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Enter Meeting Details</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting URL *</label>
                <div className="relative">
                  <VideoCameraIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="url"
                    className="input !pl-11"
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                  />
                </div>
                {platform && meetingUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-white text-xs ${platform.color}`}>
                      {platform.icon} {platform.name} Detected
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Weekly Team Standup"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={loading || !meetingUrl.trim()}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Joining Meeting...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5" />
                    Join Meeting with AI Agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: FilmIcon, title: 'Video Recording', desc: 'Records full meeting video at 1080p 30fps' },
              { icon: MicrophoneIcon, title: 'Audio Capture', desc: 'Captures audio with Whisper transcription' },
              { icon: ComputerDesktopIcon, title: 'Screen Capture', desc: 'Records screen sharing and presentations' },
              { icon: SparklesIcon, title: 'AI Analysis', desc: 'Auto-generates summaries and action items' }
            ].map((feature) => (
              <div key={feature.title} className="card text-center">
                <feature.icon className="h-8 w-8 mx-auto text-primary-600 mb-2" />
                <h3 className="font-medium text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Supported Platforms */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Supported Platforms</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Zoom', icon: '📹', url: 'zoom.us' },
                { name: 'Google Meet', icon: '🎥', url: 'meet.google.com' },
                { name: 'MS Teams', icon: '💬', url: 'teams.microsoft.com' },
                { name: 'Webex', icon: '🌐', url: 'webex.com' }
              ].map((p) => (
                <div key={p.name} className="text-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-3xl">{p.icon}</span>
                  <p className="font-medium text-gray-900 mt-2">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.url}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Active Meeting */}
          <div className="card border-2 border-green-500 bg-green-50">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-gray-900">Meeting In Progress</span>
              </div>
              <span className="text-sm text-gray-500">
                {status?.duration ? formatDuration(status.duration) : '0s'}
              </span>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-500">Platform</p>
                <p className="font-medium">{activeMeeting.platform || 'Unknown'}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{status?.status || 'Connecting...'}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-500">Recording</p>
                <p className="font-medium flex items-center gap-1">
                  {status?.isRecording ? (
                    <>
                      <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                      Active
                    </>
                  ) : (
                    'Paused'
                  )}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm text-gray-500">Transcript Lines</p>
                <p className="font-medium">{status?.transcriptCount || 0}</p>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3 mb-4" style={{ position: 'relative', zIndex: 10 }}>
              <button
                onClick={() => {
                  console.log('Toggle recording clicked');
                  handleToggleRecording();
                }}
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer select-none ${
                  status?.isRecording
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {status?.isRecording ? (
                  <>
                    <PauseIcon className="h-5 w-5" />
                    Pause Recording
                  </>
                ) : (
                  <>
                    <FilmIcon className="h-5 w-5" />
                    Resume Recording
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  console.log('Screenshot clicked');
                  handleScreenshot();
                }}
                type="button"
                disabled={takingScreenshot}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors cursor-pointer select-none"
              >
                {takingScreenshot ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <CameraIcon className="h-5 w-5" />
                )}
                Screenshot
              </button>
            </div>

            <div className="flex gap-3" style={{ position: 'relative', zIndex: 10 }}>
              <button
                onClick={() => {
                  console.log('End meeting clicked');
                  handleLeave();
                }}
                type="button"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors cursor-pointer select-none"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Ending Meeting...
                  </>
                ) : (
                  <>
                    <StopIcon className="h-5 w-5" />
                    End Meeting & Process Recording
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recording Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card text-center">
              <FilmIcon className="h-8 w-8 mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{status?.isRecording ? 'Recording' : 'Paused'}</p>
              <p className="text-sm text-gray-500">Video Status</p>
            </div>
            <div className="card text-center">
              <DocumentTextIcon className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{status?.transcriptCount || 0}</p>
              <p className="text-sm text-gray-500">Transcript Lines</p>
            </div>
            <div className="card text-center">
              <CameraIcon className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{status?.screenshotCount || 0}</p>
              <p className="text-sm text-gray-500">Screenshots</p>
            </div>
          </div>

          {/* Live Transcript */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-primary-600" />
                Live Transcript
              </h2>
              <span className="badge-success flex items-center gap-1">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-3">
              {status?.transcript && status.transcript.length > 0 ? (
                status.transcript.map((entry, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="text-xs text-gray-400 w-16 flex-shrink-0">{entry.timestamp}</span>
                    <div>
                      <span className="font-medium text-primary-600">{entry.speaker}:</span>
                      <span className="text-gray-700 ml-2">{entry.text}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MicrophoneIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Waiting for speech...</p>
                  <p className="text-sm">Enable captions in the meeting for live transcription</p>
                </div>
              )}
            </div>
          </div>

          {/* What happens when you end */}
          <div className="card bg-primary-50 border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-3">When you end the meeting, AI will automatically:</h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { icon: FilmIcon, text: 'Save video recording' },
                { icon: DocumentTextIcon, text: 'Transcribe with Whisper' },
                { icon: SparklesIcon, text: 'Generate AI summary' },
                { icon: ClipboardDocumentListIcon, text: 'Extract action items' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-700">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* How it Works */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
        <p className="text-sm text-gray-700 mb-3">
          Our self-hosted AI bot uses browser automation to join and record meetings - no third-party APIs required:
        </p>
        <ul className="text-sm text-gray-700 space-y-2 mb-3">
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Puppeteer:</strong> Launches a Chrome browser that joins the meeting as a participant</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Video Recording:</strong> Records the meeting screen at 1080p 30fps using built-in screen recorder</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Caption Capture:</strong> Automatically captures live captions from the meeting platform</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>Whisper Transcription:</strong> Extracts audio and transcribes with OpenAI Whisper (optional)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span><strong>AI Processing:</strong> OpenRouter generates summaries and extracts action items</span>
          </li>
        </ul>
        <p className="text-sm text-gray-600">
          <strong>Tip:</strong> Enable live captions in your meeting for best real-time transcription results.
        </p>
      </div>
    </div>
  );
}
