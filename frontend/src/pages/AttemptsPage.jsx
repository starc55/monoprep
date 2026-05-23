import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
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

  if (loading) {
    return (
      <AppLayout title="Attempts" subtitle="Resume active work or review submitted practice exams.">
        <Loader label="Loading attempts..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Attempts" subtitle="Resume active work or review submitted practice exams.">
      <Card title="Your Attempts">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Status</th>
                <th>Score</th>
                <th>Started</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.examTitle}</td>
                  <td>{attempt.status}</td>
                  <td>{attempt.totalScore ?? '--'}%</td>
                  <td>{formatDate(attempt.startedAt)}</td>
                  <td>
                    <Link to={attempt.status === 'IN_PROGRESS' ? `/attempts/${attempt.id}/exam` : `/attempts/${attempt.id}/review`}>
                      {attempt.status === 'IN_PROGRESS' ? 'Resume' : 'Review'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
