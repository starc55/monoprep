import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import { getAttempts } from '../services/adminService.js';
import { formatDate } from '../utils/format.js';

export default function AdminAttemptsPage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    getAttempts()
      .then(setAttempts)
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Attempts" subtitle="Monitor exam progress and submitted results.">
        <Loader label="Loading attempts..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Attempts" subtitle="Monitor exam progress and submitted results.">
      <Card title="All Attempts">
        {attempts.length ? <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Status</th>
                <th>Score</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.student}</td>
                  <td>{attempt.examTitle}</td>
                  <td>{attempt.status}</td>
                  <td>{attempt.totalScore ?? '--'}%</td>
                  <td>{formatDate(attempt.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : (
          <EmptyState
            icon={ClipboardList}
            title="No attempts submitted"
            message="Student practice activity and results will be recorded here."
          />
        )}
      </Card>
    </AdminLayout>
  );
}
