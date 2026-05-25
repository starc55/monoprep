import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Sigma,
  Target,
  Trophy,
  XCircle
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import AnalyticsScoreTable from '../components/analytics/AnalyticsScoreTable.jsx';
import { getMyAnalytics } from '../services/analyticsService.js';
import { formatSeconds } from '../utils/format.js';

const domains = {
  reading: {
    label: 'Reading and Writing',
    icon: BookOpen,
    skills: ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions']
  },
  math: {
    label: 'Math',
    icon: Sigma,
    skills: ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry']
  }
};

function normalizeLabel(value = '') {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
}

function getSkillData(items, skill) {
  const match = items.find((item) => normalizeLabel(item.skill) === normalizeLabel(skill));
  return match || { skill, accuracy: 0, totalQuestions: 0 };
}

function getDifficulty(value, total) {
  if (!total) return 'Medium';
  if (value >= 75) return 'Easy';
  if (value >= 50) return 'Medium';
  return 'Hard';
}

function getFeedback(value, total) {
  if (!total) return 'Complete questions in this domain to unlock feedback.';
  if (value >= 75) return 'Strong command. Keep this skill sharp with timed sets.';
  if (value >= 50) return 'Developing steadily. Review misses before your next test.';
  return 'Priority focus area. Practise fundamentals and re-check errors.';
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activeDomain, setActiveDomain] = useState('reading');

  useEffect(() => {
    getMyAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const skillRows = analytics?.accuracyBySkill || [];
    const totalQuestions = skillRows.reduce((total, item) => total + (item.totalQuestions || 0), 0);
    const correctAnswers = skillRows.reduce(
      (total, item) => total + Math.round((item.totalQuestions || 0) * (item.accuracy || 0) / 100),
      0
    );
    const timeSpent = (analytics?.timePerSection || []).reduce((total, item) => total + (item.seconds || 0), 0);
    const latest = analytics?.scoreHistory?.at(-1) || null;

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: Math.max(0, totalQuestions - correctAnswers),
      accuracy: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      timeSpent,
      latest
    };
  }, [analytics]);

  if (loading) {
    return (
      <AppLayout title="Analytics" subtitle="Review your performance and identify the skills to improve next.">
        <Loader label="Loading analytics..." />
      </AppLayout>
    );
  }

  if (!analytics || !analytics.overview.attemptsTaken) {
    return (
      <AppLayout title="Analytics" subtitle="Review your performance and identify the skills to improve next.">
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          message="Complete a practice exam to unlock scores, skill accuracy and personalised pacing insights."
          actionLabel="Start a practice exam"
          actionTo="/practice"
        />
      </AppLayout>
    );
  }

  const DomainIcon = domains[activeDomain].icon;

  return (
    <AppLayout title="Analytics" subtitle="Review your performance and identify the skills to improve next.">
      <div className="analytics-overview">
        <Card className="overall-score-card">
          <span className="score-card-label"><Trophy aria-hidden="true" /> Overall score</span>
          <strong>{summary.latest?.totalScore ?? analytics.overview.bestScore}%</strong>
          <ProgressBar value={summary.latest?.totalScore ?? analytics.overview.bestScore} />
          <p>Best recorded score: <b>{analytics.overview.bestScore}%</b></p>
        </Card>
        <Card className="section-score-card">
          <span>Reading and Writing</span>
          <strong>{summary.latest?.readingWritingScore || 0}%</strong>
          <ProgressBar value={summary.latest?.readingWritingScore || 0} tone="violet" />
        </Card>
        <Card className="section-score-card">
          <span>Math</span>
          <strong>{summary.latest?.mathScore || 0}%</strong>
          <ProgressBar value={summary.latest?.mathScore || 0} tone="cyan" />
        </Card>
        <StatCard icon={Trophy} tone="amber" label="Completed Exams" value={analytics.overview.attemptsTaken} />
      </div>

      <div className="analytics-metric-strip">
        <StatCard icon={Target} label="Total Questions" value={summary.totalQuestions} />
        <StatCard icon={CheckCircle2} tone="green" label="Correct Answers" value={summary.correctAnswers} />
        <StatCard icon={XCircle} tone="red" label="Incorrect Answers" value={summary.incorrectAnswers} />
        <StatCard icon={BarChart3} tone="violet" label="Accuracy" value={`${summary.accuracy}%`} />
        <StatCard icon={Clock3} tone="amber" label="Time Spent" value={formatSeconds(summary.timeSpent)} />
      </div>

      <Card className="skills-panel">
        <div className="skills-header">
          <div>
            <h2>Knowledge and Skills</h2>
            <p>Performance across the eight SAT content domains measured in your completed tests.</p>
          </div>
          <div className="skills-tabs" role="tablist" aria-label="Skill domains">
            {Object.entries(domains).map(([key, domain]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeDomain === key}
                className={activeDomain === key ? 'active' : ''}
                onClick={() => setActiveDomain(key)}
              >
                {domain.label}
              </button>
            ))}
          </div>
        </div>
        <h3 className="domain-title"><DomainIcon aria-hidden="true" /> {domains[activeDomain].label}</h3>
        <div className="skills-grid">
          {domains[activeDomain].skills.map((skill) => {
            const row = getSkillData(analytics.accuracyBySkill, skill);
            const difficulty = getDifficulty(row.accuracy, row.totalQuestions);
            return (
              <article key={skill} className="skill-card">
                <div className="skill-card-head">
                  <h4>{skill}</h4>
                  <span className={`difficulty ${difficulty.toLowerCase()}`}>{difficulty}</span>
                </div>
                <strong className="skill-accuracy">{row.accuracy}%</strong>
                <ProgressBar value={row.accuracy} tone={activeDomain === 'math' ? 'cyan' : 'blue'} />
                <p>{row.totalQuestions} questions - {getFeedback(row.accuracy, row.totalQuestions)}</p>
              </article>
            );
          })}
        </div>
      </Card>

      <Card title="Score history" className="analytics-history">
        <AnalyticsScoreTable items={analytics.scoreHistory} />
      </Card>
    </AppLayout>
  );
}
