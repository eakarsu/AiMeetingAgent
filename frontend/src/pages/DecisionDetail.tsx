import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', status: '', madeBy: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/decisions/${id}`);
        setDecision(response.data);
        setFormData({
          title: response.data.title,
          description: response.data.description || '',
          status: response.data.status,
          madeBy: response.data.madeBy || ''
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
      await api.put(`/decisions/${id}`, formData);
      const response = await api.get(`/decisions/${id}`);
      setDecision(response.data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this decision?')) {
      await api.delete(`/decisions/${id}`);
      navigate('/decisions');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-danger';
      case 'deferred': return 'badge-warning';
      default: return 'badge-info';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!decision) return <div className="text-center py-12">Decision not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/decisions')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{decision.title}</h1>
          <span className={getStatusColor(decision.status)}>{decision.status}</span>
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
                    <option value="proposed">Proposed</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Made By</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.madeBy}
                    onChange={(e) => setFormData({ ...formData, madeBy: e.target.value })}
                  />
                </div>
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
                <p className="text-gray-900">{decision.description || 'No description'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Made By</p>
                <p className="text-gray-900">{decision.madeBy || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-gray-900">{format(new Date(decision.createdAt), 'MMMM d, yyyy')}</p>
              </div>
              <button onClick={() => setEditing(true)} className="btn-secondary w-full">
                Edit Details
              </button>
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Meeting</h2>
          {decision.meeting ? (
            <div className="space-y-4">
              <p className="font-medium text-gray-900">{decision.meeting.title}</p>
              <button onClick={() => navigate(`/meetings/${decision.meeting.id}`)} className="btn-secondary w-full">View Meeting</button>
            </div>
          ) : (
            <p className="text-gray-500">Not linked to a meeting</p>
          )}
        </div>
      </div>
    </div>
  );
}
