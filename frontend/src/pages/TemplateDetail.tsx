import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeftIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/templates/${id}`);
        setTemplate(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Delete this template?')) {
      await api.delete(`/templates/${id}`);
      navigate('/templates');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!template) return <div className="text-center py-12">Template not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/templates')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5 text-gray-500" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          <p className="text-gray-500">{template.description}</p>
        </div>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><TrashIcon className="h-5 w-5" /></button>
      </div>

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
                  {item.duration && <span className="text-sm text-gray-500 flex items-center gap-1"><ClockIcon className="h-4 w-4" />{item.duration} min</span>}
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
            <div><p className="text-sm text-gray-500">Duration</p><p className="text-gray-900">{template.duration} minutes</p></div>
            <div><p className="text-sm text-gray-500">Visibility</p><p className="text-gray-900">{template.isPublic ? 'Public' : 'Private'}</p></div>
            <div><p className="text-sm text-gray-500">Agenda Items</p><p className="text-gray-900">{(template.agendaItems as any[])?.length || 0} items</p></div>
            <button className="btn-primary w-full">Use Template</button>
          </div>
        </div>
      </div>
    </div>
  );
}
