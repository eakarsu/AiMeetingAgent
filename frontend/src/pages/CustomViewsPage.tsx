// @ts-nocheck
import MeetingTimeline from '../components/MeetingTimeline.js';
import AttendeeNetwork from '../components/AttendeeNetwork.js';
import MeetingSummaryPDF from '../components/MeetingSummaryPDF.js';
import ActionItemExtractor from '../components/ActionItemExtractor.js';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meeting Views</h1>
        <p className="text-gray-500 text-sm">
          Custom visualizations and tools for meetings, attendees, summaries, and action items.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MeetingTimeline />
        <AttendeeNetwork />
        <MeetingSummaryPDF />
        <ActionItemExtractor />
      </div>
    </div>
  );
}
