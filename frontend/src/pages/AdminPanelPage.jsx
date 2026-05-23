import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import Card from '../components/ui/Card.jsx';
import AdminStatsPanel from '../components/admin/AdminStatsPanel.jsx';
import { getStats } from '../services/adminService.js';

export default function AdminPanelPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  async function loadAll() {
    const statsResponse = await getStats();
    setStats(statsResponse);
  }

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <AdminLayout
        title="Admin Panel"
        subtitle="A separate control center for exams, questions, users, attempts, and platform stats."
      >
        <Loader label="Loading admin panel..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Admin Panel"
      subtitle="A separate control center for exams, questions, users, attempts, and platform stats."
    >
      <AdminStatsPanel totals={stats.totals} />

      <div className="content-grid admin-overview-grid">
        {[
          ['Exams', '/admin/exams', 'Build sections, questions, options, and publishing status.'],
          ['Questions', '/admin/questions', 'Audit skills, difficulty, answer keys, and options.'],
          ['Passages', '/admin/passages', 'Create and maintain stimulus material.'],
          ['Users', '/admin/users', 'View student and admin profiles.'],
          ['Attempts', '/admin/attempts', 'Monitor active and submitted attempts.'],
          ['Stats', '/admin/stats', 'Review platform-level performance.']
        ].map(([title, path, copy]) => (
          <Card key={path} title={title}>
            <p>{copy}</p>
            <Link className="button button-primary" to={path}>
              Open
            </Link>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
