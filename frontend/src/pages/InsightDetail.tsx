import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  TrashIcon,
  SparklesIcon,
  DocumentTextIcon,
  FaceSmileIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export default function InsightDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const response = await api.get(`/insights/${id}`);
        setInsight(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInsight();
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Delete this insight?')) {
      await api.delete(`/insights/${id}`);
      navigate('/insights');
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'summary': return { color: 'bg-blue-100 text-blue-800', label: 'Summary' };
      case 'sentiment': return { color: 'bg-green-100 text-green-800', label: 'Sentiment' };
      case 'key_topics': return { color: 'bg-purple-100 text-purple-800', label: 'Key Topics' };
      case 'chat_response': return { color: 'bg-indigo-100 text-indigo-800', label: 'Chat Response' };
      case 'daily_plan': return { color: 'bg-amber-100 text-amber-800', label: 'Daily Plan' };
      case 'follow_up_email': return { color: 'bg-teal-100 text-teal-800', label: 'Follow-up Email' };
      case 'draft_followup': return { color: 'bg-emerald-100 text-emerald-800', label: 'Follow-up Draft' };
      case 'formatted_transcript': return { color: 'bg-red-100 text-red-800', label: 'Formatted Transcript' };
      default: return { color: 'bg-gray-100 text-gray-800', label: type.replace(/_/g, ' ') };
    }
  };

  const renderContent = () => {
    if (!insight) return null;

    let parsed: any;
    try {
      parsed = JSON.parse(insight.content);
    } catch {
      // Plain text content
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{insight.content}</div>
        </div>
      );
    }

    switch (insight.type) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                Summary {parsed.format && `(${parsed.format})`}
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{parsed.summary || JSON.stringify(parsed)}</p>
            </div>
            {parsed.keyPoints?.length > 0 && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3">Key Points</h4>
                <ul className="space-y-2">
                  {parsed.keyPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {parsed.decisions?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <h4 className="font-medium text-green-800 mb-2">Decisions</h4>
                  <ul className="space-y-1">
                    {parsed.decisions.map((d: string, i: number) => (
                      <li key={i} className="text-green-700 text-sm flex items-start gap-2"><span className="text-green-500">•</span> {d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parsed.actionItems?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <h4 className="font-medium text-orange-800 mb-2">Action Items</h4>
                  <ul className="space-y-1">
                    {parsed.actionItems.map((a: string, i: number) => (
                      <li key={i} className="text-orange-700 text-sm flex items-start gap-2"><span className="text-orange-500">•</span> {a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {parsed.nextSteps?.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <h4 className="font-medium text-purple-800 mb-2">Next Steps</h4>
                <div className="flex flex-wrap gap-2">
                  {parsed.nextSteps.map((s: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'sentiment':
        const sentimentColor = parsed.overall === 'positive' ? 'green' : parsed.overall === 'negative' ? 'red' : 'yellow';
        return (
          <div className="space-y-6">
            <div className={`bg-${sentimentColor}-50 rounded-xl p-6 border border-${sentimentColor}-200`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaceSmileIcon className="h-6 w-6 text-yellow-500" />
                  Sentiment Analysis
                </h3>
                <div className="text-right">
                  <span className={`text-3xl font-bold text-${sentimentColor}-600`}>{parsed.score}%</span>
                  <p className={`text-sm text-${sentimentColor}-600 capitalize`}>{parsed.overall}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`bg-${sentimentColor}-500 h-3 rounded-full`} style={{ width: `${parsed.score}%` }}></div>
              </div>
            </div>
            {parsed.teamDynamics && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">Team Dynamics</h4>
                <p className="text-blue-700 text-sm">{parsed.teamDynamics}</p>
              </div>
            )}
            {parsed.highlights?.length > 0 && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3">Notable Moments</h4>
                <div className="space-y-2">
                  {parsed.highlights.map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <span className="text-2xl">{typeof h === 'string' ? '💬' : (h.sentiment === 'positive' ? '😊' : h.sentiment === 'negative' ? '😟' : '😐')}</span>
                      <div className="flex-1">
                        <span className="text-gray-700">{typeof h === 'string' ? h : h.text}</span>
                        {h.speaker && <span className="text-gray-400 text-xs ml-2">— {h.speaker}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsed.concerns?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <h4 className="font-medium text-red-800 mb-2">Concerns</h4>
                <ul className="space-y-1">
                  {parsed.concerns.map((c: string, i: number) => (
                    <li key={i} className="text-red-700 text-sm flex items-start gap-2"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'key_topics':
        const topics = Array.isArray(parsed) ? parsed : [];
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-purple-600" />
              Key Topics Discussed
            </h3>
            <div className="space-y-4">
              {topics.map((topic: any, i: number) => (
                <div key={i} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-lg">{topic.topic}</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{topic.importance}/10</div>
                        <div className="text-xs text-gray-500">Importance</div>
                      </div>
                      {topic.timeSpent && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-pink-600">{topic.timeSpent}%</div>
                          <div className="text-xs text-gray-500">Time</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {topic.keyPoints?.length > 0 && (
                    <ul className="space-y-1 mt-3">
                      {topic.keyPoints.map((point: string, j: number) => (
                        <li key={j} className="text-gray-600 text-sm flex items-start gap-2"><span className="text-purple-400">→</span> {point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'chat_response':
        return (
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
              <h4 className="font-medium text-indigo-800 mb-2 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                Question
              </h4>
              <p className="text-indigo-700">{parsed.question}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-primary-600" />
                AI Response
              </h4>
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{parsed.response}</div>
            </div>
          </div>
        );

      case 'daily_plan':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-6">
              <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                <ClockIcon className="h-6 w-6" />
                Daily Plan
              </h3>
              <div className="flex items-center gap-6 mt-4">
                <div className="text-center">
                  <span className="text-4xl font-bold">{parsed.estimatedProductivity || 0}%</span>
                  <p className="text-white/70 text-sm">Productivity</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold">{parsed.schedule?.length || 0}</span>
                  <p className="text-white/70 text-sm">Activities</p>
                </div>
              </div>
            </div>
            {parsed.topPriorities?.length > 0 && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3">Top Priorities</h4>
                <div className="space-y-2">
                  {parsed.topPriorities.map((p: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-indigo-50 rounded-lg">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">{i + 1}</span>
                      <span className="text-gray-700">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsed.schedule?.length > 0 && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-4">Schedule</h4>
                <div className="space-y-3">
                  {parsed.schedule.map((item: any, i: number) => (
                    <div key={i} className={`flex items-center gap-4 p-3 rounded-lg ${
                      item.type === 'meeting' ? 'bg-blue-50 border-l-4 border-blue-500' :
                      item.type === 'task' ? 'bg-orange-50 border-l-4 border-orange-500' :
                      item.type === 'break' ? 'bg-green-50 border-l-4 border-green-500' :
                      'bg-purple-50 border-l-4 border-purple-500'
                    }`}>
                      <div className="text-center min-w-[60px]">
                        <span className="text-lg font-bold text-gray-900">{item.time}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.activity}</p>
                        {item.notes && <p className="text-sm text-gray-500">{item.notes}</p>}
                      </div>
                      <span className="text-sm text-gray-500">{item.duration} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'follow_up_email':
        return (
          <div className="bg-white rounded-xl p-6 border">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-teal-600" />
              Follow-up Email
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{typeof parsed === 'string' ? parsed : insight.content}</div>
            </div>
          </div>
        );

      case 'draft_followup':
        return (
          <div className="space-y-6">
            {parsed.email && (parsed.email.subject || parsed.email.body) && (
              <div className="bg-white rounded-xl p-5 border">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5 text-green-600" />
                  Follow-up Email
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {parsed.email.subject && (
                    <div className="border-b pb-3 mb-3">
                      <p className="text-sm text-gray-500">Subject:</p>
                      <p className="font-medium text-gray-900">{parsed.email.subject}</p>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-gray-700">{parsed.email.body}</div>
                </div>
              </div>
            )}
            {parsed.executiveSummary && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h4 className="font-medium text-indigo-800 mb-2">Executive Summary</h4>
                <p className="text-indigo-700 text-sm">{parsed.executiveSummary}</p>
              </div>
            )}
            {parsed.slackMessage && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
                  Slack Message
                </h4>
                <div className="bg-purple-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">{parsed.slackMessage}</div>
              </div>
            )}
            {parsed.keyTakeaways?.length > 0 && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3">Key Takeaways</h4>
                <div className="flex flex-wrap gap-2">
                  {parsed.keyTakeaways.map((t: string, i: number) => (
                    <span key={i} className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {parsed.deadlines?.length > 0 && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3">Deadlines</h4>
                <div className="space-y-2">
                  {parsed.deadlines.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{d.task}</p>
                        <p className="text-sm text-gray-500">{d.assignee}</p>
                      </div>
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">{d.dueDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'formatted_transcript':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                parsed.quality === 'excellent' ? 'bg-green-100 text-green-700' :
                parsed.quality === 'good' ? 'bg-blue-100 text-blue-700' :
                parsed.quality === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>Quality: {parsed.quality}</span>
              {parsed.duration && <span className="text-sm text-gray-500">Duration: {parsed.duration}</span>}
            </div>
            {parsed.speakers?.length > 0 && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3">Speakers</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {parsed.speakers.map((s: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 flex items-center gap-1"><UserGroupIcon className="h-4 w-4 text-gray-400" />{s.name}</span>
                        {s.speakingTime && <span className="text-sm text-gray-500">{s.speakingTime}</span>}
                      </div>
                      {s.mainPoints?.length > 0 && (
                        <ul className="text-sm text-gray-600 space-y-1">
                          {s.mainPoints.slice(0, 3).map((p: string, j: number) => (
                            <li key={j} className="truncate">• {p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsed.topics?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {parsed.topics.map((t: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">{t}</span>
                ))}
              </div>
            )}
            {parsed.formattedTranscript && (
              <div className="bg-white rounded-xl p-5 border">
                <h4 className="font-medium text-gray-900 mb-3">Formatted Transcript</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-gray-700 text-sm font-sans leading-relaxed">{parsed.formattedTranscript}</pre>
                </div>
              </div>
            )}
          </div>
        );

      default:
        // Unknown type — render as readable text
        return (
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}
            </div>
          </div>
        );
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!insight) return <div className="text-center py-12">Insight not found</div>;

  const config = getTypeConfig(insight.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/insights')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5 text-gray-500" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-primary-600" />AI Insight</h1>
          <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><TrashIcon className="h-5 w-5" /></button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {renderContent()}
        </div>
        <div className="card h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">Info</h2>
          <div className="space-y-4">
            <div><p className="text-sm text-gray-500">Type</p><p className="text-gray-900 capitalize">{insight.type.replace(/_/g, ' ')}</p></div>
            {insight.confidence && (
              <div>
                <p className="text-sm text-gray-500">Confidence</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.round(insight.confidence * 100)}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{Math.round(insight.confidence * 100)}%</span>
                </div>
              </div>
            )}
            <div><p className="text-sm text-gray-500">Created</p><p className="text-gray-900">{format(new Date(insight.createdAt), 'MMMM d, yyyy h:mm a')}</p></div>
            {insight.meeting && <button onClick={() => navigate(`/meetings/${insight.meeting.id}`)} className="btn-secondary w-full">View Meeting</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
