import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import { getExams } from '../services/examService.js';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    async function loadData() {
      const examRows = await getExams();
      setExams(examRows);
      setLoading(false);
    }

    loadData().catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout
        title="Student Dashboard"
        subtitle="Track your recent work, see where scores are moving, and jump back into practice."
        actions={
          <Link className="button button-primary" to="/practice">
            Start practice
          </Link>
        }
      >
        <Loader label="Preparing dashboard..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Student Dashboard"
      subtitle="A clean launch point for your prep workspace."
      actions={
        <Link className="button button-primary" to="/practice">
          Open practice exams
        </Link>
      }
    >
      <div className="stats-grid">
        <StatCard label="Available Exams" value={exams.length} />
        <StatCard label="Practice Hub" value="1" hint="Attempts and analytics are inside Practice Exams." />
        <StatCard label="Profile" value="Ready" hint="Manage your account from the sidebar." />
      </div>

      <div className="content-grid two-up">
        <Card title="Practice Exams" eyebrow="Main workspace">
          <p>Start exams, resume active attempts, review submitted attempts, and study analytics from one place.</p>
          <Link className="button button-primary" to="/practice">
            Open practice library
          </Link>
        </Card>

        <Card title="Profile" eyebrow="Account">
          <p>Keep your student profile clean so attempts and feedback stay attached to the right account.</p>
          <Link className="button button-ghost" to="/profile">
            Manage profile
          </Link>
        </Card>
      </div>
    </AppLayout>
  );
}
