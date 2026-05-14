import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

interface Node { id: string; title: string; status: string; createdAt: string; }
interface Edge { id: string; fromDecisionId: string; toDecisionId: string; relationType: string; confidence: number; }

export default function DecisionGraph() {
  const { id } = useParams<{ id: string }>();
  const [graph, setGraph] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [inferring, setInferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/decision-links/graph/${id}`);
      setGraph(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [id]);

  const infer = async () => {
    if (!id) return;
    setInferring(true);
    setError(null);
    try {
      await api.post('/decision-links/infer', { decisionId: id });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Inference failed');
    } finally {
      setInferring(false);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Decision Graph</h1>
        <button className="btn-primary" disabled={inferring} onClick={infer}>
          {inferring ? 'Asking AI…' : 'Infer related decisions'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded">{error}</div>}

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Decisions ({graph?.nodes.length || 0})</h2>
        <ul className="space-y-1 text-sm">
          {graph?.nodes.map((n) => (
            <li key={n.id} className={n.id === id ? 'font-semibold text-primary-700' : ''}>
              · {n.title} <span className="text-xs text-gray-400">({n.status})</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Relations ({graph?.edges.length || 0})</h2>
        {graph?.edges.length === 0 && (
          <div className="text-sm text-gray-500">
            No relations yet. Click "Infer related decisions" to ask the AI.
          </div>
        )}
        <ul className="space-y-1 text-sm">
          {graph?.edges.map((e) => {
            const from = graph.nodes.find((n) => n.id === e.fromDecisionId);
            const to = graph.nodes.find((n) => n.id === e.toDecisionId);
            return (
              <li key={e.id}>
                <span className="font-medium">{from?.title || e.fromDecisionId}</span>{' '}
                <span className="text-blue-600">{e.relationType}</span>{' '}
                <span className="font-medium">{to?.title || e.toDecisionId}</span>{' '}
                <span className="text-xs text-gray-400">({Math.round(e.confidence * 100)}% conf.)</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
