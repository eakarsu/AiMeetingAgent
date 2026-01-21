import { useEffect, useState } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      fetchNotifications();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting_reminder': return '📅';
      case 'action_item': return '✅';
      case 'follow_up': return '🔄';
      default: return '🔔';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary flex items-center gap-2">
            <CheckIcon className="h-5 w-5" />Mark All Read
          </button>
        )}
      </div>

      <div className="card divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-4 p-4 ${notification.status === 'unread' ? 'bg-primary-50' : ''}`}
          >
            <span className="text-2xl">{getTypeIcon(notification.type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{notification.title}</p>
                {notification.status === 'unread' && <span className="h-2 w-2 bg-primary-600 rounded-full"></span>}
              </div>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-2">{format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}</p>
            </div>
            <div className="flex items-center gap-2">
              {notification.status === 'unread' && (
                <button onClick={() => markAsRead(notification.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Mark as read">
                  <CheckIcon className="h-5 w-5" />
                </button>
              )}
              <button onClick={() => deleteNotification(notification.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Delete">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
