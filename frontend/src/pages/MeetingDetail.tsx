import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  PencilIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingLink: string;
  recordingUrl: string;
  participants: any[];
  actionItems: any[];
  notes: any[];
  transcript: any;
  agendaItems: any[];
  decisions: any[];
  followUps: any[];
  insights: any[];
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const response = await api.get(`/meetings/${id}`);
        setMeeting(response.data);
      } catch (error) {
        console.error('Error fetching meeting:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      try {
        await api.delete(`/meetings/${id}`);
        navigate('/meetings');
      } catch (error) {
        console.error('Error deleting meeting:', error);
      }
    }
  };

  const generateAISummary = async () => {
    if (!meeting?.transcript?.content) {
      alert('No transcript available for this meeting');
      return;
    }
    setAiLoading(true);
    try {
      await api.post('/ai/summarize', {
        meetingId: meeting.id,
        transcript: meeting.transcript.content
      });
      const response = await api.get(`/meetings/${id}`);
      setMeeting(response.data);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!meeting) {
    return <div className="text-center py-12">Meeting not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/meetings')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
          <p className="text-gray-500">{meeting.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {meeting.meetingLink && (
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarIcon className="h-5 w-5" />
              Join Meeting
            </a>
          )}
          <button onClick={generateAISummary} disabled={aiLoading} className="btn-secondary flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            {aiLoading ? 'Generating...' : 'AI Summary'}
          </button>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Meeting Info */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Meeting Details</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{format(new Date(meeting.startTime), 'MMMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">
                  {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserGroupIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Participants</p>
                <p className="font-medium">{meeting.participants?.length || 0} people</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className={getStatusColor(meeting.status)}>{meeting.status}</span>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Participants ({meeting.participants?.length || 0})</h2>
          <div className="space-y-3">
            {meeting.participants?.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{participant.name}</p>
                  <p className="text-sm text-gray-500">{participant.email}</p>
                </div>
                <span className="badge-gray">{participant.role}</span>
              </div>
            ))}
            {(!meeting.participants || meeting.participants.length === 0) && (
              <p className="text-gray-500 text-center py-4">No participants</p>
            )}
          </div>
        </div>

        {/* Agenda */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Agenda ({meeting.agendaItems?.length || 0})</h2>
          <div className="space-y-2">
            {meeting.agendaItems?.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  {item.duration && <p className="text-sm text-gray-500">{item.duration} min</p>}
                </div>
              </div>
            ))}
            {(!meeting.agendaItems || meeting.agendaItems.length === 0) && (
              <p className="text-gray-500 text-center py-4">No agenda items</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Items, Notes, Decisions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Action Items ({meeting.actionItems?.length || 0})</h2>
            <Link to="/action-items" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          <div className="space-y-2">
            {meeting.actionItems?.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/action-items/${item.id}`)}
                className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <p className="font-medium text-gray-900">{item.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`badge-${item.priority === 'urgent' ? 'danger' : item.priority === 'high' ? 'warning' : 'gray'}`}>
                    {item.priority}
                  </span>
                  <span className={`badge-${item.status === 'completed' ? 'success' : 'info'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
            {(!meeting.actionItems || meeting.actionItems.length === 0) && (
              <p className="text-gray-500 text-center py-4">No action items</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notes ({meeting.notes?.length || 0})</h2>
            <Link to="/notes" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          <div className="space-y-2">
            {meeting.notes?.slice(0, 3).map((note) => (
              <div
                key={note.id}
                onClick={() => navigate(`/notes/${note.id}`)}
                className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <p className="text-sm text-gray-900 line-clamp-2">{note.content}</p>
                <p className="text-xs text-gray-500 mt-1">By {note.author?.name}</p>
              </div>
            ))}
            {(!meeting.notes || meeting.notes.length === 0) && (
              <p className="text-gray-500 text-center py-4">No notes</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Decisions ({meeting.decisions?.length || 0})</h2>
            <Link to="/decisions" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          <div className="space-y-2">
            {meeting.decisions?.slice(0, 5).map((decision) => (
              <div
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <p className="font-medium text-gray-900">{decision.title}</p>
                <span className={`badge-${decision.status === 'approved' ? 'success' : decision.status === 'rejected' ? 'danger' : 'warning'}`}>
                  {decision.status}
                </span>
              </div>
            ))}
            {(!meeting.decisions || meeting.decisions.length === 0) && (
              <p className="text-gray-500 text-center py-4">No decisions</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {meeting.insights && meeting.insights.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary-600" />
            AI Insights
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {meeting.insights.map((insight) => (
              <div key={insight.id} className="p-4 bg-primary-50 rounded-lg">
                <p className="text-xs font-medium text-primary-600 uppercase mb-1">{insight.type}</p>
                <p className="text-gray-900">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
