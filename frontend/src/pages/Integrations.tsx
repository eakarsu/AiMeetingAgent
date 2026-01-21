import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { PuzzlePieceIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const integrationIcons: Record<string, string> = {
  google_calendar: '📅',
  outlook: '📧',
  zoom: '📹',
  teams: '💬',
  google_meet: '🎥',
  slack: '💬',
  discord: '🎮',
  notion: '📝',
  confluence: '📚',
  jira: '🎯',
  asana: '✅',
  trello: '📋',
  salesforce: '☁️',
  hubspot: '🔶',
  github: '🐙',
  gitlab: '🦊'
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await api.get('/integrations');
        setIntegrations(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  const toggleConnection = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === 'connected') {
        await api.post(`/integrations/${id}/disconnect`);
      } else {
        await api.post(`/integrations/${id}/connect`, { config: { enabled: true } });
      }
      const response = await api.get('/integrations');
      setIntegrations(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500">Connect your favorite tools and services</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{integrationIcons[integration.name] || '🔗'}</span>
                <div>
                  <p className="font-medium text-gray-900 capitalize">{integration.name.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500 capitalize">{integration.type.replace('_', ' ')}</p>
                </div>
              </div>
              {integration.status === 'connected' ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-gray-300" />
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleConnection(integration.id, integration.status)}
                className={`flex-1 ${integration.status === 'connected' ? 'btn-secondary' : 'btn-primary'}`}
              >
                {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
              </button>
              <button
                onClick={() => navigate(`/integrations/${integration.id}`)}
                className="btn-secondary"
              >
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      {integrations.length === 0 && (
        <div className="text-center py-12 card">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No integrations available</p>
        </div>
      )}
    </div>
  );
}
