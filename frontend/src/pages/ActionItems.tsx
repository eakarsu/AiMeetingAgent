import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { PlusIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  meeting: { title: string };
  assignee: { name: string; email: string };
}

export default function ActionItems() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  const navigate = useNavigate();

  const fetchItems = async () => {
    try {
      const response = await api.get('/action-items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleRowClick = (id: string) => {
    navigate(`/action-items/${id}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/action-items', formData);
      setShowModal(false);
      setFormData({ title: '', description: '', priority: 'medium', dueDate: '' });
      fetchItems();
    } catch (error) {
      console.error('Error creating action item:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Action Items</h1>
          <p className="text-gray-500">Track and manage your tasks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          New Action Item
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meeting</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => handleRowClick(item.id)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{item.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{item.meeting?.title || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{item.assignee?.name || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">
                    {item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : '-'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={getPriorityColor(item.priority)}>{item.priority}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={getStatusColor(item.status)}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No action items yet. Create your first one!</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">New Action Item</h2>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
