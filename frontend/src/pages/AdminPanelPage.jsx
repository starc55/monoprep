import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  ShieldAlert,
  Trophy,
  UsersRound
} from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import AdminStatsPanel from '../components/admin/AdminStatsPanel.jsx';
import { getStats } from '../services/adminService.js';

const adminModules = [
  { title: 'Exams', path: '/admin/exams', copy: 'Build sections, questions, options, and publishing status.', icon: ClipboardList },
  { title: 'Questions', path: '/admin/questions', copy: 'Audit skills, difficulty, answer keys, and options.', icon: FileQuestion },
  { title: 'Question Hub', path: '/admin/question-hub', copy: 'Add quick-practice items students can solve anytime.', icon: GraduationCap },
  { title: 'Passages', path: '/admin/passages', copy: 'Create and maintain stimulus material.', icon: BookOpen },
  { title: 'Mentors', path: '/admin/mentors', copy: 'Publish support-session teachers, contacts, and slots.', icon: UsersRound },
  { title: 'Users', path: '/admin/users', copy: 'View student and admin profiles.', icon: UsersRound },
  { title: 'Attempts', path: '/admin/attempts', copy: 'Monitor active and submitted attempts.', icon: Trophy },
  { title: 'Stats', path: '/admin/stats', copy: 'Review platform-level performance.', icon: BarChart3 }
];

export default function AdminPanelPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  async function loadAll() {
    const statsResponse = await getStats();
    setStats(statsResponse);
  }

  useEffect(() => {
    loadAll()
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout
        title="Admin Panel"
        subtitle="A separate control center for exams, questions, users, attempts, and platform stats."
      >
        <Loader label="Loading admin panel..." />
      </AdminLayout>
    );
  }

  if (failed || !stats) {
    return (
      <AdminLayout title="Admin Panel" subtitle="Secure platform administration workspace.">
        <EmptyState
          icon={ShieldAlert}
          title="Admin data unavailable"
          message="The control center could not load right now. Refresh after checking your admin session."
        />
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
        {adminModules.map(({ title, path, copy, icon: Icon }) => (
          <Card key={path} title={title} className="admin-module-card">
            <span className="admin-module-icon"><Icon aria-hidden="true" /></span>
            <p>{copy}</p>
            <Link className="button button-primary" to={path}>
              Open module
              <ArrowRight aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
