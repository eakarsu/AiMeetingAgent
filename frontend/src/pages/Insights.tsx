import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import {
  LightBulbIcon,
  SparklesIcon,
  DocumentTextIcon,
  FaceSmileIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EnvelopeIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

// Try to extract a human-readable preview from insight content
const getPreview = (content: string, type: string): string => {
  try {
    const parsed = JSON.parse(content);

    switch (type) {
      case 'summary':
        return parsed.summary || content;
      case 'sentiment':
        return `Overall: ${parsed.overall} (${parsed.score}%)${parsed.teamDynamics ? ' — ' + parsed.teamDynamics : ''}`;
      case 'key_topics':
        if (Array.isArray(parsed)) {
          return parsed.map((t: any) => t.topic).join(', ');
        }
        return content;
      case 'chat_response':
        return `Q: ${parsed.question}\nA: ${parsed.response?.substring(0, 150)}...`;
      case 'daily_plan':
        return `${parsed.schedule?.length || 0} activities planned — ${parsed.estimatedProductivity || 0}% productivity score`;
      case 'follow_up_email':
        return content;
      case 'draft_followup':
        return parsed.executiveSummary || parsed.email?.subject || 'Follow-up communications drafted';
      case 'formatted_transcript':
        return `${parsed.speakers?.length || 0} speakers — Quality: ${parsed.quality || 'good'}`;
      default:
        return typeof parsed === 'string' ? parsed : content.substring(0, 200);
    }
  } catch {
    return content.substring(0, 200);
  }
};

const getTypeConfig = (type: string) => {
  switch (type) {
    case 'summary': return { color: 'bg-blue-50 text-blue-600', icon: DocumentTextIcon, label: 'Summary' };
    case 'sentiment': return { color: 'bg-green-50 text-green-600', icon: FaceSmileIcon, label: 'Sentiment' };
    case 'key_topics': return { color: 'bg-purple-50 text-purple-600', icon: LightBulbIcon, label: 'Key Topics' };
    case 'chat_response': return { color: 'bg-indigo-50 text-indigo-600', icon: ChatBubbleLeftRightIcon, label: 'Chat' };
    case 'daily_plan': return { color: 'bg-amber-50 text-amber-600', icon: ClockIcon, label: 'Daily Plan' };
    case 'follow_up_email': return { color: 'bg-teal-50 text-teal-600', icon: EnvelopeIcon, label: 'Follow-up Email' };
    case 'draft_followup': return { color: 'bg-emerald-50 text-emerald-600', icon: EnvelopeIcon, label: 'Follow-up Draft' };
    case 'formatted_transcript': return { color: 'bg-red-50 text-red-600', icon: PencilSquareIcon, label: 'Transcript' };
    case 'action_suggestion': return { color: 'bg-orange-50 text-orange-600', icon: SparklesIcon, label: 'Action Suggestion' };
    case 'risk_alert': return { color: 'bg-red-50 text-red-600', icon: SparklesIcon, label: 'Risk Alert' };
    default: return { color: 'bg-gray-50 text-gray-600', icon: SparklesIcon, label: type.replace(/_/g, ' ') };
  }
};

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><SparklesIcon className="h-7 w-7 text-primary-600" />AI Insights</h1>
        <p className="text-gray-500">AI-generated meeting analysis and insights</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight) => {
          const config = getTypeConfig(insight.type);
          const TypeIcon = config.icon;
          return (
            <div key={insight.id} onClick={() => navigate(`/insights/${insight.id}`)} className="card-hover">
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color}`}>
                  <TypeIcon className="h-3.5 w-3.5" />
                  {config.label}
                </span>
                {insight.confidence && <span className="text-xs text-gray-500">{Math.round(insight.confidence * 100)}%</span>}
              </div>
              <p className="text-gray-900 text-sm line-clamp-3 leading-relaxed">{getPreview(insight.content, insight.type)}</p>
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                <span>{insight.meeting?.title || 'General'}</span>
                <span>{format(new Date(insight.createdAt), 'MMM d')}</span>
              </div>
            </div>
          );
        })}
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
