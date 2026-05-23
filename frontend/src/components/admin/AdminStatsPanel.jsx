import StatCard from '../ui/StatCard.jsx';

export default function AdminStatsPanel({ totals }) {
  return (
    <div className="stats-grid">
      <StatCard label="Users" value={totals.usersCount} />
      <StatCard label="Exams" value={totals.examsCount} />
      <StatCard label="Attempts" value={totals.attemptsCount} />
      <StatCard label="Submitted" value={totals.submittedAttemptsCount} />
      <StatCard label="Average Score" value={`${totals.averageScore}%`} />
    </div>
  );
}
