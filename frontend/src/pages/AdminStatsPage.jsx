import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AdminStatsPanel from '../components/admin/AdminStatsPanel.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import { getStats } from '../services/adminService.js';

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <AdminLayout title="Stats" subtitle="Platform-level activity, attempts, and average score.">
        <Loader label="Loading stats..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Stats" subtitle="Platform-level activity, attempts, and average score.">
      <AdminStatsPanel totals={stats.totals} />
      <Card title="Recent Attempts">
        <div className="table-wrap">
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
        </div>
      </Card>
    </AdminLayout>
  );
}
