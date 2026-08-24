import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, ShieldAlert } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import AdminStatsPanel from "../components/admin/AdminStatsPanel.jsx";
import Card from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import { getStats } from "../services/adminService.js";

function AnalyticsChart({ type, data, dataKey, labelKey, color }) {
  if (!data?.some((item) => Number(item[dataKey]) > 0)) {
    return <div className="crm-chart-empty"><BarChart3 aria-hidden="true" /><span>Real activity will appear here after submitted attempts.</span></div>;
  }
  const Chart = type === "line" ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <Chart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.07)" />
        <XAxis dataKey={labelKey} tickLine={false} axisLine={false} stroke="#64748b" fontSize={11} />
        <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={11} allowDecimals={false} />
        <Tooltip />
        {type === "line" ? <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} /> : <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />}
      </Chart>
    </ResponsiveContainer>
  );
}

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getStats().then(setStats).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout title="Stats" subtitle="Platform analytics and operational performance."><Loader label="Loading stats..." /></AdminLayout>;
  if (failed || !stats) return <AdminLayout title="Stats" subtitle="Platform analytics and operational performance."><EmptyState icon={ShieldAlert} title="Statistics unavailable" message="Platform performance data could not be loaded right now." /></AdminLayout>;

  return (
    <AdminLayout title="Stats" subtitle="A real-data view of usage, submissions, and SAT score distribution.">
      <div className="admin-stats-crm">
        <AdminStatsPanel totals={stats.totals} />
        <section className="analytics-crm-grid">
          <Card title="Attempts over time" className="crm-chart-card"><p>Submitted attempts across the latest 14-day window.</p><AnalyticsChart type="line" data={stats.attemptsOverTime} dataKey="attempts" labelKey="label" color="#245eea" /></Card>
          <Card title="SAT score distribution" className="crm-chart-card"><p>Submitted student scores grouped by official SAT ranges.</p><AnalyticsChart type="bar" data={stats.scoreDistribution} dataKey="students" labelKey="label" color="#7057d9" /></Card>
        </section>
        <Card title="Recent attempts" className="crm-table-card">
          {stats.recentAttempts.length ? <div className="table-wrap"><table className="data-table crm-data-table"><thead><tr><th>Student</th><th>Exam</th><th>Started</th><th>Status</th><th>Score</th></tr></thead><tbody>{stats.recentAttempts.map((attempt) => <tr key={attempt.id}><td><strong>{attempt.student}</strong><small>{attempt.email}</small></td><td>{attempt.examTitle}</td><td>{new Date(attempt.startedAt).toLocaleString()}</td><td><span className={`table-status ${attempt.status === "IN_PROGRESS" ? "pending" : "approved"}`}>{attempt.status.replaceAll("_", " ")}</span></td><td><strong>{attempt.totalScore ?? "--"}</strong></td></tr>)}</tbody></table></div> : <EmptyState icon={BarChart3} title="No recent attempts" message="Submitted attempts will appear here automatically." />}
        </Card>
      </div>
    </AdminLayout>
  );
}
