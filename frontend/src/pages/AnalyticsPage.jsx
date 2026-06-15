import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  Medal,
  Sigma,
  Target,
  Trophy,
  Users,
  XCircle
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import AnalyticsScoreTable from '../components/analytics/AnalyticsScoreTable.jsx';
import { getLeaderboard, getMyAnalytics } from '../services/analyticsService.js';
import { useAuthStore } from '../store/authStore.js';
import { formatSeconds } from '../utils/format.js';

const domainCatalog = {
  reading: {
    label: 'Reading and Writing',
    icon: BookOpen,
    rows: [
      { label: 'Craft and Structure', patterns: ['craft', 'structure', 'context', 'vocabulary', 'words', 'purpose'] },
      { label: 'Information and Ideas', patterns: ['information', 'idea', 'central', 'evidence', 'inference', 'command'] },
      { label: 'Standard English Conventions', patterns: ['standard', 'english', 'convention', 'grammar', 'punctuation', 'sentence'] },
      { label: 'Expression of Ideas', patterns: ['expression', 'transition', 'rhetorical', 'organization', 'revision'] }
    ]
  },
  math: {
    label: 'Math',
    icon: Sigma,
    rows: [
      { label: 'Algebra', patterns: ['algebra', 'linear', 'equation', 'inequality', 'system'] },
      { label: 'Advanced Math', patterns: ['advanced', 'quadratic', 'polynomial', 'function', 'exponential'] },
      { label: 'Problem Solving and Data Analysis', patterns: ['problem', 'data', 'statistic', 'ratio', 'percent', 'probability'] },
      { label: 'Geometry and Trigonometry', patterns: ['geometry', 'trigonometry', 'circle', 'triangle', 'angle', 'area', 'volume'] }
    ]
  }
};

function normalizeLabel(value = '') {
  return String(value).toLowerCase().replaceAll(/[^a-z0-9]/g, '');
}

function scoreToSatTotal(value) {
  if (!value) return 400;
  return value > 100 ? value : Math.round(400 + (value / 100) * 1200);
}

function scoreToSatSection(value) {
  if (!value) return 200;
  return value > 100 ? value : Math.round(200 + (value / 100) * 600);
}

function scoreProgress(value, max) {
  return Math.min(100, Math.round(((value || 0) / max) * 100));
}

