import { useState } from 'react';
import api from '../api/axios';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  FaceSmileIcon,
  LightBulbIcon,
  EnvelopeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

interface AIResponse {
  type: string;
  data: any;
  rawText?: string;
  savedId?: string;
  savedIds?: string[];
}

const sampleTranscripts: Record<string, string> = {
  engineering: `[Engineering Standup - Monday 9:00 AM]

Sarah Chen (Tech Lead): Good morning everyone. Let's do our standup. I'll go first. Over the weekend I finished the database migration script for the user profiles table. It's been tested locally and passes all 47 unit tests. Today I'm going to deploy it to staging and run the full regression suite. No blockers on my end.

Marcus Johnson (Backend Dev): Nice work on that, Sarah. I spent Friday working on the authentication middleware refactor. I've replaced the old JWT validation with the new library — it's about 3x faster on benchmarks. However, I'm blocked on one thing: I need the updated API keys from DevOps for the staging environment. Jake, can you get those to me today?

Jake Williams (DevOps): Yeah, I can do that by noon. I was dealing with the Kubernetes cluster issue all of last Friday. We had three pods crash due to memory limits being set too low. I've bumped them from 512MB to 1GB and added auto-scaling rules. The cluster has been stable since Saturday morning. Today I'm working on the CI/CD pipeline — we need to add the new integration tests to the build process.

Priya Patel (Frontend Dev): I've been working on the new dashboard redesign. The component library migration from Material UI to our custom design system is about 60% done. I finished the data tables, charts, and navigation components. Today I'm tackling the form components. One concern — the design specs for the mobile breakpoints aren't finalized. Lisa, do we have an ETA on those?

Lisa Park (Product Manager): The design team promised them by Wednesday. I'll ping them today to confirm. Also, I wanted to flag that the client demo is moved up to Thursday instead of next Monday. That means we need the dashboard MVP ready by Wednesday EOD. Can we make that work?

Sarah Chen: That's tight but doable if we prioritize. Priya, can you focus on the critical path components first — the main dashboard view and the metrics cards?

Priya Patel: Yes, I'll reprioritize. I'll skip the settings page for now and focus on dashboard and metrics.

Marcus Johnson: I should have the auth middleware done by Tuesday, so the login flow will be working for the demo.

Jake Williams: I'll make sure staging is rock solid by Wednesday morning. I'll also set up the demo environment with sample data.

Lisa Park: Perfect. Let's do a dry run Wednesday at 4 PM. I'll send a calendar invite. One more thing — the sprint velocity report shows we're at 85% completion this sprint, which is our best in three months.

Sarah Chen: Great team effort. Anything else? No? Let's get to it. Remember, Wednesday EOD is our target.`,

  sales: `[Quarterly Sales Review - Q3 Performance]

David Martinez (VP Sales): Welcome everyone to our Q3 review. Let's dive into the numbers. Overall revenue came in at $4.2 million, which is 12% above our target of $3.75 million. Great quarter, but let's look at what's working and what needs attention.

Rachel Kim (Enterprise Sales): Enterprise segment drove most of the growth. We closed 8 new enterprise deals this quarter, including the Meridian Corp contract worth $450K annually. Our enterprise pipeline is strong — we have 14 qualified opportunities worth a combined $2.1 million. The biggest one is TechVault Industries at $380K, and I'm expecting to close that by mid-October.

Tom Anderson (Mid-Market Sales): Mid-market was solid too. We closed 23 deals averaging $45K each. However, I want to flag that our win rate dropped from 34% to 28% this quarter. The main reason is increased competition from CloudSync — they're undercutting us by about 20% on pricing. I think we need to revisit our mid-market pricing strategy.

David Martinez: That's concerning. Let's schedule a pricing review meeting next week. Rachel, can you share how enterprise handles competitive pricing pressure?

Rachel Kim: We've been leading with ROI analysis rather than competing on price. Our enterprise customers save an average of $180K per year in operational costs. We need to build similar ROI tools for mid-market.

Jennifer Walsh (Sales Ops): On the operations side, our sales cycle length increased from 42 days to 51 days this quarter. The biggest bottleneck is the technical evaluation phase — it's taking an average of 18 days. I recommend we create pre-built demo environments to speed that up.

David Martinez: Good call. Tom, work with the SE team to build those demo environments. Target: have them ready by November 1st.

Amanda Liu (Customer Success): Retention numbers are strong — 94% gross retention and 112% net retention. Upsells contributed $680K this quarter. Our NPS score is 72, up from 68 last quarter. However, three accounts flagged churn risk: DataFlow Inc, Apex Solutions, and GreenTech. Combined ARR at risk is $285K.

David Martinez: Amanda, let's set up executive business reviews with all three at-risk accounts within the next two weeks. I'll personally join the GreenTech call since they're our oldest customer.

Rachel Kim: One more thing — we should discuss the 2024 territory realignment. I'm proposing we split the West Coast enterprise territory into two regions. The current territory has too many accounts for one rep.

David Martinez: Agreed. Let's present that proposal at the leadership meeting on Friday. Alright, great quarter team. Let's keep the momentum going into Q4. Our Q4 target is $4.8 million.`,

  project: `[New Feature Planning - AI Analytics Dashboard]

Michelle Torres (Product Director): Thanks for joining. Today we're planning the AI Analytics Dashboard feature — this is our flagship feature for the v3.0 release. Let me set the context: customers have been asking for predictive analytics for over a year, and our top 3 competitors all launched something similar in the last 6 months. We need to ship this by March 15th.

Alex Rivera (Engineering Manager): March 15th gives us about 12 weeks. Let me walk through the technical approach. We're proposing a three-phase delivery. Phase 1 is the data pipeline — we need to build the ETL process to aggregate customer data from our five data sources. That's about 3 weeks of work for two backend engineers.

Wei Zhang (Data Scientist): For the ML models, I'm recommending we start with three prediction types: churn prediction, revenue forecasting, and usage pattern anomalies. Churn prediction is the most mature — I already have a prototype with 87% accuracy. Revenue forecasting will need about 4 weeks to train and validate. The anomaly detection is more experimental.

Michelle Torres: Can we scope anomaly detection out of v3.0 and add it in v3.1? I'd rather ship two solid features than three half-baked ones.

Alex Rivera: I agree. Let's keep the scope tight. Phase 2 would be the API layer and backend services — about 2 weeks. Phase 3 is the frontend dashboard with interactive charts and drill-down capabilities — that's about 3 weeks for the frontend team.

Kevin O'Brien (UX Designer): I've been working on the dashboard mockups. The key insight from user research is that people want "insights, not dashboards." They don't want to configure charts — they want the system to tell them what's important. I'm designing an "AI Insights Feed" as the primary view, with detailed charts accessible on drill-down.

Michelle Torres: I love that approach. It differentiates us from competitors who just show charts.

Alex Rivera: One risk I want to flag: we'll need to upgrade our database infrastructure. The current PostgreSQL setup can't handle the real-time aggregation queries. I'm recommending we add a ClickHouse instance for analytics. Budget estimate is $2,500/month for the managed service.

Michelle Torres: That's within budget. Let's get that approved this week. I'll talk to finance.

Naomi Washington (QA Lead): For testing, I'll need the ML models to be testable with deterministic outputs. Wei, can you provide a test mode that uses fixed seed data?

Wei Zhang: Yes, I'll add a test mode with fixed random seeds and sample datasets. I'll have that ready by the end of Phase 1.

Michelle Torres: Let's talk about risks. What could derail us?

Alex Rivera: The biggest risk is data quality. If customer data is messy, the ML models won't perform well. I suggest we add a 1-week data quality sprint at the start.

Wei Zhang: Agreed. Also, we should plan for model monitoring post-launch. ML models degrade over time if not retrained.

Michelle Torres: Good points. Let me summarize the timeline: Week 1-2 data quality sprint, Week 2-5 Phase 1 (data pipeline + ML), Week 5-7 Phase 2 (API layer), Week 7-10 Phase 3 (frontend), Week 10-12 QA and polish. Alex, does that work?

Alex Rivera: Yes, with the caveat that we need all four engineers dedicated — no pulling them onto support rotations during this period.

Michelle Torres: I'll make sure of that. Let's reconvene next Monday with detailed sprint plans.`,

  executive: `[Executive Board Meeting - Strategic Planning]

Catherine Wells (CEO): Let's get started. We have four agenda items: Q3 financial review, 2024 budget approval, hiring plan, and competitive landscape. Robert, take us through the financials.

Robert Chang (CFO): Q3 revenue was $12.8 million, up 18% year-over-year. Gross margin improved to 72% from 68% last year — that's the SaaS efficiency gains we predicted. Operating expenses were $9.2 million, putting us at an operating margin of 28%. Cash position is $24 million with a burn rate of negative — we're now cash flow positive for the second consecutive quarter.

Catherine Wells: That's a milestone. Cash flow positive two quarters running.

Robert Chang: For the 2024 budget, I'm proposing total spend of $42 million against projected revenue of $58 million. The biggest investment areas are R&D at $18 million — that's a 30% increase — and sales & marketing at $14 million. The R&D increase funds the AI platform initiative and the European data center buildout.

Samantha Rhodes (CTO): On the R&D side, the $18 million breaks down to: $8 million for the core platform team, $5 million for the new AI division, $3 million for infrastructure and the EU data center, and $2 million for security and compliance — we need SOC 2 Type II and GDPR compliance by Q2.

Catherine Wells: The EU data center is critical for our European expansion. When do we expect it operational?

Samantha Rhodes: Target is June 2024. We've signed with AWS Frankfurt. The main dependency is the GDPR compliance work — our legal team is working with the DPA in Ireland.

James Park (VP People): On hiring, I'm proposing we grow from 156 to 210 employees by end of 2024. That's 54 net new hires. Breakdown: 25 engineering, 12 sales, 8 customer success, 5 marketing, and 4 G&A. The biggest challenge is senior AI engineers — the market is extremely competitive. Average time-to-fill for senior AI roles is 90 days, and compensation expectations have increased 25% year-over-year.

Catherine Wells: We need to be competitive on compensation. Robert, can we adjust the engineering compensation bands?

Robert Chang: I've modeled a 15% increase in senior engineering bands. That adds approximately $1.2 million to the annual budget but should significantly improve our acceptance rates.

Catherine Wells: Approved. Let's implement the new bands immediately.

Michael Torres (VP Strategy): On the competitive front, three things to note. First, our main competitor DataPulse just raised $80 million Series C. They'll be aggressive on enterprise sales. Second, there's a new entrant — FlowMetrics — that's gaining traction in the mid-market with a product-led growth strategy. Third, Microsoft just announced they're adding analytics features to Teams, which could impact our collaboration module.

Catherine Wells: How do we respond?

Michael Torres: I recommend we accelerate the AI differentiation strategy. Our predictive analytics capabilities are 6-12 months ahead of DataPulse. We should also consider an acquisition in the PLG space — I have two targets identified. FlowMetrics itself might be acquirable; they've only raised $12 million.

Catherine Wells: Set up a meeting with our M&A advisors to evaluate FlowMetrics. But keep it confidential — just the exec team. Any other business?

Robert Chang: One more item — the board has approved our Series B extension. We're adding $10 million to our balance sheet at the same valuation. Documents are with legal for signing next week.

Catherine Wells: Excellent. That gives us additional runway for the European expansion. Let's wrap up. Key decisions: 2024 budget approved at $42 million, engineering compensation bands increased by 15%, hiring target set at 210 by year-end. Michael, proceed with the M&A evaluation. Next board meeting is January 15th.`
};

