import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeftIcon, TrashIcon, ClockIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60,
    agendaItems: [] as any[]
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/templates/${id}`);
        setTemplate(response.data);
        setFormData({
          name: response.data.name,
          description: response.data.description || '',
          duration: response.data.duration,
          agendaItems: response.data.agendaItems || []
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
      await api.put(`/templates/${id}`, formData);
      const response = await api.get(`/templates/${id}`);
      setTemplate(response.data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this template?')) {
      await api.delete(`/templates/${id}`);
      navigate('/templates');
    }
  };

  const addAgendaItem = () => {
    setFormData({
      ...formData,
      agendaItems: [...formData.agendaItems, { title: '', description: '', duration: 10 }]
    });
  };

  const updateAgendaItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.agendaItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, agendaItems: newItems });
  };

  const removeAgendaItem = (index: number) => {
    setFormData({
      ...formData,
      agendaItems: formData.agendaItems.filter((_, i) => i !== index)
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!template) return <div className="text-center py-12">Template not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/templates')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          <p className="text-gray-500">{template.description}</p>
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

      {editing ? (
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Template Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  className="input w-32"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Agenda Items</h2>
              <button type="button" onClick={addAgendaItem} className="btn-secondary flex items-center gap-1 text-sm">
                <PlusIcon className="h-4 w-4" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {formData.agendaItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Title"
                      className="input"
                      value={item.title}
                      onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Duration (min)"
                      className="input"
                      value={item.duration}
                      onChange={(e) => updateAgendaItem(index, 'duration', parseInt(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {formData.agendaItems.length === 0 && (
                <p className="text-gray-500 text-center py-4">No agenda items. Click "Add Item" to add one.</p>
              )}
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
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h2 className="font-semibold text-gray-900 mb-4">Agenda Items</h2>
            {template.agendaItems && (template.agendaItems as any[]).length > 0 ? (
              <div className="space-y-3">
                {(template.agendaItems as any[]).map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium">{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                    </div>
                    {item.duration && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />{item.duration} min
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No agenda items defined</p>
            )}
          </div>

          <div className="card h-fit">
            <h2 className="font-semibold text-gray-900 mb-4">Info</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-gray-900">{template.duration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Visibility</p>
                <p className="text-gray-900">{template.isPublic ? 'Public' : 'Private'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Agenda Items</p>
                <p className="text-gray-900">{(template.agendaItems as any[])?.length || 0} items</p>
              </div>
              <button onClick={() => setEditing(true)} className="btn-secondary w-full">
                Edit Template
              </button>
              <button className="btn-primary w-full">Use Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
