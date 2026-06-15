import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, BookOpen, ClipboardList, Medal, PlayCircle, Sparkles, Target, TrendingUp, UserRound } from 'lucide-react';
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
            <PlayCircle aria-hidden="true" />
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
          <PlayCircle aria-hidden="true" />
          Open practice exams
        </Link>
      }
    >
      <motion.div
        className="stats-grid"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36 }}
      >
        <StatCard icon={ClipboardList} label="Available Exams" value={exams.length} />
        <StatCard icon={TrendingUp} tone="violet" label="Practice Hub" value="1" hint="Attempts and analytics are inside Practice Exams." />
        <StatCard icon={UserRound} tone="green" label="Profile" value="Ready" hint="Manage your account from the sidebar." />
      </motion.div>

      <motion.div
        className="dashboard-jump-grid"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.36 }}
      >
        <Link to="/analytics#score-summary">
          <BarChart3 aria-hidden="true" />
          <span>Scores</span>
        </Link>
        <Link to="/analytics#domain-performance">
          <Target aria-hidden="true" />
          <span>Domains</span>
        </Link>
        <Link to="/analytics#leaderboard-section">
          <Medal aria-hidden="true" />
          <span>Leaderboard</span>
        </Link>
      </motion.div>

      <motion.div
        className="content-grid two-up"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.38 }}
      >
        <Card title="Practice Exams" eyebrow="Main workspace" className="dashboard-feature-card">
          <span className="card-corner-icon"><BookOpen aria-hidden="true" /></span>
          <p>Start exams, resume active attempts, review submitted attempts, and study analytics from one place.</p>
          <Link className="button button-primary" to="/practice">
            Open practice library
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>

        <Card title="Profile" eyebrow="Account" className="dashboard-feature-card">
          <span className="card-corner-icon"><Sparkles aria-hidden="true" /></span>
          <p>Keep your student profile clean so attempts and feedback stay attached to the right account.</p>
          <Link className="button button-ghost" to="/profile">
            Manage profile
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
