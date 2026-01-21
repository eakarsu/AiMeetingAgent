import { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  FilmIcon,
  ArrowPathIcon,
  PlayIcon,
  FolderIcon,
  ClockIcon,
  XMarkIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';

interface Recording {
  sessionId: string;
  frameCount: number;
  duration: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoUrl?: string;
  audioUrl?: string;
  createdAt?: string;
}

export default function Recordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const fetchRecordings = async () => {
    try {
      const response = await api.get('/bot/recordings');
      setRecordings(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleConvert = async (sessionId: string) => {
    setConverting(sessionId);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/bot/convert-frames/${sessionId}`);
      setSuccess(`Video created: ${response.data.frameCount} frames, ${response.data.duration}s duration`);
      fetchRecordings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to convert frames');
    } finally {
      setConverting(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getVideoUrl = (sessionId: string) => {
    const token = localStorage.getItem('token');
    return `/api/bot/video/${sessionId}?token=${token}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FilmIcon className="h-7 w-7 text-primary-600" />
          Recordings
        </h1>
        <p className="text-gray-500">View and play your meeting recordings</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Recording: {playingVideo.substring(0, 8)}...</h3>
              <button
                onClick={() => setPlayingVideo(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <video
                controls
                autoPlay
                className="w-full rounded-lg bg-black"
                src={getVideoUrl(playingVideo)}
                onError={(e) => {
                  console.error('Video error:', e);
                  setError('Failed to load video. Check console for details.');
                }}
              >
                Your browser does not support the video tag.
              </video>
              <p className="text-xs text-gray-400 mt-2 break-all">
                URL: {getVideoUrl(playingVideo)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Meeting Recordings</h2>
          <button
            onClick={fetchRecordings}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>

        {recordings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FolderIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No recordings found</p>
            <p className="text-sm">Join a meeting to start recording</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div
                key={recording.sessionId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <FilmIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 font-mono text-sm">
                      {recording.sessionId.substring(0, 8)}...
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <PlayIcon className="h-4 w-4" />
                        {recording.frameCount} frames
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {formatDuration(recording.duration)}
                      </span>
                      {recording.hasAudio && (
                        <span className="flex items-center gap-1 text-green-600">
                          <SpeakerWaveIcon className="h-4 w-4" />
                          Audio
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {recording.hasVideo ? (
                    <>
                      <button
                        onClick={() => setPlayingVideo(recording.sessionId)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <PlayIcon className="h-4 w-4" />
                        Play
                      </button>
                      <a
                        href={getVideoUrl(recording.sessionId)}
                        download={`recording_${recording.sessionId}.mp4`}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                      >
                        Download
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConvert(recording.sessionId)}
                      disabled={converting === recording.sessionId}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {converting === recording.sessionId ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <FilmIcon className="h-4 w-4" />
                          Convert to Video
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
