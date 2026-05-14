import { useEffect, useState } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';

interface CoachReport {
  id: string;
  meetingId: string;
  totalDuration: number;
  participantCount: number;
  speakingTime: Record<string, number>;
  interruptionRate: Record<string, number>;
  monologueCount: Record<string, number>;
  imbalanceScore: number;
  aiInsights: { summary?: string; recommendations?: string[]; warnings?: string[] };
  createdAt: string;
}

export default function MeetingCoach() {
  const [reports, setReports] = useState<CoachReport[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [reportsRes, meetingsRes] = await Promise.all([
        api.get(`/meeting-coach?page=${page}&limit=20`),
        api.get('/meetings'),
      ]);
      setReports(reportsRes.data.data || []);
      setTotalPages(reportsRes.data.pagination?.totalPages || 1);
      setMeetings(Array.isArray(meetingsRes.data) ? meetingsRes.data : meetingsRes.data?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load coach reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [page]);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    setAnalyzing(true);
    setError(null);
    try {
      await api.post('/meeting-coach/analyze', {
        meetingId: selectedMeetingId,
        transcript: transcript.trim() || undefined,
      });
      setTranscript('');
      setSelectedMeetingId('');
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Analyze failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meeting Coach</h1>
        <p className="text-gray-500">
          Analyses speaking-time balance, interruptions, and monologues across your meetings.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <form onSubmit={analyze} className="card p-4 space-y-3">
        <h2 className="font-semibold">Analyse a meeting</h2>
        <select
          className="input w-full"
          value={selectedMeetingId}
          onChange={(e) => setSelectedMeetingId(e.target.value)}
          required
        >
          <option value="">Select a meeting…</option>
          {meetings.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.title} {m.startTime ? `· ${format(new Date(m.startTime), 'PP')}` : ''}
            </option>
          ))}
        </select>
        <textarea
          className="input w-full h-32"
          placeholder="Paste transcript (Speaker: text on each line). Optional — if omitted, the meeting's stored transcript is used."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <button type="submit" disabled={analyzing} className="btn-primary">
          {analyzing ? 'Analysing…' : 'Run analysis'}
        </button>
      </form>

      <div className="grid gap-4">
        {reports.length === 0 && (
          <div className="text-gray-500 text-sm">No coach reports yet — analyse a meeting above.</div>
        )}
        {reports.map((r) => {
          const top = Object.entries(r.speakingTime || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          const totalSpeak = Math.max(1, Object.values(r.speakingTime || {}).reduce((a, b) => a + b, 0));
          return (
            <div key={r.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Report · {format(new Date(r.createdAt), 'PPpp')}</div>
                <div className="text-xs text-gray-500">
                  Imbalance: <span className={r.imbalanceScore > 60 ? 'text-red-600 font-semibold' : 'text-gray-700'}>{r.imbalanceScore}</span>/100 ·
                  Participants: {r.participantCount} · Duration: {Math.round(r.totalDuration / 60)}m
                </div>
              </div>

              <div className="space-y-1">
                {top.map(([name, sec]) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <div className="w-32 truncate">{name}</div>
                    <div className="flex-1 bg-gray-100 rounded h-2">
                      <div
                        className="bg-primary-500 h-2 rounded"
                        style={{ width: `${Math.round((sec / totalSpeak) * 100)}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-gray-500 text-xs">
                      {Math.round(sec / 60)}m {sec % 60}s
                    </div>
                  </div>
                ))}
              </div>

              {r.aiInsights?.summary && (
                <div className="text-sm bg-gray-50 p-3 rounded">
                  <div className="font-semibold text-gray-700">AI summary</div>
                  <div className="text-gray-600">{r.aiInsights.summary}</div>
                </div>
              )}

              {!!r.aiInsights?.warnings?.length && (
                <div className="text-sm">
                  <div className="font-semibold text-amber-700">Warnings</div>
                  <ul className="list-disc ml-5 text-amber-700">
                    {r.aiInsights.warnings!.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {!!r.aiInsights?.recommendations?.length && (
                <div className="text-sm">
                  <div className="font-semibold text-emerald-700">Recommendations</div>
                  <ul className="list-disc ml-5 text-emerald-700">
                    {r.aiInsights.recommendations!.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <button
          className="btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span>Page {page} / {totalPages}</span>
        <button
          className="btn-secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
