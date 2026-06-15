import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Clock3,
  Crown,
  FileText,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Trophy
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { getExams } from '../services/examService.js';
import { getMyAttempts } from '../services/attemptService.js';
import { useAuthStore } from '../store/authStore.js';

const tabs = [
  { id: 'ALL', label: 'All Papers', icon: ClipboardList },
  { id: 'FREE', label: 'Free Tests', icon: BadgeCheck },
  { id: 'PREMIUM', label: 'Premium Tests', icon: Crown },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock3 },
  { id: 'COMPLETED', label: 'Completed', icon: Trophy }
];

const sortOptions = [
  { value: 'newest', label: 'Newest to Oldest' },
  { value: 'oldest', label: 'Oldest to Newest' },
  { value: 'free', label: 'Free First' },
  { value: 'premium', label: 'Premium First' },
  { value: 'completed', label: 'Completed First' }
];

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} request timed out`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function isPremiumExam(exam) {
  return exam.accessType === 'PREMIUM' || exam.isPremium === true;
}

function isCompletedAttempt(attempt) {
  return attempt && attempt.status !== 'IN_PROGRESS';
}

function getExamAttempts(attempts, examId) {
  const examAttempts = attempts.filter((attempt) => attempt.examId === examId);
  const inProgressAttempt = examAttempts.find((attempt) => attempt.status === 'IN_PROGRESS') || null;
  const completedAttempt = examAttempts.find((attempt) => attempt.status !== 'IN_PROGRESS') || null;

  return {
    attempt: inProgressAttempt || completedAttempt,
    inProgressAttempt,
    completedAttempt
  };
}

function formatScore(score) {
  return score === null || score === undefined ? 'Not taken' : `${score}%`;
}

function ExamCard({ row, canUsePremium }) {
  const { exam, attempt, premium, newest, paperNumber } = row;
  const inProgress = attempt?.status === 'IN_PROGRESS';
  const completed = isCompletedAttempt(attempt);
  const locked = premium && !canUsePremium;
  const isFullLength = exam.type === 'FULL_LENGTH';
  const fullLengthFinished = completed && isFullLength;
  const peopleTook = exam.peopleTookCount ?? exam.attemptsCount ?? exam.takenCount ?? '--';
  const questionsCount = exam.sections?.reduce((total, section) => total + (section.questionsCount || section.questions?.length || 0), 0) || 0;

  return (
    <motion.article
      className={`paper-card ${premium ? 'paper-premium' : ''} ${completed ? 'paper-completed' : ''}`.trim()}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="paper-head">
        <span className="paper-icon"><FileText aria-hidden="true" /></span>
        <div>
          <h2>Paper #{paperNumber}</h2>
          <p>{exam.title}</p>
        </div>
        <span className={`access-badge ${premium ? 'premium' : 'free'}`}>
          {premium ? <Crown /> : <BadgeCheck />}
          {premium ? 'Premium' : 'Free'}
        </span>
      </div>

      <div className="paper-badges">
        <span className="pill blue">Version {exam.difficultyLabel || (paperNumber % 2 ? 'Hard' : 'May Predictions')}</span>
        {newest ? (
          <span className="pill amber"><Sparkles /> Newest Test</span>
        ) : null}
        <span className="pill">{isFullLength ? 'Full Length' : 'Practice Test'}</span>
        {inProgress ? (
          <span className="pill info"><Clock3 /> In Progress</span>
        ) : null}
        {completed ? (
          <span className="pill success"><Trophy /> Completed</span>
        ) : null}
      </div>

      {completed ? (
        <div className="paper-score">
          <div className="paper-score-head">
            <div>
              <span>Final score</span>
              <strong>{formatScore(attempt.totalScore)}</strong>
            </div>
            <div className="score-sections">
              <span>Reading/Writing <strong>{formatScore(attempt.readingWritingScore)}</strong></span>
              <span>Math <strong>{formatScore(attempt.mathScore)}</strong></span>
            </div>
          </div>
          <ProgressBar value={attempt.totalScore || 0} tone="green" />
        </div>
      ) : (
        <div className="paper-metrics">
          <div>
            <span>People took</span>
            <strong>{peopleTook}</strong>
          </div>
          <div>
            <span>Your last score</span>
            <strong>{formatScore(exam.lastScore ?? attempt?.totalScore)}</strong>
          </div>
          <div>
            <span>Questions</span>
            <strong>{questionsCount || '--'}</strong>
          </div>
          <div>
            <span>Minutes</span>
            <strong>{exam.totalDuration || '--'}</strong>
          </div>
        </div>
      )}

      <div className="paper-actions">
        {locked ? (
          <button type="button" className="button button-premium" disabled>
            <LockKeyhole aria-hidden="true" /> Upgrade to Access
          </button>
        ) : inProgress ? (
          <Link className="button button-primary" to={`/attempts/${attempt.id}/exam`}>
            <PlayCircle aria-hidden="true" /> Continue Test
          </Link>
        ) : fullLengthFinished ? (
          <Link className="button button-primary" to={`/attempts/${attempt.id}/review`}>
            <BarChart3 aria-hidden="true" /> View Analytics
          </Link>
        ) : completed ? (
          <div className="paper-action-split">
            <Link className="button button-primary" to={`/exams/${exam.id}/instructions`}>
              <PlayCircle aria-hidden="true" /> Start Again
            </Link>
            <Link className="button button-ghost" to={`/attempts/${attempt.id}/review`}>
              Last Result
            </Link>
          </div>
        ) : (
          <Link className="button button-primary" to={`/exams/${exam.id}/instructions`}>
            <PlayCircle aria-hidden="true" /> Start Test
          </Link>
        )}
      </div>
    </motion.article>
  );
}

export default function PracticePage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadExamRows() {
      setLoading(true);
      setLoadError('');
      try {
        const examRows = await withTimeout(getExams(), 12000, 'Practice exams');
        if (!active) return;
        setExams(Array.isArray(examRows) ? examRows : []);
      } catch (error) {
        if (!active) return;
        setExams([]);
        setLoadError(error?.response?.data?.message || error.message || 'Practice exams could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadAttemptRows() {
      try {
        const attemptRows = await withTimeout(getMyAttempts(), 12000, 'Attempts');
        if (active) setAttempts(Array.isArray(attemptRows) ? attemptRows : []);
      } catch (_error) {
        if (active) setAttempts([]);
      }
    }

    loadExamRows();
    loadAttemptRows();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const canUsePremium = Boolean(user?.isPremium || user?.accessType === 'PREMIUM' || user?.plan === 'PREMIUM');
  const examRows = useMemo(
    () => exams.map((exam, index) => {
      const examAttempts = getExamAttempts(attempts, exam.id);
      return {
        exam,
        ...examAttempts,
        premium: isPremiumExam(exam),
        newest: index < 3,
        paperNumber: Math.max(1, 85 - index)
      };
    }),
    [attempts, exams]
  );

  const counts = useMemo(() => ({
    ALL: examRows.length,
    FREE: examRows.filter((row) => !row.premium).length,
    PREMIUM: examRows.filter((row) => row.premium).length,
    IN_PROGRESS: examRows.filter((row) => row.inProgressAttempt).length,
    COMPLETED: examRows.filter((row) => row.completedAttempt).length
  }), [examRows]);

  const visibleRows = useMemo(() => {
    const filtered = examRows.filter((row) => {
      if (activeTab === 'FREE') return !row.premium;
      if (activeTab === 'PREMIUM') return row.premium;
      if (activeTab === 'IN_PROGRESS') return Boolean(row.inProgressAttempt);
      if (activeTab === 'COMPLETED') return Boolean(row.completedAttempt);
      return true;
    });

    const contextualRows = filtered.map((row) => {
      if (activeTab === 'IN_PROGRESS') return { ...row, attempt: row.inProgressAttempt };
      if (activeTab === 'COMPLETED') return { ...row, attempt: row.completedAttempt };
      return row;
    });

    return contextualRows.sort((left, right) => {
      const leftDate = new Date(left.exam.createdAt || 0).getTime();
      const rightDate = new Date(right.exam.createdAt || 0).getTime();
      if (sortBy === 'oldest') return leftDate - rightDate;
      if (sortBy === 'free') return Number(left.premium) - Number(right.premium) || rightDate - leftDate;
      if (sortBy === 'premium') return Number(right.premium) - Number(left.premium) || rightDate - leftDate;
      if (sortBy === 'completed') return Number(Boolean(right.completedAttempt)) - Number(Boolean(left.completedAttempt)) || rightDate - leftDate;
      return rightDate - leftDate;
    });
  }, [activeTab, examRows, sortBy]);

  if (loading) {
    return (
      <AppLayout title="Practice Exams" subtitle="Build confidence with timed papers and detailed score reviews.">
        <Loader label="Loading practice papers..." />
      </AppLayout>
    );
  }

  const emptyState = {
    ALL: {
      title: 'No practice exams available',
      message: 'Published practice papers will appear here as soon as they become available.'
    },
    FREE: {
      title: 'No free tests found',
      message: 'There are no free practice papers in the library right now.'
    },
    PREMIUM: {
      title: 'No premium tests found',
      message: 'Premium practice papers will appear in this collection when released.'
    },
    IN_PROGRESS: {
      title: 'No tests in progress',
      message: 'Start a practice paper and you can return here to continue it later.'
    },
    COMPLETED: {
      title: 'No completed attempts yet',
      message: 'Finish a practice exam to unlock its score report and detailed analytics.'
    }
  }[activeTab];

  return (
    <AppLayout
      title="Practice Exams"
      subtitle="Hone your skills with official-style papers. Complete a test to unlock detailed performance review."
    >
      <section className="practice-toolbar" aria-label="Practice exam filters">
        <div className="practice-tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? 'active' : ''}
              onClick={() => setActiveTab(id)}
            >
              <Icon aria-hidden="true" />
              {label}
              <span>{counts[id]}</span>
            </button>
          ))}
        </div>
        <label className="practice-sort">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      {loadError ? (
        <div className="practice-load-alert" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshCw aria-hidden="true" /> Retry
          </button>
        </div>
      ) : null}

      <div className="practice-bank-callout">
        <div>
          <span className="profile-chip"><FileText aria-hidden="true" /> Question Bank Session</span>
          <strong>Build a filtered mini exam from practice-test questions</strong>
        </div>
        <Link className="button button-secondary" to="/question-hub">
          <PlayCircle aria-hidden="true" /> Open Question Hub
        </Link>
      </div>

      {visibleRows.length ? (
        <div className="paper-grid">
          {visibleRows.map((row) => (
            <ExamCard key={row.exam.id} row={row} canUsePremium={canUsePremium} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title={emptyState.title}
          message={emptyState.message}
          actionLabel="View all papers"
          actionTo="/practice"
        />
      )}
    </AppLayout>
  );
}
