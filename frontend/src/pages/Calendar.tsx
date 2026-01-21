import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function Calendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', startTime: '', endTime: '', location: '' });
  const navigate = useNavigate();

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const response = await api.get(`/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [currentDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/calendar', formData);
      setShowModal(false);
      setFormData({ title: '', description: '', startTime: '', endTime: '', location: '' });
      fetchEvents();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.startTime), date));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500">Manage your schedule and events</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />New Event</button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeftIcon className="h-5 w-5" /></button>
          <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRightIcon className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array(days[0].getDay()).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50 rounded-lg"></div>
          ))}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-2 rounded-lg border ${isToday(day) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <p className={`text-sm font-medium ${isToday(day) ? 'text-primary-600' : 'text-gray-900'}`}>{format(day, 'd')}</p>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={() => navigate(`/calendar/${event.id}`)}
                      className="text-xs p-1 bg-primary-100 text-primary-700 rounded truncate cursor-pointer hover:bg-primary-200"
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <p className="text-xs text-gray-500">+{dayEvents.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">New Event</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" className="input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input" rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Start</label><input type="datetime-local" className="input" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">End</label><input type="datetime-local" className="input" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" className="input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
