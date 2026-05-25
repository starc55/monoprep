import { BarChart3, ClipboardCheck, ClipboardList, Trophy, UsersRound } from 'lucide-react';
import StatCard from '../ui/StatCard.jsx';

export default function AdminStatsPanel({ totals }) {
  return (
    <div className="stats-grid">
      <StatCard icon={UsersRound} label="Users" value={totals.usersCount} />
      <StatCard icon={ClipboardList} tone="violet" label="Exams" value={totals.examsCount} />
      <StatCard icon={Trophy} tone="amber" label="Attempts" value={totals.attemptsCount} />
      <StatCard icon={ClipboardCheck} tone="green" label="Submitted" value={totals.submittedAttemptsCount} />
      <StatCard icon={BarChart3} label="Average Score" value={`${totals.averageScore}%`} />
    </div>
  );
}
