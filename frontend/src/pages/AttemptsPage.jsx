import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ClipboardList, Clock3, PlayCircle, Trophy } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getMyAttempts } from '../services/attemptService.js';
import { formatDate } from '../utils/format.js';

export default function AttemptsPage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    getMyAttempts()
      .then(setAttempts)
      .finally(() => setLoading(false));
  }, []);

  const overview = useMemo(() => {
    const completed = attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');
    return {
      completed: completed.length,
      inProgress: attempts.length - completed.length,
      bestScore: completed.length ? Math.max(...completed.map((attempt) => attempt.totalScore || 0)) : 0
    };
  }, [attempts]);

  if (loading) {
    return (
      <AppLayout title="Attempts / Results" subtitle="Resume active work or review completed practice exams.">
        <Loader label="Loading attempts..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Attempts / Results" subtitle="Resume active work or review completed practice exams.">
      <div className="stats-grid attempt-stats">
        <StatCard icon={ClipboardList} label="All Attempts" value={attempts.length} />
        <StatCard icon={Clock3} tone="amber" label="In Progress" value={overview.inProgress} />
        <StatCard icon={Trophy} tone="green" label="Completed" value={overview.completed} />
        <StatCard icon={BarChart3} tone="violet" label="Best Score" value={`${overview.bestScore}%`} />
      </div>

      {attempts.length ? (
        <Card title="Your results" className="attempt-table-card">
          <div className="table-wrap">
            <table className="data-table result-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Status</th>
                  <th>Final score</th>
                  <th>Reading/Writing</th>
                  <th>Math</th>
                  <th>Started</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => {
                  const active = attempt.status === 'IN_PROGRESS';
                  return (
                    <tr key={attempt.id}>
                      <td><strong>{attempt.examTitle}</strong></td>
                      <td>
                        <span className={`pill ${active ? 'info' : 'success'}`}>
                          {active ? <Clock3 /> : <Trophy />}
                          {active ? 'In Progress' : 'Completed'}
                        </span>
                      </td>
                      <td>{attempt.totalScore == null ? '--' : `${attempt.totalScore}%`}</td>
                      <td>{attempt.readingWritingScore == null ? '--' : `${attempt.readingWritingScore}%`}</td>
                      <td>{attempt.mathScore == null ? '--' : `${attempt.mathScore}%`}</td>
                      <td>{formatDate(attempt.startedAt)}</td>
                      <td>
                        <Link className="table-action" to={active ? `/attempts/${attempt.id}/exam` : `/attempts/${attempt.id}/review`}>
                          {active ? <PlayCircle /> : <BarChart3 />}
                          {active ? 'Continue' : 'Review'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No attempts yet"
          message="Choose a practice paper to start building your score history and analytics."
          actionLabel="Browse practice exams"
          actionTo="/practice"
        />
      )}
    </AppLayout>
  );
}
