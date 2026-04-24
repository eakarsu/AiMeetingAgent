import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, MapPinIcon, ClockIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function CalendarEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    isAllDay: false,
    recurrence: 'none'
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/calendar/${id}`);
        setEvent(response.data);
        setFormData({
          title: response.data.title,
          description: response.data.description || '',
          startTime: response.data.startTime ? response.data.startTime.slice(0, 16) : '',
          endTime: response.data.endTime ? response.data.endTime.slice(0, 16) : '',
          location: response.data.location || '',
          isAllDay: response.data.isAllDay || false,
          recurrence: response.data.recurrence || 'none'
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/calendar/${id}`, formData);
      const response = await api.get(`/calendar/${id}`);
      setEvent(response.data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this event?')) {
      await api.delete(`/calendar/${id}`);
      navigate('/calendar');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!event) return <div className="text-center py-12">Event not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/calendar')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-gray-500">{format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="p-2 hover:bg-gray-100 rounded-lg">
            <PencilIcon className="h-5 w-5 text-gray-500" />
          </button>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleUpdate} className="card space-y-4">
          <h2 className="font-semibold text-gray-900 mb-2">Edit Event</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              className="input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
              <select
                className="input"
                value={formData.recurrence}
                onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={formData.isAllDay}
                  onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">All Day Event</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Time</p>
                  <p className="text-gray-600">
                    {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                  </p>
                </div>
              </div>
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-gray-600">{event.location}</p>
                  </div>
                </div>
              )}
              {event.description && (
                <div>
                  <p className="font-medium text-gray-900 mb-1">Description</p>
                  <p className="text-gray-600">{event.description}</p>
                </div>
              )}
              <button onClick={() => setEditing(true)} className="btn-secondary w-full mt-4">
                Edit Event
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">All Day Event</p>
                <p className="text-gray-900">{event.isAllDay ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Recurrence</p>
                <p className="text-gray-900 capitalize">{event.recurrence || 'None'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="text-gray-900 capitalize">{event.source || 'Local'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
