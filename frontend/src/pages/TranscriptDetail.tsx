import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface AIResultData {
  type: 'summary' | 'actions';
  summary?: string;
  actionItems?: any[];
  savedId?: string;
  savedIds?: string[];
}

export default function TranscriptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResultData | null>(null);

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
      setAiResult({
        type: 'summary',
        summary: response.data.summary,
        savedId: response.data.savedId
      });
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
      setAiResult({
        type: 'actions',
        actionItems: response.data.actionItems,
        savedIds: response.data.savedIds
      });
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

  const renderAIResult = () => {
    if (!aiResult) return null;

    if (aiResult.type === 'summary') {
      return (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              AI Summary
            </h2>
            {aiResult.savedId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{aiResult.summary}</div>
        </div>
      );
    }

    if (aiResult.type === 'actions') {
      const items = aiResult.actionItems || [];
      return (
        <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-orange-600" />
              Action Items ({items.length})
            </h2>
            {aiResult.savedIds && aiResult.savedIds.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item: any, i: number) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-orange-100 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {item.assignee && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md">
                            <UserGroupIcon className="h-3 w-3" />
                            {item.assignee}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-md">
                            <ClockIcon className="h-3 w-3" />
                            {item.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      item.priority === 'high' ? 'bg-red-100 text-red-700' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.priority || 'medium'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No action items found in this transcript.</p>
          )}
        </div>
      );
    }

    return null;
  };

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

          {aiLoading && (
            <div className="card flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-500">Processing with AI...</span>
            </div>
          )}

          {aiResult && !aiLoading && renderAIResult()}
        </div>
      </div>
    </div>
  );
}
