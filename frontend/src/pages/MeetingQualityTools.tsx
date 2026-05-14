import { useState } from 'react';
import api from '../api/axios';
import {
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ToolField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'list-textarea' | 'csv';
  required?: boolean;
  placeholder?: string;
  hint?: string;
}

interface Tool {
  key: string;
  label: string;
  description: string;
  endpoint: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: ToolField[];
}

const TOOLS: Tool[] = [
  {
    key: 'meeting-quality-score',
    label: 'Meeting Quality Score',
    description: 'Score effectiveness across clarity, decision quality, action orientation, time efficiency, and participation balance.',
    endpoint: '/ai/meeting-quality-score',
    icon: ChartBarIcon,
    fields: [
      { key: 'transcript', label: 'Transcript', type: 'textarea', required: true, placeholder: 'Paste meeting transcript' },
      { key: 'meetingTitle', label: 'Meeting Title', type: 'text' },
      { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number' }
    ]
  },
  {
    key: 'participant-engagement-analyzer',
    label: 'Participant Engagement Analyzer',
    description: 'Estimate speaking share, engagement level, silent vs dominant speakers, and facilitation recommendations.',
    endpoint: '/ai/participant-engagement-analyzer',
    icon: UserGroupIcon,
    fields: [
      { key: 'transcript', label: 'Transcript', type: 'textarea', required: true, placeholder: 'Paste meeting transcript' },
      { key: 'meetingTitle', label: 'Meeting Title', type: 'text' },
      { key: 'expectedAttendees', label: 'Expected Attendees', type: 'number' }
    ]
  },
  {
    key: 'decision-consensus-check',
    label: 'Decision Consensus Check',
    description: 'Evaluate whether decisions in a transcript reached real consensus, or if dissent was suppressed/glossed over.',
    endpoint: '/ai/decision-consensus-check',
    icon: SparklesIcon,
    fields: [
      { key: 'transcript', label: 'Transcript', type: 'textarea', required: true, placeholder: 'Paste meeting transcript' }
    ]
  },
  {
    key: 'next-meeting-optimizer',
    label: 'Next Meeting Optimizer',
    description: 'Suggest agenda, attendees, cadence, and prep for the next meeting in a recurring series.',
    endpoint: '/ai/next-meeting-optimizer',
    icon: SparklesIcon,
    fields: [
      { key: 'meetingSeriesTitle', label: 'Meeting Series Title', type: 'text', required: true, placeholder: 'e.g. Weekly Engineering Sync' },
      { key: 'recentMeetingSummaries', label: 'Recent Meeting Summaries', type: 'list-textarea', required: true, placeholder: 'Separate each meeting summary with a line containing only ---', hint: 'Separate each meeting summary with a line containing only ---' },
      { key: 'upcomingAgendaDraft', label: 'Upcoming Agenda Draft (optional)', type: 'textarea' },
      { key: 'participants', label: 'Participants (comma-separated)', type: 'csv', placeholder: 'alice@x.com, bob@x.com' },
      { key: 'cadence', label: 'Cadence (weekly | biweekly | monthly | adhoc)', type: 'text', placeholder: 'weekly' }
    ]
  }
];

export default function MeetingQualityTools() {
  const [activeKey, setActiveKey] = useState<string>(TOOLS[0].key);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = TOOLS.find(t => t.key === activeKey)!;

  const setField = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload: Record<string, any> = {};
      tool.fields.forEach(f => {
        const v = inputs[f.key];
        if (v === undefined || v === '') return;
        if (f.type === 'number') {
          payload[f.key] = Number(v);
        } else if (f.type === 'list-textarea') {
          payload[f.key] = v.split(/\n---\n|\n-{3,}\n/).map(s => s.trim()).filter(s => s.length > 0);
        } else if (f.type === 'csv') {
          payload[f.key] = v.split(',').map(s => s.trim()).filter(s => s.length > 0);
        } else {
          payload[f.key] = v;
        }
      });
      const res = await api.post(tool.endpoint, payload);
      setResult(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error;
      if (status === 503) {
        setError(apiMsg || 'AI service unavailable: no LLM API key configured on the server.');
      } else {
        setError(apiMsg || err?.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-primary-600" />
          Meeting Quality Tools
        </h1>
        <p className="mt-1 text-sm text-gray-600">Score meeting effectiveness and analyze participant engagement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {TOOLS.map(t => {
          const Icon = t.icon;
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { setActiveKey(t.key); setInputs({}); setResult(null); setError(null); }}
              className={`text-left rounded-lg border p-4 transition-colors ${
                active
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-500'}`} />
                <div>
                  <div className={`font-medium ${active ? 'text-primary-700' : 'text-gray-900'}`}>{t.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{t.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{tool.label}</h2>
        <form onSubmit={submit} className="space-y-4">
          {tool.fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}{field.required ? ' *' : ''}
              </label>
              {(field.type === 'textarea' || field.type === 'list-textarea') ? (
                <textarea
                  rows={field.type === 'list-textarea' ? 8 : 6}
                  required={field.required}
                  value={inputs[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <input
                  type={field.type === 'csv' ? 'text' : field.type}
                  required={field.required}
                  value={inputs[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              )}
              {field.hint && <p className="mt-1 text-xs text-gray-500">{field.hint}</p>}
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary-600 px-4 py-2.5 text-white font-medium text-sm hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Running…' : `Run ${tool.label}`}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-md bg-gray-50 border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Result</h3>
            <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
