import { useEffect, useState } from 'react';
import { BarChart3, ShieldAlert } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AdminStatsPanel from '../components/admin/AdminStatsPanel.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import { getStats } from '../services/adminService.js';

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Stats" subtitle="Platform-level activity, attempts, and average score.">
        <Loader label="Loading stats..." />
      </AdminLayout>
    );
  }

  if (failed || !stats) {
    return (
      <AdminLayout title="Stats" subtitle="Platform-level activity, attempts, and average score.">
        <EmptyState
          icon={ShieldAlert}
          title="Statistics unavailable"
          message="Platform performance data could not be loaded right now."
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Stats" subtitle="Platform-level activity, attempts, and average score.">
      <AdminStatsPanel totals={stats.totals} />
      <Card title="Recent Attempts">
        {stats.recentAttempts.length ? <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentAttempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.student}</td>
                  <td>{attempt.examTitle}</td>
                  <td>{attempt.status}</td>
                  <td>{attempt.totalScore ?? '--'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : (
          <EmptyState
            icon={BarChart3}
            title="No recent attempts"
            message="Submitted student attempts will appear here with score activity."
          />
        )}
      </Card>
    </AdminLayout>
  );
}
