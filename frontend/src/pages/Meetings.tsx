import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingLink: string;
  participants: any[];
  _count: {
    actionItems: number;
    notes: number;
  };
}

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    meetingLink: ''
  });
  const navigate = useNavigate();

  const fetchMeetings = async () => {
    try {
      const response = await api.get('/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleRowClick = (id: string) => {
    navigate(`/meetings/${id}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/meetings', formData);
      setShowModal(false);
      setFormData({ title: '', description: '', startTime: '', endTime: '', meetingLink: '' });
      fetchMeetings();
    } catch (error) {
      console.error('Error creating meeting:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500">Manage your meetings and schedules</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          New Meeting
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meeting</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participants</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meetings.map((meeting) => (
              <tr
                key={meeting.id}
                onClick={() => handleRowClick(meeting.id)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <CalendarIcon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{meeting.title}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{meeting.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{format(new Date(meeting.startTime), 'MMM d, yyyy')}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{meeting.participants?.length || 0} participants</span>
                </td>
                <td className="px-6 py-4">
                  <span className={getStatusColor(meeting.status)}>{meeting.status}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {meeting._count?.actionItems || 0} actions, {meeting._count?.notes || 0} notes
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meetings.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No meetings yet. Create your first meeting!</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">New Meeting</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
