import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function IntegrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [integration, setIntegration] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/integrations/${id}`);
        setIntegration(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const toggleConnection = async () => {
    try {
      if (integration.status === 'connected') {
        await api.post(`/integrations/${id}/disconnect`);
      } else {
        await api.post(`/integrations/${id}/connect`, { config: { enabled: true } });
      }
      const response = await api.get(`/integrations/${id}`);
      setIntegration(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!integration) return <div className="text-center py-12">Integration not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/integrations')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeftIcon className="h-5 w-5 text-gray-500" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{integration.name.replace('_', ' ')}</h1>
          <p className="text-gray-500 capitalize">{integration.type.replace('_', ' ')}</p>
        </div>
        {integration.status === 'connected' ? (
          <span className="badge-success flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" />Connected</span>
        ) : (
          <span className="badge-gray flex items-center gap-1"><XCircleIcon className="h-4 w-4" />Disconnected</span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Connection Status</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Current Status</p>
              <p className="font-medium text-gray-900 capitalize">{integration.status}</p>
            </div>
            <button onClick={toggleConnection} className={`w-full ${integration.status === 'connected' ? 'btn-secondary' : 'btn-primary'}`}>
              {integration.status === 'connected' ? 'Disconnect Integration' : 'Connect Integration'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Configuration</h2>
          {integration.config ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{JSON.stringify(integration.config, null, 2)}</pre>
            </div>
          ) : (
            <p className="text-gray-500">No configuration set</p>
          )}
        </div>
      </div>
    </div>
  );
}
