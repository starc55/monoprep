import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import DashboardHero from '../components/dashboard/DashboardHero.jsx';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import ChartCard, { ChartEmptyState } from '../components/dashboard/ChartCard.jsx';
import ModuleCard from '../components/dashboard/ModuleCard.jsx';
import QuickActionCard from '../components/dashboard/QuickActionCard.jsx';
import { dashboardAssets } from '../data/dashboardAssets.js';
import { getStats } from '../services/adminService.js';

const managementModules = [
  { title: 'Exam Builder', path: '/admin/exams', description: 'Create, publish, and maintain SAT practice papers.', art: dashboardAssets.exam },
  { title: 'Passage Library', path: '/admin/passages', description: 'Organize reading stimuli and source material.', art: dashboardAssets.rec },
  { title: 'Desmos Lessons', path: '/admin/desmos-lessons', description: 'Publish visual calculator strategies for students.', art: dashboardAssets.target },
  { title: 'Teachers', path: '/admin/teachers', description: 'Create teacher accounts and control approval status.', art: dashboardAssets.hat },
  { title: 'Users', path: '/admin/users', description: 'Review student and administrator accounts.', art: dashboardAssets.mono },
  { title: 'Analytics', path: '/admin/stats', description: 'Inspect platform outcomes and performance trends.', art: dashboardAssets.chart }
];

function formatDate(value) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function AttemptsLineChart({ data = [] }) {
  const hasData = data.some((item) => item.attempts > 0);
  if (!hasData) {
    return <ChartEmptyState label="Submitted attempts will populate this trend." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
        <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="attempts" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ScoreDistributionChart({ data = [] }) {
  const hasData = data.some((item) => item.students > 0);
  if (!hasData) {
    return <ChartEmptyState label="Scores will appear after students submit attempts." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
        <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="students" fill="#7c3aed" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminPanelPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getStats()
      .then((statsResponse) => setStats(statsResponse))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Admin Control Center" subtitle="Loading platform operations.">
        <Loader label="Loading admin control center..." />
      </AdminLayout>
    );
  }

  if (failed || !stats) {
    return (
      <AdminLayout title="Admin Control Center" subtitle="Secure platform administration workspace.">
        <EmptyState
          title="Admin data unavailable"
          message="The control center could not load right now. Refresh after checking your admin session."
        />
      </AdminLayout>
    );
  }

  const totals = stats.totals || {};
  const recentAttempts = stats.recentAttempts || [];
  const recentUsers = stats.recentUsers || [];

  return (
    <AdminLayout title="Admin Control Center" subtitle="A focused SaaS command center for content, users, and outcomes.">
      <div className="dashboard-page-shell admin-dashboard-shell">
        <DashboardHero
          variant="admin"
          art={dashboardAssets.mono}
          title="Admin Control Center"
          subtitle="Build exams, monitor attempts, and keep the learning platform moving from one clean workspace."
          metrics={[
            { label: 'Published exams', value: totals.publishedExamsCount || 0 },
            { label: 'Questions', value: totals.questionCount || 0 },
            { label: 'Submitted', value: totals.submittedAttemptsCount || 0 }
          ]}
          insight={{
            art: dashboardAssets.chart,
            label: 'Platform average score',
            title: totals.averageScore ? `${totals.averageScore}` : '--',
            description: 'Calculated from submitted attempts.'
          }}
          actions={(
            <>
              <Link className="button button-primary" to="/admin/exams">
                Create Exam
              </Link>
              <Link className="button button-ghost" to="/admin/passages">Add Passage</Link>
              <Link className="button button-ghost" to="/admin/stats">View Analytics</Link>
            </>
          )}
        />

        <section className="pro-kpi-row pro-admin-kpi-row" aria-label="Admin KPIs">
          <KpiCard art={dashboardAssets.mono} label="Users" value={totals.usersCount || 0} hint="Registered accounts" tone="blue" index={0} />
          <KpiCard art={dashboardAssets.exam} label="Published Exams" value={totals.publishedExamsCount || 0} hint={`${totals.examsCount || 0} total exams`} tone="green" index={1} />
          <KpiCard art={dashboardAssets.pen} label="Questions" value={totals.questionCount || 0} hint="Exam question library" tone="violet" index={2} />
          <KpiCard art={dashboardAssets.attempt} label="Submitted Attempts" value={totals.submittedAttemptsCount || 0} hint={`${totals.attemptsCount || 0} total attempts`} tone="amber" index={3} />
          <KpiCard art={dashboardAssets.chart} label="Average Score" value={totals.averageScore || '--'} hint="Submitted attempts" tone="blue" index={4} />
        </section>

        <section className="pro-admin-analytics-grid">
          <ChartCard art={dashboardAssets.chart} title="Attempts Over Time" subtitle="Submitted attempts across the last 14 days.">
            <AttemptsLineChart data={stats.attemptsOverTime || []} />
          </ChartCard>
          <ChartCard art={dashboardAssets.chart} title="Score Distribution" subtitle="How submitted attempts are spread by SAT range.">
            <ScoreDistributionChart data={stats.scoreDistribution || []} />
          </ChartCard>
        </section>

        <section className="pro-management-section">
          <div className="pro-section-heading">
            <h2>Management Modules</h2>
            <p>Six core areas, no clutter.</p>
          </div>
          <div className="pro-module-grid">
            {managementModules.map((module) => (
              <ModuleCard
                key={module.path}
                art={module.art}
                title={module.title}
                description={module.description}
                to={module.path}
              />
            ))}
          </div>
        </section>

        <section className="pro-dashboard-bottom-grid">
          <ChartCard art={dashboardAssets.attempt} title="Recent Attempts" subtitle="Latest student activity.">
            <div className="pro-activity-list">
              {recentAttempts.slice(0, 5).map((attempt) => (
                <QuickActionCard
                  key={attempt.id}
                  art={dashboardAssets.attempt}
                  title={attempt.examTitle}
                  description={`${attempt.student} - ${attempt.status.replaceAll('_', ' ').toLowerCase()} - ${attempt.totalScore || '--'}`}
                  to="/admin/stats"
                />
              ))}
              {!recentAttempts.length ? <p className="pro-empty-copy">No recent attempts yet.</p> : null}
            </div>
          </ChartCard>

          <ChartCard art={dashboardAssets.mono} title="Recent Users" subtitle="Newest accounts on the platform.">
            <div className="pro-activity-list">
              {recentUsers.slice(0, 5).map((row) => (
                <QuickActionCard
                  key={row.id}
                  art={dashboardAssets.mono}
                  title={row.fullName}
                  description={`${row.role.toLowerCase()} - joined ${formatDate(row.createdAt)}`}
                  to="/admin/users"
                />
              ))}
              {!recentUsers.length ? <p className="pro-empty-copy">No recent users yet.</p> : null}
            </div>
          </ChartCard>
        </section>
      </div>
    </AdminLayout>
  );
}
