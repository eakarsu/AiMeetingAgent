import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function TranscriptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const response = await api.get(`/transcripts/${id}`);
        setTranscript(response.data);
      } catch (error) {
        console.error('Error fetching transcript:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [id]);

  const generateSummary = async () => {
    setAiLoading(true);
    try {
      const response = await api.post('/ai/summarize', {
        meetingId: transcript.meeting?.id,
        transcript: transcript.content
      });
      setAiResult(response.data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const extractActions = async () => {
    setAiLoading(true);
    try {
      const response = await api.post('/ai/extract-actions', {
        meetingId: transcript.meeting?.id,
        transcript: transcript.content
      });
      setAiResult(JSON.stringify(response.data.actionItems, null, 2));
    } catch (error) {
      console.error('Error extracting actions:', error);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!transcript) return <div className="text-center py-12">Transcript not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/transcripts')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{transcript.meeting?.title}</h1>
          <p className="text-gray-500">{format(new Date(transcript.meeting?.startTime), 'MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateSummary} disabled={aiLoading} className="btn-secondary flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Summarize
          </button>
          <button onClick={extractActions} disabled={aiLoading} className="btn-primary flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Extract Actions
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-gray-900 mb-4">Transcript</h2>
          <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{transcript.content}</pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Info</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Language</p>
                <p className="text-gray-900">{transcript.language?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-gray-900">{transcript.duration ? `${Math.floor(transcript.duration / 60)} min` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">{format(new Date(transcript.createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {aiResult && (
            <div className="card bg-primary-50 border-primary-200">
              <h2 className="font-semibold text-primary-900 mb-4 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                AI Result
              </h2>
              <pre className="whitespace-pre-wrap text-sm text-primary-800">{aiResult}</pre>
            </div>
          )}

          {aiLoading && (
            <div className="card flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-500">Processing with AI...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
