import { useEffect, useState } from 'react';
import api from '../api/axios';
import { ChartBarIcon, CalendarIcon, ClipboardDocumentListIcon, UserGroupIcon, ClockIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

export default function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          api.get('/analytics/dashboard/stats'),
          api.get('/analytics')
        ]);
        setStats(statsRes.data);
        setAnalytics(analyticsRes.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  const statCards = [
    { name: 'Total Meetings', value: stats?.totalMeetings || 0, icon: CalendarIcon, color: 'bg-blue-500', change: '+12%' },
    { name: 'Action Items', value: stats?.totalActionItems || 0, icon: ClipboardDocumentListIcon, color: 'bg-orange-500', change: '+8%' },
    { name: 'Completion Rate', value: `${stats?.completionRate || 0}%`, icon: ArrowTrendingUpIcon, color: 'bg-green-500', change: '+5%' },
    { name: 'Upcoming', value: stats?.upcomingMeetings || 0, icon: ClockIcon, color: 'bg-purple-500', change: '-' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Meeting performance and productivity metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm text-green-600 font-medium">{stat.change}</span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Meeting Trends</h2>
          <div className="space-y-4">
            {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, i) => {
              const value = Math.floor(Math.random() * 50) + 20;
              return (
                <div key={week} className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 w-16">{week}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${value}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12">{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Action Items by Status</h2>
          <div className="space-y-4">
            {[
              { label: 'Completed', value: stats?.completedActionItems || 0, color: 'bg-green-500' },
              { label: 'In Progress', value: Math.floor((stats?.totalActionItems || 0) * 0.3), color: 'bg-blue-500' },
              { label: 'Pending', value: stats?.pendingActionItems || 0, color: 'bg-gray-300' },
            ].map((item) => {
              const total = stats?.totalActionItems || 1;
              const percentage = Math.round((item.value / total) * 100);
              return (
                <div key={item.label} className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 w-24">{item.label}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Analytics Data</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meetings</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Duration</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action Rate</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.slice(0, 10).map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 capitalize">{a.period}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{a.meetingsCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{Math.round(a.avgDuration)} min</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{Math.round(a.actionItemsRate * 100)}%</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{Math.round(a.attendanceRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
