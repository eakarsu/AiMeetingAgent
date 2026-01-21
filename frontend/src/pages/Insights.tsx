import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { LightBulbIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function Insights() {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await api.get('/insights');
        setInsights(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'summary': return 'bg-blue-50 text-blue-600';
      case 'sentiment': return 'bg-green-50 text-green-600';
      case 'key_topics': return 'bg-purple-50 text-purple-600';
      case 'action_suggestion': return 'bg-orange-50 text-orange-600';
      case 'risk_alert': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><SparklesIcon className="h-7 w-7 text-primary-600" />AI Insights</h1>
        <p className="text-gray-500">AI-generated meeting analysis and insights</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight) => (
          <div key={insight.id} onClick={() => navigate(`/insights/${insight.id}`)} className="card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(insight.type)}`}>{insight.type.replace('_', ' ')}</span>
              {insight.confidence && <span className="text-xs text-gray-500">{Math.round(insight.confidence * 100)}% confidence</span>}
            </div>
            <p className="text-gray-900 line-clamp-3">{insight.content.substring(0, 200)}</p>
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
              <span>{insight.meeting?.title || 'General'}</span>
              <span>{format(new Date(insight.createdAt), 'MMM d')}</span>
            </div>
          </div>
        ))}
      </div>

      {insights.length === 0 && (
        <div className="text-center py-12 card">
          <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No AI insights yet. Use AI features on meetings to generate insights.</p>
        </div>
      )}
    </div>
  );
}
