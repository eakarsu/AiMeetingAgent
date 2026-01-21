import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function FollowUpDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [followUp, setFollowUp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/follow-ups/${id}`);
        setFollowUp(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Delete this follow-up?')) {
      await api.delete(`/follow-ups/${id}`);
      navigate('/follow-ups');
    }
  };

  const markComplete = async () => {
    await api.put(`/follow-ups/${id}`, { status: 'completed' });
    const response = await api.get(`/follow-ups/${id}`);
    setFollowUp(response.data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-info';
      default: return 'badge-gray';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!followUp) return <div className="text-center py-12">Follow-up not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/follow-ups')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5 text-gray-500" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{followUp.title}</h1>
          <span className={getStatusColor(followUp.status)}>{followUp.status}</span>
        </div>
        <div className="flex gap-2">
          {followUp.status !== 'completed' && <button onClick={markComplete} className="btn-primary flex items-center gap-2"><CheckCircleIcon className="h-5 w-5" />Complete</button>}
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><TrashIcon className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
          <div className="space-y-4">
            <div><p className="text-sm text-gray-500">Description</p><p className="text-gray-900">{followUp.description || 'No description'}</p></div>
            <div><p className="text-sm text-gray-500">Assignee</p><p className="text-gray-900">{followUp.assignee || '-'}</p></div>
            <div><p className="text-sm text-gray-500">Due Date</p><p className="text-gray-900">{followUp.dueDate ? format(new Date(followUp.dueDate), 'MMMM d, yyyy') : 'No due date'}</p></div>
            <div><p className="text-sm text-gray-500">Created</p><p className="text-gray-900">{format(new Date(followUp.createdAt), 'MMMM d, yyyy')}</p></div>
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Meeting</h2>
          {followUp.meeting ? (
            <div className="space-y-4">
              <p className="font-medium text-gray-900">{followUp.meeting.title}</p>
              <button onClick={() => navigate(`/meetings/${followUp.meeting.id}`)} className="btn-secondary w-full">View Meeting</button>
            </div>
          ) : (
            <p className="text-gray-500">Not linked to a meeting</p>
          )}
        </div>
      </div>
    </div>
  );
}
