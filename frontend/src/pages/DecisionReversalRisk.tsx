import { useState } from 'react';
import api from '../api/axios';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import AIReport from '../components/AIReport';

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
const riskPresets = [
  {
    label: 'Vendor review',
    values: {
      decisionTitle: 'Vendor consolidation for analytics tooling',
      decisionRationale: 'The team selected one platform to reduce duplicate reporting work, centralize governance, and lower annual support costs.',
      meetingSummary: 'Finance, security, data, and product reviewed three platform options. Security raised unresolved data-retention and export questions before approval.',
      stakeholders: 'Finance\nSecurity\nData Platform\nProduct',
      openRisks: 'Data retention terms are not finalized\nMigration timeline overlaps quarter close',
      priorDecisionCount: '4',
      dissentSignals: '3',
    },
  },
  {
    label: 'Launch scope',
    values: {
      decisionTitle: 'Reduce the first release to two workflows',
      decisionRationale: 'The release keeps onboarding and reporting while moving experimental automation to the next milestone so the team can meet the committed date.',
      meetingSummary: 'Product, engineering, support, and sales agreed on the smaller scope after reviewing delivery estimates, customer commitments, and launch-readiness evidence.',
      stakeholders: 'Product\nEngineering\nSupport\nSales',
      openRisks: 'Two pilot customers requested the deferred automation\nUpdated enablement material still needs approval',
      priorDecisionCount: '2',
      dissentSignals: '1',
    },
  },
  {
    label: 'Policy change',
    values: {
      decisionTitle: 'Require security review before external data exports',
      decisionRationale: 'The policy adds a documented security approval to reduce accidental disclosure while retaining an expedited path for time-sensitive customer requests.',
      meetingSummary: 'Legal, security, customer success, and operations reviewed recent exceptions and agreed to a staged rollout with a 30-day checkpoint.',
      stakeholders: 'Legal\nSecurity\nCustomer Success\nOperations',
      openRisks: 'Approval service-level target is not yet measured\nLegacy export jobs need an owner',
      priorDecisionCount: '1',
      dissentSignals: '2',
    },
  },
];

export default function DecisionReversalRisk() {
  const [form, setForm] = useState(riskPresets[0].values);
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
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Fill every field</div>
            <p className="mt-1 text-xs text-gray-600">Each preset fills all seven required and optional analysis fields.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {riskPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={loading}
                  onClick={() => { setForm(preset.values); setResult(null); setError(''); }}
                  className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
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

        {result ? (
          <AIReport response={result} title="Decision reversal risk" />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Risk output</h2>
            <p className="mt-3 text-sm text-gray-600">Run an analysis to see the risk band, leading indicators, mitigation plan, and audit fields.</p>
          </div>
        )}
      </div>
    </div>
  );
}
