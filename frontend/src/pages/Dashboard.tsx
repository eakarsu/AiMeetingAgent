import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import {
  CalendarIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  VideoCameraIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface Stats {
  totalMeetings: number;
  totalActionItems: number;
  completedActionItems: number;
  pendingActionItems: number;
  upcomingMeetings: number;
  completionRate: number;
}

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  status: string;
  participants: any[];
}

interface ActionItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, meetingsRes, actionItemsRes] = await Promise.all([
          api.get('/analytics/dashboard/stats'),
          api.get('/meetings'),
          api.get('/action-items')
        ]);
        setStats(statsRes.data);
        setMeetings(meetingsRes.data.slice(0, 5));
        setActionItems(actionItemsRes.data.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    {
      name: 'Total Meetings',
      value: stats?.totalMeetings || 0,
      icon: CalendarIcon,
      color: 'bg-blue-500',
      href: '/meetings'
    },
    {
      name: 'Upcoming Meetings',
      value: stats?.upcomingMeetings || 0,
      icon: ClockIcon,
      color: 'bg-purple-500',
      href: '/meetings'
    },
    {
      name: 'Action Items',
      value: stats?.totalActionItems || 0,
      icon: ClipboardDocumentListIcon,
      color: 'bg-orange-500',
      href: '/action-items'
    },
    {
      name: 'Completion Rate',
      value: `${stats?.completionRate || 0}%`,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      href: '/analytics'
    }
  ];

  const featureCards = [
    { name: 'Meetings', description: 'Schedule and manage meetings', icon: CalendarIcon, href: '/meetings', color: 'text-blue-600 bg-blue-50' },
    { name: 'Action Items', description: 'Track tasks and to-dos', icon: ClipboardDocumentListIcon, href: '/action-items', color: 'text-orange-600 bg-orange-50' },
    { name: 'Decisions', description: 'Record meeting decisions', icon: CheckCircleIcon, href: '/decisions', color: 'text-green-600 bg-green-50' },
    { name: 'AI Insights', description: 'AI-powered meeting analysis', icon: SparklesIcon, href: '/insights', color: 'text-purple-600 bg-purple-50' },
    { name: 'Templates', description: 'Meeting templates library', icon: UserGroupIcon, href: '/templates', color: 'text-pink-600 bg-pink-50' },
    { name: 'Analytics', description: 'Meeting performance metrics', icon: ChartBarIcon, href: '/analytics', color: 'text-indigo-600 bg-indigo-50' }
  ];

  const handleCardClick = (href: string) => {
    navigate(href);
  };

  const handleRowClick = (type: string, id: string) => {
    navigate(`/${type}/${id}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-info';
      default: return 'badge-gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-info';
      case 'scheduled': return 'badge-info';
      default: return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to your AI Meeting Agent</p>
      </div>

      {/* Join Meeting CTA */}
      <div
        onClick={() => handleCardClick('/join-meeting')}
        className="card-hover bg-gradient-to-r from-green-600 to-emerald-600 text-white cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-xl">
            <VideoCameraIcon className="h-10 w-10" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Join a Meeting Now</h3>
            <p className="text-white/80">
              Paste any Zoom, Google Meet, or Teams link and let AI attend, take notes, and capture everything
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
            <PlayIcon className="h-5 w-5" />
            <span className="font-medium">Join Meeting</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            onClick={() => handleCardClick(stat.href)}
            className="card-hover flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {featureCards.map((feature) => (
            <div
              key={feature.name}
              onClick={() => handleCardClick(feature.href)}
              className="card-hover text-center py-6"
            >
              <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-3`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{feature.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Meetings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Meetings</h2>
            <Link to="/meetings" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => handleRowClick('meetings', meeting.id)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{meeting.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(meeting.startTime), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <span className={getStatusColor(meeting.status)}>
                  {meeting.status}
                </span>
              </div>
            ))}
            {meetings.length === 0 && (
              <p className="text-center text-gray-500 py-4">No meetings yet</p>
            )}
          </div>
        </div>

        {/* Action Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Action Items</h2>
            <Link to="/action-items" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleRowClick('action-items', item.id)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-sm text-gray-500">
                    {item.dueDate ? `Due: ${format(new Date(item.dueDate), 'MMM d')}` : 'No due date'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={getPriorityColor(item.priority)}>
                    {item.priority}
                  </span>
                  <span className={getStatusColor(item.status)}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
            {actionItems.length === 0 && (
              <p className="text-center text-gray-500 py-4">No action items yet</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Promo */}
      <div
        onClick={() => handleCardClick('/ai-assistant')}
        className="card-hover bg-gradient-to-r from-primary-600 to-primary-800 text-white"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-xl">
            <SparklesIcon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">AI Meeting Assistant</h3>
            <p className="text-white/80">
              Generate summaries, extract action items, and get insights from your meetings using AI.
            </p>
          </div>
          <ArrowTrendingUpIcon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
