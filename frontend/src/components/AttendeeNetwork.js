import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../api/axios';

export default function AttendeeNetwork() {
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/custom-views/attendee-network')
      .then((r) => setData({ nodes: r.data.nodes || [], edges: r.data.edges || [] }))
      .catch((e) => setErr(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  // Lay nodes out on a circle so they're visible without a layout library
  const { rfNodes, rfEdges } = useMemo(() => {
    const n = data.nodes.length;
    const r = Math.max(160, n * 18);
    const cx = 380;
    const cy = 280;
    const rfNodes = data.nodes.map((node, i) => {
      const theta = (i / Math.max(1, n)) * 2 * Math.PI;
      return {
        id: node.id,
        position: { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) },
        data: { label: `${node.label}\n(${node.count})` },
        style: {
          width: 130,
          fontSize: 11,
          textAlign: 'center',
          background: '#eef2ff',
          border: '1px solid #6366f1',
          borderRadius: 8,
          padding: 6,
          whiteSpace: 'pre-line',
        },
      };
    });

    const maxW = data.edges.reduce((m, e) => Math.max(m, e.weight), 1);
    const rfEdges = data.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: `${e.weight}`,
      animated: e.weight >= maxW * 0.6,
      style: { strokeWidth: Math.max(1, (e.weight / maxW) * 4), stroke: '#6366f1' },
      labelStyle: { fontSize: 10, fill: '#1e1b4b' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    }));
    return { rfNodes, rfEdges };
  }, [data]);

  if (loading) return <div className="p-4 text-gray-500">Loading attendee network…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!data.nodes.length)
    return <div className="p-4 text-gray-500">No attendee data yet.</div>;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Attendee Co-attendance Network</h3>
        <div className="text-xs text-gray-500">
          {data.nodes.length} attendees · {data.edges.length} connections
        </div>
      </div>
      <div style={{ width: '100%', height: 560, border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <ReactFlow nodes={rfNodes} edges={rfEdges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Edge thickness = number of meetings two attendees both attended.
      </div>
    </div>
  );
}
