import { useEffect, useState } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';

interface Series {
  id: string;
  name: string;
  cadence: string;
  meetingIds: string[];
  decisionDensity: number;
  actionDensity: number;
  riskLevel: 'healthy' | 'at_risk' | 'redundant';
  aiAnalysis?: string;
  lastAnalyzedAt: string;
}

const riskBadge: Record<Series['riskLevel'], string> = {
  healthy: 'bg-emerald-100 text-emerald-700',
  at_risk: 'bg-amber-100 text-amber-700',
  redundant: 'bg-red-100 text-red-700',
};

export default function MeetingSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [risk, setRisk] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [windowDays, setWindowDays] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (risk) params.set('riskLevel', risk);
      const res = await api.get(`/meeting-series?${params.toString()}`);
      setSeries(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load series');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-line */ }, [page, risk]);

  const detect = async () => {
    setRunning(true);
    setError(null);
    try {
      await api.post('/meeting-series/detect', { windowDays });
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Detection failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recurring Meeting Intelligence</h1>
        <p className="text-gray-500">
          Automatically clusters recurring meetings and flags series that should be cancelled or restructured.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>
      )}

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600">Window (days)</label>
          <input
            type="number"
            min={7}
            max={365}
            className="input"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value) || 60)}
          />
        </div>
        <button onClick={detect} disabled={running} className="btn-primary">
          {running ? 'Analysing…' : 'Detect / refresh series'}
        </button>
        <div className="ml-auto">
          <label className="block text-xs font-semibold text-gray-600">Filter by risk</label>
          <select className="input" value={risk} onChange={(e) => { setRisk(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="healthy">Healthy</option>
            <option value="at_risk">At risk</option>
            <option value="redundant">Redundant</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3">
        {series.length === 0 && (
          <div className="text-gray-500 text-sm">No series detected yet. Click "Detect" to scan recent meetings.</div>
        )}
        {series.map((s) => (
          <div key={s.id} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold capitalize">{s.name || '(untitled series)'}</div>
                <div className="text-xs text-gray-500">
                  Cadence: {s.cadence} · Meetings: {s.meetingIds.length} · Last analyzed:{' '}
                  {format(new Date(s.lastAnalyzedAt), 'PPpp')}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${riskBadge[s.riskLevel]}`}>{s.riskLevel}</span>
            </div>
            <div className="text-sm text-gray-600">
              Avg decisions/meeting: <strong>{s.decisionDensity.toFixed(2)}</strong> · Avg actions/meeting:{' '}
              <strong>{s.actionDensity.toFixed(2)}</strong>
            </div>
            {s.aiAnalysis && (
              <div className="text-sm bg-gray-50 p-3 rounded text-gray-700">{s.aiAnalysis}</div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
