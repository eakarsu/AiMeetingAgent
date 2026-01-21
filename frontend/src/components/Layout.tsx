import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  PuzzlePieceIcon,
  BellIcon,
  ChartBarIcon,
  SparklesIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  VideoCameraIcon,
  FilmIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Join Meeting', href: '/join-meeting', icon: VideoCameraIcon },
  { name: 'Recordings', href: '/recordings', icon: FilmIcon },
  { name: 'Meetings', href: '/meetings', icon: CalendarIcon },
  { name: 'Action Items', href: '/action-items', icon: ClipboardDocumentListIcon },
  { name: 'Notes', href: '/notes', icon: DocumentTextIcon },
  { name: 'Transcripts', href: '/transcripts', icon: ChatBubbleLeftRightIcon },
  { name: 'Decisions', href: '/decisions', icon: CheckCircleIcon },
  { name: 'Follow-ups', href: '/follow-ups', icon: ArrowPathIcon },
  { name: 'AI Insights', href: '/insights', icon: LightBulbIcon },
  { name: 'Templates', href: '/templates', icon: DocumentDuplicateIcon },
  { name: 'Integrations', href: '/integrations', icon: PuzzlePieceIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'AI Assistant', href: '/ai-assistant', icon: SparklesIcon },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <span className="text-xl font-bold text-primary-600">AI Meeting Agent</span>
            <button onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-6 border-b">
            <span className="text-xl font-bold text-primary-600">AI Meeting Agent</span>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6 text-gray-500" />
            </button>
            <div className="flex items-center gap-4">
              <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