export default function AIAssistant() {
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedFormat, setSelectedFormat] = useState('detailed');

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message });
      setResponse({ type: 'chat', data: res.data.response, savedId: res.data.savedId });
    } catch (error) {
      setResponse({ type: 'error', data: 'Error processing request. Please check your OpenRouter API key.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!transcript.trim()) {
      setResponse({ type: 'error', data: 'Please enter a transcript or meeting content first.' });
      return;
    }
    setLoading(true);
    try {
      let res;
      switch (action) {
        case 'summarize':
          res = await api.post('/ai/generate-summary', { transcript, format: selectedFormat });
          setResponse({ type: 'summary', data: res.data.result, savedId: res.data.savedId });
          break;
        case 'extract-actions':
          res = await api.post('/ai/extract-actions', { transcript });
          setResponse({ type: 'actionItems', data: res.data.actionItems, savedIds: res.data.savedIds });
          break;
        case 'sentiment':
          res = await api.post('/ai/sentiment', { transcript });
          setResponse({ type: 'sentiment', data: res.data.sentiment, savedId: res.data.savedId });
          break;
        case 'topics':
          res = await api.post('/ai/topics', { transcript });
          setResponse({ type: 'topics', data: res.data.topics, savedId: res.data.savedId });
          break;
        case 'follow-up':
          res = await api.post('/ai/draft-followup', {
            meetingTitle: 'Meeting',
            summary: transcript,
            actionItems: [],
            tone: 'professional'
          });
          setResponse({ type: 'followUp', data: res.data.followUp, savedIds: res.data.savedIds });
          break;
        case 'suggest-agenda':
          res = await api.post('/ai/suggest-agenda', { meetingTitle: 'Meeting', context: transcript });
          setResponse({ type: 'agenda', data: res.data.suggestions, savedIds: res.data.savedIds });
          break;
        case 'extract-decisions':
          res = await api.post('/ai/extract-decisions', { transcript });
          setResponse({ type: 'decisions', data: res.data.decisions, savedIds: res.data.savedIds });
          break;
        case 'daily-planner':
          res = await api.post('/ai/daily-planner', {
            date: new Date().toISOString().split('T')[0],
            meetings: [],
            actionItems: [],
            priorities: transcript
          });
          setResponse({ type: 'dailyPlan', data: res.data.dailyPlan, savedId: res.data.savedId });
          break;
        case 'transcribe':
          res = await api.post('/ai/transcribe', { rawText: transcript });
          setResponse({ type: 'transcript', data: res.data.transcript, savedId: res.data.savedId });
          break;
        case 'notes':
          res = await api.post('/ai/generate-notes', { transcript });
          setResponse({ type: 'notes', data: res.data.notes, savedId: res.data.savedId });
          break;
      }
    } catch (error) {
      setResponse({ type: 'error', data: 'Error processing request. Please check your OpenRouter API key.' });
    } finally {
      setLoading(false);
    }
  };

  const aiFeatures = [
    { id: 'summarize', name: 'Summarize', icon: DocumentTextIcon, description: 'Generate summary', color: 'text-blue-600 bg-blue-50' },
    { id: 'extract-actions', name: 'Actions', icon: ClipboardDocumentListIcon, description: 'Extract action items', color: 'text-orange-600 bg-orange-50' },
    { id: 'sentiment', name: 'Sentiment', icon: FaceSmileIcon, description: 'Analyze tone', color: 'text-yellow-600 bg-yellow-50' },
    { id: 'topics', name: 'Topics', icon: LightBulbIcon, description: 'Extract topics', color: 'text-purple-600 bg-purple-50' },
    { id: 'follow-up', name: 'Follow-up', icon: EnvelopeIcon, description: 'Draft follow-up', color: 'text-green-600 bg-green-50' },
    { id: 'suggest-agenda', name: 'Agenda', icon: CalendarIcon, description: 'Suggest agenda', color: 'text-pink-600 bg-pink-50' },
    { id: 'extract-decisions', name: 'Decisions', icon: CheckCircleIcon, description: 'Log decisions', color: 'text-teal-600 bg-teal-50' },
    { id: 'daily-planner', name: 'Planner', icon: ClockIcon, description: 'Daily schedule', color: 'text-indigo-600 bg-indigo-50' },
    { id: 'transcribe', name: 'Transcribe', icon: ChatBubbleLeftRightIcon, description: 'Format transcript', color: 'text-red-600 bg-red-50' },
    { id: 'notes', name: 'Notes', icon: PencilSquareIcon, description: 'Generate notes', color: 'text-cyan-600 bg-cyan-50' },
  ];

  const savedBadge = () => {
    if (!response || response.type === 'error') return null;
    if (response.savedId || (response.savedIds && response.savedIds.length > 0)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          Saved to database
        </span>
      );
    }
    return null;
  };

  const renderResponse = () => {
    if (!response) return null;

    switch (response.type) {
      case 'chat':
        return (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{response.data}</div>
          </div>
        );

      case 'summary':
        const summary = response.data;
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                Summary ({summary.format})
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{summary.summary}</p>
            </div>

            {summary.keyPoints?.length > 0 && (
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-3">Key Points</h4>
                <ul className="space-y-2">
                  {summary.keyPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {summary.decisions?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <h4 className="font-medium text-green-800 mb-2">Decisions Made</h4>
                  <ul className="space-y-1">
                    {summary.decisions.map((d: string, i: number) => (
                      <li key={i} className="text-green-700 text-sm flex items-start gap-2">
                        <span className="text-green-500">•</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.actionItems?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <h4 className="font-medium text-orange-800 mb-2">Action Items</h4>
                  <ul className="space-y-1">
                    {summary.actionItems.map((a: string, i: number) => (
                      <li key={i} className="text-orange-700 text-sm flex items-start gap-2">
                        <span className="text-orange-500">•</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {summary.nextSteps?.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <h4 className="font-medium text-purple-800 mb-2">Next Steps</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.nextSteps.map((step: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'actionItems':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-orange-600" />
              Extracted Action Items ({response.data?.length || 0})
            </h3>
            {response.data?.length > 0 ? (
              <div className="space-y-3">
                {response.data.map((item: any, i: number) => (
                  <div key={i} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {item.assignee && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                              <UserGroupIcon className="h-3 w-3" />
                              {item.assignee}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md">
                              <ClockIcon className="h-3 w-3" />
                              {item.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.priority || 'medium'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No action items found in the content.</p>
            )}
          </div>
        );

      case 'sentiment':
        const sentiment = response.data;
        const sentimentColor = sentiment.overall === 'positive' ? 'green' :
                              sentiment.overall === 'negative' ? 'red' : 'yellow';
        return (
          <div className="space-y-6">
            <div className={`bg-${sentimentColor}-50 rounded-xl p-6 border border-${sentimentColor}-200`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaceSmileIcon className="h-6 w-6 text-yellow-500" />
                  Sentiment Analysis
                </h3>
                <div className="text-right">
                  <span className={`text-3xl font-bold text-${sentimentColor}-600`}>
                    {sentiment.score}%
                  </span>
                  <p className={`text-sm text-${sentimentColor}-600 capitalize`}>{sentiment.overall}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`bg-${sentimentColor}-500 h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${sentiment.score}%` }}
                ></div>
              </div>
            </div>

            {sentiment.teamDynamics && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">Team Dynamics</h4>
                <p className="text-blue-700 text-sm">{sentiment.teamDynamics}</p>
              </div>
            )}

            {sentiment.highlights?.length > 0 && (
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-3">Notable Moments</h4>
                <div className="space-y-2">
                  {sentiment.highlights.map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <span className="text-2xl">{typeof h === 'string' ? '💬' : (h.sentiment === 'positive' ? '😊' : h.sentiment === 'negative' ? '😟' : '😐')}</span>
                      <div className="flex-1">
                        <span className="text-gray-700">{typeof h === 'string' ? h : h.text}</span>
                        {h.speaker && <span className="text-gray-400 text-xs ml-2">— {h.speaker}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentiment.concerns?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <h4 className="font-medium text-red-800 mb-2">Concerns</h4>
                <ul className="space-y-1">
                  {sentiment.concerns.map((c: string, i: number) => (
                    <li key={i} className="text-red-700 text-sm flex items-start gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'topics':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-purple-600" />
              Key Topics Discussed
            </h3>
            <div className="space-y-4">
              {response.data?.map((topic: any, i: number) => (
                <div key={i} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-lg">{topic.topic}</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{topic.importance}/10</div>
                        <div className="text-xs text-gray-500">Importance</div>
                      </div>
                      {topic.timeSpent && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-pink-600">{topic.timeSpent}%</div>
                          <div className="text-xs text-gray-500">Time</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {topic.status && (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                      topic.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      topic.status === 'needs-follow-up' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {topic.status}
                    </span>
                  )}
                  {topic.keyPoints?.length > 0 && (
                    <ul className="space-y-1 mt-3">
                      {topic.keyPoints.map((point: string, j: number) => (
                        <li key={j} className="text-gray-600 text-sm flex items-start gap-2">
                          <span className="text-purple-400">→</span> {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'followUp':
        const followUp = response.data;
        // Handle case where data is a string or missing expected structure
        if (!followUp || typeof followUp === 'string') {
          return (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <EnvelopeIcon className="h-5 w-5 text-green-600" />
                Follow-up Draft
              </h3>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {typeof followUp === 'string' ? followUp : JSON.stringify(followUp, null, 2)}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            {followUp.email && (followUp.email.subject || followUp.email.body) && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5 text-green-600" />
                  Follow-up Email
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {followUp.email.subject && (
                    <div className="border-b pb-3 mb-3">
                      <p className="text-sm text-gray-500">Subject:</p>
                      <p className="font-medium text-gray-900">{followUp.email.subject}</p>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-gray-700">{followUp.email.body}</div>
                </div>
              </div>
            )}

            {followUp.executiveSummary && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h4 className="font-medium text-indigo-800 mb-2">Executive Summary</h4>
                <p className="text-indigo-700 text-sm">{followUp.executiveSummary}</p>
              </div>
            )}

            {followUp.slackMessage && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
                  Slack Message
                </h3>
                <div className="bg-purple-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                  {followUp.slackMessage}
                </div>
              </div>
            )}

            {followUp.keyTakeaways?.length > 0 && (
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-3">Key Takeaways</h4>
                <div className="flex flex-wrap gap-2">
                  {followUp.keyTakeaways.map((t: string, i: number) => (
                    <span key={i} className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {followUp.deadlines?.length > 0 && (
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-3">Deadlines</h4>
                <div className="space-y-2">
                  {followUp.deadlines.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{d.task}</p>
                        <p className="text-sm text-gray-500">{d.assignee}</p>
                      </div>
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        {d.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {followUp.nextMeetingAgenda?.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">Suggested Next Meeting Agenda</h4>
                <ul className="space-y-1">
                  {followUp.nextMeetingAgenda.map((item: string, i: number) => (
                    <li key={i} className="text-blue-700 text-sm flex items-start gap-2">
                      <span className="text-blue-400">{i + 1}.</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'agenda':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-pink-600" />
              Suggested Agenda Items
            </h3>
            <div className="space-y-3">
              {response.data?.map((item: any, i: number) => (
                <div key={i} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      {item.expectedOutcome && (
                        <p className="text-xs text-green-600 mt-2">Expected outcome: {item.expectedOutcome}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <span className="text-lg font-bold text-pink-600">{item.estimatedDuration}</span>
                        <p className="text-xs text-gray-500">min</p>
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, j) => (
                          <span key={j} className={`text-lg ${j < item.priority ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {item.type && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-pink-50 text-pink-600 rounded text-xs font-medium">
                      {item.type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'decisions':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-teal-600" />
              Decisions Logged ({response.data?.length || 0})
            </h3>
            <div className="space-y-4">
              {response.data?.map((decision: any, i: number) => (
                <div key={i} className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{decision.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{decision.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      decision.status === 'approved' ? 'bg-green-100 text-green-700' :
                      decision.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      decision.status === 'deferred' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {decision.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {decision.madeBy && (
                      <span className="text-gray-600">
                        <span className="font-medium">By:</span> {decision.madeBy}
                      </span>
                    )}
                    {decision.impact && (
                      <span className={`${
                        decision.impact === 'high' ? 'text-red-600' :
                        decision.impact === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        <span className="font-medium">Impact:</span> {decision.impact}
                      </span>
                    )}
                  </div>
                  {decision.rationale && (
                    <p className="text-sm text-gray-600 mt-3 italic">"{decision.rationale}"</p>
                  )}
                  {decision.nextSteps?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {decision.nextSteps.map((step: string, j: number) => (
                        <span key={j} className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs">
                          {step}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'dailyPlan':
        const plan = response.data;
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-6">
              <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                <ClockIcon className="h-6 w-6" />
                Your Optimized Daily Plan
              </h3>
              <div className="flex items-center gap-6 mt-4">
                <div className="text-center">
                  <span className="text-4xl font-bold">{plan.estimatedProductivity || 0}%</span>
                  <p className="text-white/70 text-sm">Productivity</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold">{plan.schedule?.length || 0}</span>
                  <p className="text-white/70 text-sm">Activities</p>
                </div>
              </div>
            </div>

            {plan.topPriorities?.length > 0 && (
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-3">Top Priorities</h4>
                <div className="space-y-2">
                  {plan.topPriorities.map((p: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-indigo-50 rounded-lg">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {i + 1}
                      </span>
                      <span className="text-gray-700">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plan.schedule?.length > 0 && (
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Schedule</h4>
                <div className="space-y-3">
                  {plan.schedule.map((item: any, i: number) => (
                    <div key={i} className={`flex items-center gap-4 p-3 rounded-lg ${
                      item.type === 'meeting' ? 'bg-blue-50 border-l-4 border-blue-500' :
                      item.type === 'task' ? 'bg-orange-50 border-l-4 border-orange-500' :
                      item.type === 'break' ? 'bg-green-50 border-l-4 border-green-500' :
                      'bg-purple-50 border-l-4 border-purple-500'
                    }`}>
                      <div className="text-center min-w-[60px]">
                        <span className="text-lg font-bold text-gray-900">{item.time}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.activity}</p>
                        {item.notes && <p className="text-sm text-gray-500">{item.notes}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">{item.duration} min</span>
                        {item.priority && (
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            item.priority === 'high' ? 'bg-red-100 text-red-700' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plan.warnings?.length > 0 && (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Warnings
                </h4>
                <ul className="space-y-1">
                  {plan.warnings.map((w: string, i: number) => (
                    <li key={i} className="text-yellow-700 text-sm">{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan.suggestions?.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Suggestions</h4>
                <ul className="space-y-1">
                  {plan.suggestions.map((s: string, i: number) => (
                    <li key={i} className="text-blue-700 text-sm flex items-start gap-2">
                      <LightBulbIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'transcript':
        const transcriptData = response.data;
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-red-600" />
                Formatted Transcript
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                transcriptData.quality === 'excellent' ? 'bg-green-100 text-green-700' :
                transcriptData.quality === 'good' ? 'bg-blue-100 text-blue-700' :
                transcriptData.quality === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                Quality: {transcriptData.quality}
              </span>
            </div>

            {transcriptData.speakers?.length > 0 && (
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-3">Speakers</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {transcriptData.speakers.map((s: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        {s.speakingTime && (
                          <span className="text-sm text-gray-500">{s.speakingTime}</span>
                        )}
                      </div>
                      {s.mainPoints?.length > 0 && (
                        <ul className="text-sm text-gray-600 space-y-1">
                          {s.mainPoints.slice(0, 3).map((p: string, j: number) => (
                            <li key={j} className="truncate">• {p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {transcriptData.topics?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {transcriptData.topics.map((t: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">Transcript</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-700 text-sm font-sans leading-relaxed">
                  {transcriptData.formattedTranscript}
                </pre>
              </div>
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <PencilSquareIcon className="h-5 w-5 text-cyan-600" />
              Generated Meeting Notes
            </h3>
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-100">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{response.data}</div>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <p className="text-red-700">{response.data}</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 rounded-xl p-6">
            <pre className="whitespace-pre-wrap text-gray-700 text-sm">
              {typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SparklesIcon className="h-7 w-7 text-primary-600" />
          AI Assistant
        </h1>
        <p className="text-gray-500">AI-powered meeting analysis using Claude Haiku 4.5</p>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('analyze')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'analyze' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Analyze Content
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Ask AI Assistant</h2>
            <form onSubmit={handleChat} className="space-y-4">
              <textarea
                className="input"
                rows={6}
                placeholder="Ask me anything about meetings, productivity, or get help with meeting-related tasks..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <><ArrowPathIcon className="h-5 w-5 animate-spin" />Processing...</>
                ) : (
                  <><PaperAirplaneIcon className="h-5 w-5" />Send</>
                )}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Response</h2>
              {savedBadge()}
            </div>
            {response ? (
              <div className="max-h-[400px] overflow-y-auto">
                {renderResponse()}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <SparklesIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>AI response will appear here</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Meeting Content</h2>
              <select
                className="input w-auto"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option value="detailed">Detailed Summary</option>
                <option value="executive">Executive Summary</option>
                <option value="bullet">Bullet Points</option>
                <option value="email">Email Format</option>
                <option value="slack">Slack Format</option>
              </select>
            </div>

            {/* Sample Data Buttons */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                <BeakerIcon className="h-4 w-4" />
                Load sample transcript:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'engineering', label: 'Engineering Standup', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' },
                  { key: 'sales', label: 'Sales Review', color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200' },
                  { key: 'project', label: 'Project Planning', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' },
                  { key: 'executive', label: 'Executive Board', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200' },
                ].map((sample) => (
                  <button
                    key={sample.key}
                    onClick={() => setTranscript(sampleTranscripts[sample.key])}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${sample.color}`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="input"
              rows={8}
              placeholder="Paste your meeting transcript, notes, or any content you want to analyze..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {aiFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleAction(feature.id)}
                disabled={loading}
                className="card-hover text-center py-4 px-2"
              >
                <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-2`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <p className="font-medium text-gray-900 text-sm">{feature.name}</p>
                <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
              </button>
            ))}
          </div>

          {loading && (
            <div className="card flex items-center justify-center py-8">
              <ArrowPathIcon className="h-8 w-8 text-primary-600 animate-spin" />
              <span className="ml-3 text-gray-500">Processing with Claude Haiku 4.5...</span>
            </div>
          )}

          {response && !loading && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-primary-600" />
                  AI Result
                </h2>
                <div className="flex items-center gap-3">
                  {savedBadge()}
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {renderResponse()}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <SparklesIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Powered by Claude Haiku 4.5 via OpenRouter</h3>
            <p className="text-sm text-gray-600 mt-1">
              This AI assistant uses Anthropic's Claude Haiku 4.5 model via OpenRouter for fast, accurate meeting analysis.
              Configure your OPENROUTER_API_KEY in the .env file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
