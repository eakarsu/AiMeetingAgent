import { useState } from 'react';
import api from '../api/axios';

const actionPresets = [
  {
    label: 'Kickoff',
    transcript: `Kickoff meeting notes.
Sarah will draft the proposal by Friday.
John needs to review the analytics dashboard by 2026-05-25.
Mike should schedule a follow-up with the client by next week.
Action: Sarah to send the contract to legal by tomorrow.`,
  },
  {
    label: 'Engineering sync',
    transcript: `Maya: The release candidate passed testing.
Noah will define the billing alert threshold by Wednesday.
Iris will verify the rollback checklist before Thursday launch.
Action: Maya to publish the launch decision after the final staging check.`,
  },
  {
    label: 'Customer review',
    transcript: `Avery: Permission questions remain the largest support issue.
Sam will send the revised permission guide to Northstar by Friday.
Jordan will schedule an executive review for the two at-risk accounts by October 18.
Action: Avery to measure support volume again in two weeks.`,
  },
];

export default function ActionItemExtractor() {
  const [transcript, setTranscript] = useState(actionPresets[0].transcript);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setErr('');
    setLoading(true);
    try {
      const resp = await api.post('/custom-views/extract-actions', { transcript });
      const items = (resp.data.items || []).map((i, idx) => ({
        ...i,
        _id: idx,
      }));
      setRows(items);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (id, field, value) => {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id) => setRows((rs) => rs.filter((r) => r._id !== id));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Action Item Extractor</h3>
      <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
        <div className="text-sm font-semibold text-gray-900">Complete transcript examples</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {actionPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={loading}
              onClick={() => { setTranscript(preset.transcript); setRows([]); setErr(''); }}
              className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Paste meeting transcript
      </label>
      <textarea
        rows={8}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        className="w-full border rounded-md p-2 text-sm font-mono mb-2"
      />
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={run}
          disabled={loading || !transcript.trim()}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Extracting…' : 'Extract Action Items'}
        </button>
        <span className="text-xs text-gray-500">
          {rows.length ? `${rows.length} item(s) found` : 'No items yet.'}
        </span>
      </div>
      {err && <div className="text-red-600 text-sm mb-2">Error: {err}</div>}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left border-b">Action</th>
                <th className="px-2 py-1 text-left border-b w-40">Owner</th>
                <th className="px-2 py-1 text-left border-b w-40">Due date</th>
                <th className="px-2 py-1 border-b w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b">
                  <td className="px-2 py-1">
                    <input
                      className="w-full border rounded p-1 text-sm"
                      value={r.text}
                      onChange={(e) => update(r._id, 'text', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="w-full border rounded p-1 text-sm"
                      value={r.owner || ''}
                      placeholder="unassigned"
                      onChange={(e) => update(r._id, 'owner', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="w-full border rounded p-1 text-sm"
                      value={r.dueDate || ''}
                      placeholder="—"
                      onChange={(e) => update(r._id, 'dueDate', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => removeRow(r._id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
