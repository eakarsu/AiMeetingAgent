import { useState } from 'react';
import api from '../api/axios';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

export default function DecisionReversalRisk() {
  const [form, setForm] = useState({
    decisionTitle: 'Vendor consolidation for analytics tooling',
    decisionRationale: 'The team selected one platform to reduce duplicate reporting work and centralize governance.',
    meetingSummary: 'Finance, security, data, and product reviewed platform options. Security raised unresolved data retention questions.',
    stakeholders: 'Finance\nSecurity\nData Platform\nProduct',
    openRisks: 'Data retention terms are not finalized\nMigration timeline overlaps quarter close',
    priorDecisionCount: '4',
    dissentSignals: '3',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const analyze = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await api.post('/decision-reversal-risk/analyze', {
        decisionTitle: form.decisionTitle,
        decisionRationale: form.decisionRationale,
        meetingSummary: form.meetingSummary,
        stakeholders: splitLines(form.stakeholders),
        openRisks: splitLines(form.openRisks),
        priorDecisionCount: Number(form.priorDecisionCount || 0),
        dissentSignals: Number(form.dissentSignals || 0),
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to analyze decision reversal risk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <ArrowPathIcon className="h-6 w-6 text-primary-600" />
          Decision Reversal Risk
        </h1>
        <p className="mt-1 text-sm text-gray-600">Estimate whether a decision is likely to be reopened, refined, or overturned.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={analyze} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Decision title
            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.decisionTitle} onChange={(e) => update('decisionTitle', e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Decision rationale
            <textarea rows={4} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.decisionRationale} onChange={(e) => update('decisionRationale', e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Meeting summary
            <textarea rows={4} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.meetingSummary} onChange={(e) => update('meetingSummary', e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Stakeholders, one per line
            <textarea rows={3} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.stakeholders} onChange={(e) => update('stakeholders', e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Open risks, one per line
            <textarea rows={3} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.openRisks} onChange={(e) => update('openRisks', e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Prior decisions
              <input type="number" min="0" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.priorDecisionCount} onChange={(e) => update('priorDecisionCount', e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Dissent signals
              <input type="number" min="0" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.dissentSignals} onChange={(e) => update('dissentSignals', e.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={loading} className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Analyzing...' : 'Analyze reversal risk'}
          </button>
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </form>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Risk output</h2>
          {!result ? (
            <p className="mt-3 text-sm text-gray-600">Run an analysis to see the risk band, leading indicators, and mitigation plan.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
                <div>
                  <div className="text-3xl font-semibold text-gray-900">{result.score}/100</div>
                  <div className="text-sm uppercase tracking-wide text-gray-500">{result.band} reversal risk</div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Leading indicators</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">{result.leadingIndicators.map((item: string) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Mitigation plan</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">{result.mitigationPlan.map((item: string) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
