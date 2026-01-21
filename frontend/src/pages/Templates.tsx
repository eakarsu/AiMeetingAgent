import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { PlusIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', duration: 60 });
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/templates', { ...formData, agendaItems: [] });
      setShowModal(false);
      setFormData({ name: '', description: '', duration: 60 });
      fetchTemplates();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Templates</h1>
          <p className="text-gray-500">Reusable templates for common meeting types</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />New Template</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} onClick={() => navigate(`/templates/${template.id}`)} className="card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-pink-50 rounded-lg"><DocumentDuplicateIcon className="h-5 w-5 text-pink-600" /></div>
              <div>
                <p className="font-medium text-gray-900">{template.name}</p>
                <p className="text-sm text-gray-500">{template.duration} min</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm line-clamp-2">{template.description}</p>
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">{(template.agendaItems as any[])?.length || 0} agenda items</span>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 card">
          <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No templates yet. Create your first template!</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">New Template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label><input type="number" className="input" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} required /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" className="btn-primary flex-1">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
