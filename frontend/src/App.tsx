import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import ActionItems from './pages/ActionItems';
import ActionItemDetail from './pages/ActionItemDetail';
import Notes from './pages/Notes';
import NoteDetail from './pages/NoteDetail';
import Transcripts from './pages/Transcripts';
import TranscriptDetail from './pages/TranscriptDetail';
import Decisions from './pages/Decisions';
import DecisionDetail from './pages/DecisionDetail';
import FollowUps from './pages/FollowUps';
import FollowUpDetail from './pages/FollowUpDetail';
import Insights from './pages/Insights';
import InsightDetail from './pages/InsightDetail';
import Templates from './pages/Templates';
import TemplateDetail from './pages/TemplateDetail';
import Integrations from './pages/Integrations';
import IntegrationDetail from './pages/IntegrationDetail';
import Notifications from './pages/Notifications';
import Calendar from './pages/Calendar';
import CalendarEventDetail from './pages/CalendarEventDetail';
import Analytics from './pages/Analytics';
import AIAssistant from './pages/AIAssistant';
import JoinMeeting from './pages/JoinMeeting';
import Recordings from './pages/Recordings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/meetings/:id" element={<MeetingDetail />} />
                <Route path="/action-items" element={<ActionItems />} />
                <Route path="/action-items/:id" element={<ActionItemDetail />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/notes/:id" element={<NoteDetail />} />
                <Route path="/transcripts" element={<Transcripts />} />
                <Route path="/transcripts/:id" element={<TranscriptDetail />} />
                <Route path="/decisions" element={<Decisions />} />
                <Route path="/decisions/:id" element={<DecisionDetail />} />
                <Route path="/follow-ups" element={<FollowUps />} />
                <Route path="/follow-ups/:id" element={<FollowUpDetail />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/insights/:id" element={<InsightDetail />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/templates/:id" element={<TemplateDetail />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/integrations/:id" element={<IntegrationDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/calendar/:id" element={<CalendarEventDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/ai-assistant" element={<AIAssistant />} />
                <Route path="/join-meeting" element={<JoinMeeting />} />
                <Route path="/recordings" element={<Recordings />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
