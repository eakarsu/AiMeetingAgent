import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function Decisions() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'approved', madeBy: '', meetingId: '' });
  const [meetings, setMeetings] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [decisionsRes, meetingsRes] = await Promise.all([
        api.get('/decisions'),
        api.get('/meetings')
      ]);
      setDecisions(decisionsRes.data);
      setMeetings(meetingsRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/decisions', formData);
      setShowModal(false);
      setFormData({ title: '', description: '', status: 'approved', madeBy: '', meetingId: '' });
      fetchData();
    } catch (error) {
      console.error('Error:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Decisions</h1>
          <p className="text-gray-500">Track meeting decisions and outcomes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          New Decision
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Decision</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meeting</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Made By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {decisions.map((decision) => (
              <tr key={decision.id} onClick={() => navigate(`/decisions/${decision.id}`)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg"><CheckCircleIcon className="h-5 w-5 text-green-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">{decision.title}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{decision.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{decision.meeting?.title || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{decision.madeBy || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{format(new Date(decision.createdAt), 'MMM d, yyyy')}</td>
                <td className="px-6 py-4"><span className={getStatusColor(decision.status)}>{decision.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {decisions.length === 0 && <div className="text-center py-12"><CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-2 text-gray-500">No decisions yet</p></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">New Decision</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Meeting</label><select className="input" value={formData.meetingId} onChange={(e) => setFormData({ ...formData, meetingId: e.target.value })} required><option value="">Select meeting</option>{meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" className="input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="proposed">Proposed</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="deferred">Deferred</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Made By</label><input type="text" className="input" value={formData.madeBy} onChange={(e) => setFormData({ ...formData, madeBy: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
