import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  createdAt: string;
  meeting: { id: string; title: string };
  assignee: { id: string; name: string; email: string };
}

export default function ActionItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<ActionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', status: '', priority: '', dueDate: '' });

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await api.get(`/action-items/${id}`);
        setItem(response.data);
        setFormData({
          title: response.data.title,
          description: response.data.description || '',
          status: response.data.status,
          priority: response.data.priority,
          dueDate: response.data.dueDate ? response.data.dueDate.split('T')[0] : ''
        });
      } catch (error) {
        console.error('Error fetching action item:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/action-items/${id}`, formData);
      const response = await api.get(`/action-items/${id}`);
      setItem(response.data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this action item?')) {
      try {
        await api.delete(`/action-items/${id}`);
        navigate('/action-items');
      } catch (error) {
        console.error('Error deleting action item:', error);
      }
    }
  };

  const markComplete = async () => {
    try {
      await api.put(`/action-items/${id}`, { status: 'completed' });
      const response = await api.get(`/action-items/${id}`);
      setItem(response.data);
      setFormData({ ...formData, status: 'completed' });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-info';
      default: return 'badge-gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-info';
      default: return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!item) {
    return <div className="text-center py-12">Action item not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/action-items')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={getPriorityColor(item.priority)}>{item.priority}</span>
            <span className={getStatusColor(item.status)}>{item.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.status !== 'completed' && (
            <button onClick={markComplete} className="btn-primary flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              Mark Complete
            </button>
          )}
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
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
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-900">{item.description || 'No description'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="text-gray-900">
                  {item.dueDate ? format(new Date(item.dueDate), 'MMMM d, yyyy') : 'No due date'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">{format(new Date(item.createdAt), 'MMMM d, yyyy')}</p>
              </div>
              <button onClick={() => setEditing(true)} className="btn-secondary w-full">
                Edit Details
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Related</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Meeting</p>
              {item.meeting ? (
                <button
                  onClick={() => navigate(`/meetings/${item.meeting.id}`)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {item.meeting.title}
                </button>
              ) : (
                <p className="text-gray-900">Not linked to a meeting</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Assignee</p>
              {item.assignee ? (
                <div>
                  <p className="text-gray-900 font-medium">{item.assignee.name}</p>
                  <p className="text-sm text-gray-500">{item.assignee.email}</p>
                </div>
              ) : (
                <p className="text-gray-900">Unassigned</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
