import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function CalendarEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/calendar/${id}`);
        setEvent(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

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
        <button onClick={() => navigate('/calendar')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5 text-gray-500" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-gray-500">{format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><TrashIcon className="h-5 w-5" /></button>
      </div>

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
              <p className="text-gray-900 capitalize">{event.source}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
