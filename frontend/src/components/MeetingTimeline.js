import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import api from '../api/axios';

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
};

export default function MeetingTimeline() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/custom-views/timeline')
      .then((r) => setItems(r.data.items || []))
      .catch((e) => setErr(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Loading timeline…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!items.length)
    return <div className="p-4 text-gray-500">No meetings to show.</div>;

  // Group by project for the chart
  const projects = Array.from(new Set(items.map((i) => i.project)));
  const data = items.map((i) => ({
    name: i.title.length > 28 ? i.title.slice(0, 25) + '…' : i.title,
    durationMin: i.durationMin,
    project: i.project,
    status: i.status,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Meeting Timeline</h3>
        <div className="text-xs text-gray-500">
          {items.length} meetings · {projects.length} project{projects.length === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{ width: '100%', height: 380 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 24 }}>
            <XAxis type="number" label={{ value: 'Duration (min)', position: 'insideBottom', offset: -5 }} />
            <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, _n, p) => [`${v} min`, p?.payload?.status || '']}
              labelFormatter={(l) => `Meeting: ${l}`}
            />
            <Legend
              payload={Object.entries(STATUS_COLORS).map(([k, v]) => ({
                value: k,
                type: 'square',
                color: v,
              }))}
            />
            <Bar dataKey="durationMin" radius={[0, 6, 6, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={STATUS_COLORS[d.status] || '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Color = status · grouped by project: {projects.slice(0, 6).join(', ')}
        {projects.length > 6 ? '…' : ''}
      </div>
    </div>
  );
}
