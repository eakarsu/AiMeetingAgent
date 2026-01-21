import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function Transcripts() {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        const response = await api.get('/transcripts');
        setTranscripts(response.data);
      } catch (error) {
        console.error('Error fetching transcripts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscripts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transcripts</h1>
        <p className="text-gray-500">Meeting transcripts and recordings</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {transcripts.map((transcript) => (
          <div
            key={transcript.id}
            onClick={() => navigate(`/transcripts/${transcript.id}`)}
            className="card-hover"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{transcript.meeting?.title}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(transcript.meeting?.startTime), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <p className="text-gray-600 text-sm line-clamp-2">{transcript.content.substring(0, 150)}...</p>
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
              <span>{transcript.language?.toUpperCase()}</span>
              <span>{transcript.duration ? `${Math.floor(transcript.duration / 60)} min` : '-'}</span>
            </div>
          </div>
        ))}
      </div>

      {transcripts.length === 0 && (
        <div className="text-center py-12 card">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No transcripts yet</p>
        </div>
      )}
    </div>
  );
}
