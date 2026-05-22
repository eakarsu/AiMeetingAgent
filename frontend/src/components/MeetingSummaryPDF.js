import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function MeetingSummaryPDF() {
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .get('/custom-views/meetings')
      .then((r) => {
        setMeetings(r.data.meetings || []);
        if (r.data.meetings?.length) setSelected(r.data.meetings[0].id);
      })
      .catch((e) => setMsg(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  const download = async () => {
    if (!selected) return;
    setGenerating(true);
    setMsg('');
    try {
      const resp = await api.get(`/custom-views/summary-pdf/${selected}`, {
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-${selected}-summary.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg('PDF downloaded.');
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message || 'failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Meeting Summary PDF</h3>
      {loading ? (
        <div className="text-gray-500">Loading meetings…</div>
      ) : !meetings.length ? (
        <div className="text-gray-500">No meetings available.</div>
      ) : (
        <>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pick a meeting
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full border rounded-md p-2 text-sm mb-3"
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} — {m.startTime ? new Date(m.startTime).toLocaleDateString() : ''}
              </option>
            ))}
          </select>
          <button
            onClick={download}
            disabled={generating}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
          {msg && <div className="mt-3 text-sm text-gray-600">{msg}</div>}
          <div className="mt-4 text-xs text-gray-500">
            The PDF includes attendees, agenda, decisions, action items, and next steps.
          </div>
        </>
      )}
    </div>
  );
}