function buildDomainRows(skillRows, catalogRows) {
  return catalogRows.map((domain) => {
    const matches = skillRows.filter((skill) => {
      const normalized = normalizeLabel(skill.skill);
      return normalizeLabel(skill.skill) === normalizeLabel(domain.label)
        || domain.patterns.some((pattern) => normalized.includes(normalizeLabel(pattern)));
    });
    const totalQuestions = matches.reduce((sum, item) => sum + (item.totalQuestions || 0), 0);
    const correct = matches.reduce((sum, item) => sum + Math.round((item.totalQuestions || 0) * (item.accuracy || 0) / 100), 0);
    const accuracy = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
    return {
      ...domain,
      totalQuestions,
      correct,
      accuracy,
      score: scoreToSatSection(accuracy)
    };
  });
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [activeSection, setActiveSection] = useState('score-summary');

  useEffect(() => {
    Promise.all([
      getMyAnalytics().catch(() => null),
      getLeaderboard().catch(() => null)
    ])
      .then(([analyticsResponse, leaderboardResponse]) => {
        setAnalytics(analyticsResponse);
        setLeaderboard(leaderboardResponse);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const sectionIds = ['score-summary', 'performance-summary', 'leaderboard-section', 'domain-performance', 'question-review'];

    function updateActiveSection() {
      const current = sectionIds
        .map((id) => {
          const element = document.getElementById(id);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { id, distance: Math.abs(rect.top - 126), top: rect.top };
        })
        .filter(Boolean)
        .sort((left, right) => left.distance - right.distance)[0];

      if (current) setActiveSection(current.id);
    }

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [loading]);

  useEffect(() => {
    if (loading || !window.location.hash) return;
    const id = window.location.hash.replace('#', '');
    window.setTimeout(() => {
      setActiveSection(id);
      scrollToSection(id);
    }, 120);
  }, [loading]);

  const summary = useMemo(() => {
    const skillRows = analytics?.accuracyBySkill || [];
    const totalQuestions = skillRows.reduce((total, item) => total + (item.totalQuestions || 0), 0);
    const correctAnswers = skillRows.reduce(
      (total, item) => total + Math.round((item.totalQuestions || 0) * (item.accuracy || 0) / 100),
      0
    );
    const timeSpent = (analytics?.timePerSection || []).reduce((total, item) => total + (item.seconds || 0), 0);
    const latest = analytics?.scoreHistory?.at(-1) || null;
    const totalScore = scoreToSatTotal(latest?.totalScore ?? analytics?.overview?.bestScore);
    const readingScore = scoreToSatSection(latest?.readingWritingScore);
    const mathScore = scoreToSatSection(latest?.mathScore);

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: Math.max(0, totalQuestions - correctAnswers),
      accuracy: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      timeSpent,
      latest,
      totalScore,
      readingScore,
      mathScore,
      bestScore: scoreToSatTotal(analytics?.overview?.bestScore)
    };
  }, [analytics]);

  const domainRows = useMemo(() => ({
    reading: buildDomainRows(analytics?.accuracyBySkill || [], domainCatalog.reading.rows),
    math: buildDomainRows(analytics?.accuracyBySkill || [], domainCatalog.math.rows)
  }), [analytics]);

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

  const navItems = [
    ['score-summary', 'Scores'],
    ['performance-summary', 'Performance'],
    ['leaderboard-section', 'Leaderboard'],
    ['domain-performance', 'Domains'],
    ['question-review', 'Question Review']
  ];
  const sectionMotion = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false, amount: 0.18 },
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
  };

  return (
    <AppLayout title="Analytics" subtitle="One continuous score report with leaderboard, domains and review history.">
      <div className="analytics-report-actions">
        <div className="dsat-results-tabs analytics-scroll-nav" aria-label="Analytics sections">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeSection === key ? 'active' : ''}
              onClick={() => {
                setActiveSection(key);
                scrollToSection(key);
              }}
            >
              {activeSection === key ? <motion.span layoutId="analytics-active-pill" className="analytics-active-pill" /> : null}
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => window.print()}>
          <Download aria-hidden="true" />
          Download Report
        </Button>
      </div>

      <motion.section id="score-summary" className="analytics-section analytics-overview dsat-score-overview" {...sectionMotion}>
        <Card className="section-score-card">
          <span>Reading & Writing</span>
          <strong>{summary.readingScore}<small>/800</small></strong>
          <ProgressBar value={scoreProgress(summary.readingScore, 800)} tone="violet" />
          <p>{summary.correctAnswers} Correct, {summary.incorrectAnswers} Wrong</p>
        </Card>
        <Card className="overall-score-card dsat-total-score-card">
          <span className="score-card-label"><Trophy aria-hidden="true" /> Total Score</span>
          <strong>{summary.totalScore}<small>/1600</small></strong>
          <ProgressBar value={scoreProgress(summary.totalScore, 1600)} />
          <p>Best recorded score: <b>{summary.bestScore}</b></p>
        </Card>
        <Card className="section-score-card">
          <span>Math</span>
          <strong>{summary.mathScore}<small>/800</small></strong>
          <ProgressBar value={scoreProgress(summary.mathScore, 800)} tone="cyan" />
          <p>{summary.totalQuestions} questions reviewed</p>
        </Card>
      </motion.section>

      <motion.section id="performance-summary" className="analytics-section analytics-metric-strip" {...sectionMotion}>
        <StatCard icon={Target} label="Total Questions" value={summary.totalQuestions} />
        <StatCard icon={CheckCircle2} tone="green" label="Correct Answers" value={summary.correctAnswers} />
        <StatCard icon={XCircle} tone="red" label="Incorrect Answers" value={summary.incorrectAnswers} />
        <StatCard icon={BarChart3} tone="violet" label="Overall Accuracy" value={`${summary.accuracy}%`} />
        <StatCard icon={Clock3} tone="amber" label="Time Spent" value={formatSeconds(summary.timeSpent)} />
      </motion.section>

      <motion.section id="leaderboard-section" className="analytics-section" {...sectionMotion}>
        <Card title="Leaderboard" className="leaderboard-card gamified-leaderboard analytics-leaderboard">
          <div className="leaderboard-summary">
            <span><Users aria-hidden="true" /> {leaderboard?.participants || 0} participants total</span>
            {leaderboard?.currentUser ? <b>Your position: #{leaderboard.currentUser.rank}</b> : <b>Submit a test to enter the board</b>}
          </div>
          <div className="leaderboard-list">
            {(leaderboard?.top || []).length ? (leaderboard.top || []).map((row) => (
              <article key={`${row.userId}-${row.rank}`} className={row.isCurrentUser ? 'leaderboard-row current' : 'leaderboard-row'}>
                <span className="leaderboard-rank">{row.rank <= 3 ? <Medal aria-hidden="true" /> : row.rank}</span>
                <div>
                  <strong>{row.name}</strong>
                  <span>R&W: {scoreToSatSection(row.readingWritingScore)} - Math: {scoreToSatSection(row.mathScore)}</span>
                </div>
                <b>{scoreToSatTotal(row.score)}</b>
              </article>
            )) : (
              <p className="helper-copy">Leaderboard will appear after students submit scored attempts.</p>
            )}
          </div>
        </Card>
      </motion.section>

      <motion.section id="domain-performance" className="analytics-section" {...sectionMotion}>
        <Card className="domain-performance-card">
          <div className="skills-header">
            <div>
              <h2>Domain Performance</h2>
              <p>Your performance across all knowledge domains.</p>
            </div>
          </div>
          <div className="domain-stick-groups">
            {Object.entries(domainCatalog).map(([key, catalog]) => {
              const Icon = catalog.icon;
              return (
                <div key={key} className="domain-stick-group">
                  <h3><Icon aria-hidden="true" /> {catalog.label}</h3>
                  {domainRows[key].map((row) => (
                    <article key={row.label} className="domain-stick-card">
                      <div>
                        <h4>{row.label}</h4>
                        <span>{row.correct} / {row.totalQuestions} Correct</span>
                      </div>
                      <strong>{row.accuracy}<small>%</small></strong>
                      <div className="domain-score-line">
                        <span>Score: 200</span>
                        <span>800</span>
                      </div>
                      <div className="domain-segments" aria-label={`${row.label} score ${row.score}`}>
                        {Array.from({ length: 7 }).map((_, index) => (
                          <i key={`${row.label}-${index}`} className={index < Math.ceil(row.accuracy / 15) ? 'filled' : ''} />
                        ))}
                      </div>
                      <div className="domain-card-foot">
                        <span>Domain Score: <b>{row.score}</b></span>
                        <button type="button" onClick={() => scrollToSection('question-review')}>See next level &rarr;</button>
                      </div>
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.section>

      <motion.section id="question-review" className="analytics-section" {...sectionMotion}>
        <Card title="Score history" className="analytics-history">
          <AnalyticsScoreTable items={analytics.scoreHistory} />
        </Card>
      </motion.section>

      <section className="sat-report-sheet analytics-print-sheet" aria-label="Printable SAT score report">
        <header>
          <div className="sat-report-brand">
            <span>D</span>
            <b>SAT</b>
          </div>
          <div>
            <strong>Name: {user?.email || user?.fullName || 'MonoPrep student'}</strong>
            <span>Report generated from MonoPrep analytics</span>
          </div>
        </header>
        <h2>Your Scores</h2>
        <div className="sat-report-box">
          <div className="sat-report-scores">
            <h3>SAT Scores</h3>
            <span>Total Score</span>
            <strong>{summary.totalScore}</strong>
            <small>400-1600</small>
            <span>Reading and Writing</span>
            <b>{summary.readingScore}</b>
            <span>Math</span>
            <b>{summary.mathScore}</b>
          </div>
          <div className="sat-report-skills">
            <h3>Knowledge and Skills</h3>
            <p>View your performance across the 8 content domains measured on the SAT.</p>
            <div className="sat-report-domain-grid">
              {[...domainRows.reading, ...domainRows.math].map((row) => (
                <article key={`print-${row.label}`} className="sat-report-domain-card">
                  <strong>{row.label}</strong>
                  <span>({row.accuracy}% accuracy, {row.totalQuestions} questions)</span>
                  <small>Domain Score: {row.score}</small>
                  <div className="report-mini-segments">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <i key={`${row.label}-print-${index}`} className={index < Math.ceil(row.accuracy / 15) ? 'filled' : ''} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
