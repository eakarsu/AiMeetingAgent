import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/decisions/${id}`);
        setDecision(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

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
        <button onClick={() => navigate('/decisions')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5 text-gray-500" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{decision.title}</h1>
          <span className={getStatusColor(decision.status)}>{decision.status}</span>
        </div>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><TrashIcon className="h-5 w-5" /></button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
          <div className="space-y-4">
            <div><p className="text-sm text-gray-500">Description</p><p className="text-gray-900">{decision.description || 'No description'}</p></div>
            <div><p className="text-sm text-gray-500">Made By</p><p className="text-gray-900">{decision.madeBy || '-'}</p></div>
            <div><p className="text-sm text-gray-500">Date</p><p className="text-gray-900">{format(new Date(decision.createdAt), 'MMMM d, yyyy')}</p></div>
          </div>
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
