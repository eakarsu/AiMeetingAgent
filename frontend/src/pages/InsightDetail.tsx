import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function InsightDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/insights/${id}`);
        setInsight(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Delete this insight?')) {
      await api.delete(`/insights/${id}`);
      navigate('/insights');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'summary': return 'bg-blue-100 text-blue-800';
      case 'sentiment': return 'bg-green-100 text-green-800';
      case 'key_topics': return 'bg-purple-100 text-purple-800';
      case 'action_suggestion': return 'bg-orange-100 text-orange-800';
      case 'risk_alert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!insight) return <div className="text-center py-12">Insight not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/insights')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5 text-gray-500" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-primary-600" />AI Insight</h1>
          <span className={`px-2 py-1 rounded text-sm font-medium ${getTypeColor(insight.type)}`}>{insight.type.replace('_', ' ')}</span>
        </div>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><TrashIcon className="h-5 w-5" /></button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-gray-900 mb-4">Content</h2>
          <div className="bg-primary-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-gray-900">{insight.content}</pre>
          </div>
        </div>
        <div className="card h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">Info</h2>
          <div className="space-y-4">
            <div><p className="text-sm text-gray-500">Type</p><p className="text-gray-900 capitalize">{insight.type.replace('_', ' ')}</p></div>
            {insight.confidence && <div><p className="text-sm text-gray-500">Confidence</p><p className="text-gray-900">{Math.round(insight.confidence * 100)}%</p></div>}
            <div><p className="text-sm text-gray-500">Created</p><p className="text-gray-900">{format(new Date(insight.createdAt), 'MMMM d, yyyy h:mm a')}</p></div>
            {insight.meeting && <button onClick={() => navigate(`/meetings/${insight.meeting.id}`)} className="btn-secondary w-full">View Meeting</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
