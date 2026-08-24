import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../layouts/AppLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import DashboardHero from "../components/dashboard/DashboardHero.jsx";
import KpiCard from "../components/dashboard/KpiCard.jsx";
import ChartCard, {
  ChartEmptyState,
} from "../components/dashboard/ChartCard.jsx";
import RecommendedPanel from "../components/dashboard/RecommendedPanel.jsx";
import RecentAttempts from "../components/dashboard/RecentAttempts.jsx";
import QuickActionCard from "../components/dashboard/QuickActionCard.jsx";
import { dashboardAssets } from "../data/dashboardAssets.js";
import { getExams } from "../services/examService.js";
import { getMyAttempts } from "../services/attemptService.js";
import { getMyAnalytics } from "../services/analyticsService.js";
import { getStudentProfile } from "../services/socialService.js";
import { useAuthStore } from "../store/authStore.js";
import { loadUserSettings } from "../utils/userPreferences.js";

function formatSkill(skill) {
  return skill ? skill.replaceAll("_", " ") : "Focused practice";
}

function dateLabel(value) {
  if (!value) return "Attempt";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getStudyStreak(attempts) {
  const dates = new Set(
    attempts
      .map((attempt) => attempt.submittedAt || attempt.startedAt)
      .filter(Boolean)
      .map((value) => new Date(value).toISOString().slice(0, 10))
  );
  let streak = 0;
  const cursor = new Date();

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function StudyActivity({ attempts }) {
  const counts = new Map();
  attempts.forEach((attempt) => {
    const value = attempt.submittedAt || attempt.startedAt;
    if (!value) return;
    const key = new Date(value).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const days = Array.from({ length: 112 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (111 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, count: counts.get(key) || 0 };
  });

  return (
    <div className="study-activity-popover">
      <div><strong>Study activity</strong><span>Last 16 weeks</span></div>
      <div className="study-activity-grid" aria-label="Study activity over the last 16 weeks">
        {days.map((day) => <i key={day.key} className={`level-${Math.min(4, day.count)}`} title={`${day.key}: ${day.count} activities`} />)}
      </div>
      <footer><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`level-${level}`} />)}<span>More</span></footer>
    </div>
  );
}

function ScoreProgressChart({ data }) {
  if (!data.length) {
    return <ChartEmptyState label="Submit an exam to unlock score progress." />;
  }

  return (
    <ResponsiveContainer width="100%" height={318}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
        <XAxis
          dataKey="label"
          stroke="#64748b"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[400, 1600]}
          stroke="#64748b"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SectionScoreBarChart({ data }) {
  if (!data.length) {
    return (
      <ChartEmptyState label="Section score split appears after your first submitted attempt." />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="label"
          stroke="#64748b"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[200, 800]}
          stroke="#64748b"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip />
        <Bar dataKey="score" fill="#7c3aed" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(() => loadUserSettings(user));

  useEffect(() => {
    const syncPreferences = () => setPreferences(loadUserSettings(user));
    syncPreferences();
    window.addEventListener("monoprep:settings-change", syncPreferences);
    return () => window.removeEventListener("monoprep:settings-change", syncPreferences);
  }, [user]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getExams().catch(() => []),
      getMyAttempts().catch(() => []),
      getMyAnalytics().catch(() => null),
      user?.id
        ? getStudentProfile(user.id).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([examRows, attemptRows, analyticsRow, profileRow]) => {
        if (!active) return;
        setExams(examRows);
        setAttempts(attemptRows);
        setAnalytics(analyticsRow);
        setProfile(profileRow);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const submittedAttempts = attempts.filter(
    (attempt) => attempt.status !== "IN_PROGRESS"
  );
  const scoreHistory = analytics?.scoreHistory || [];
  const skillRows = analytics?.accuracyBySkill || profile?.skillBreakdown || [];
  const weakestSkills = useMemo(
    () =>
      [...skillRows]
        .sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0))
        .slice(0, 4),
    [skillRows]
  );
  const currentScore =
    scoreHistory.at(-1)?.totalScore || profile?.currentScore || 0;
  const bestScore = analytics?.overview?.bestScore || profile?.bestScore || 0;
  const targetScore = Number(preferences.targetScore || 1400);
  const progressToTarget = targetScore
    ? Math.min(100, Math.round((currentScore / targetScore) * 100))
    : 0;
  const accuracy =
    profile?.accuracy ||
    (skillRows.length
      ? Math.round(
          skillRows.reduce((sum, item) => sum + (item.accuracy || 0), 0) /
            skillRows.length
        )
      : 0);
  const streak = getStudyStreak(attempts);
  const recommendation =
    analytics?.overview?.recommendedPractice?.[0] ||
    weakestSkills[0]?.skill ||
    "Start a focused practice session";

  const scoreChartData = scoreHistory.map((row, index) => ({
    label: dateLabel(row.date) || `A${index + 1}`,
    score: row.totalScore || 0,
  }));
  const latestScore = scoreHistory.at(-1);
  const sectionData = latestScore
    ? [
        { label: "Reading", score: latestScore.readingWritingScore || 0 },
        { label: "Math", score: latestScore.mathScore || 0 },
      ].filter((row) => row.score)
    : [];
  const recommendedExams = exams.slice(0, 3);

  if (loading) {
    return (
      <AppLayout
        title="Dashboard"
        subtitle="Your SAT command center is loading."
      >
        <Loader label="Preparing dashboard..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Focused overview of your SAT score, next action, and study momentum."
    >
      <div className="dashboard-page-shell">
        <DashboardHero
          title={`Welcome back, ${user?.fullName || "MonoPrep Student"}`}
          subtitle="Keep the next study decision obvious: score target, progress, and one smart practice move."
          cornerArt={dashboardAssets.mono}
          metrics={[
            { label: "Current SAT", value: currentScore || "Not taken" },
            { label: "Target score", value: targetScore },
            { label: "Completed", value: submittedAttempts.length },
          ]}
          progress={{ label: "Progress to target", value: progressToTarget }}
          actions={
            <>
              <Link className="button button-primary" to="/practice">
                Continue Practice
              </Link>
              <Link className="button button-ghost" to="/analytics">
                View Analytics
              </Link>
            </>
          }
        />

        <section className="pro-kpi-row" aria-label="Dashboard KPIs">
          <KpiCard
            art={dashboardAssets.score}
            label="Best Score"
            value={bestScore || "--"}
            hint="Personal record"
            tone="amber"
            index={0}
          />
          <KpiCard
            art={dashboardAssets.pen}
            label="Completed Exams"
            value={submittedAttempts.length}
            hint={`${exams.length} available`}
            tone="blue"
            index={1}
          />
          <KpiCard
            art={dashboardAssets.target}
            label="Accuracy"
            value={`${accuracy}%`}
            hint="Across tracked skills"
            tone="green"
            index={2}
          />
          <KpiCard
            art={dashboardAssets.fire}
            label="Study Streak"
            value={`${streak} days`}
            hint="Based on active study days"
            tone="violet"
            index={3}
            detail={<StudyActivity attempts={attempts} />}
          />
        </section>

        <section className="pro-dashboard-main-grid">
          <ChartCard
            art={dashboardAssets.chart}
            title="Score Progress"
            subtitle="Submitted SAT practice attempts over time."
            className="pro-score-panel"
          >
            <ScoreProgressChart data={scoreChartData} />
          </ChartCard>

          <div className="pro-dashboard-side-stack">
            <RecommendedPanel
              art={dashboardAssets.rec}
              title="Recommended Next Step"
              description={formatSkill(recommendation)}
              primaryTo="/question-hub"
              primaryLabel="Start Focus Session"
              secondaryTo="/practice"
              secondaryLabel="Choose Exam"
              skills={weakestSkills}
            />
            <ChartCard
              art={dashboardAssets.analytics}
              title="Section Score Split"
              subtitle="Latest submitted attempt."
            >
              <SectionScoreBarChart data={sectionData} />
            </ChartCard>
          </div>
        </section>

        <section className="pro-dashboard-bottom-grid">
          <ChartCard
            art={dashboardAssets.attempt}
            title="Recent Attempts"
            subtitle="Resume in-progress work or review submitted exams."
          >
            <RecentAttempts attempts={attempts} />
          </ChartCard>

          <ChartCard
            art={dashboardAssets.exam}
            title="Recommended Practice"
            subtitle="Published exams ready for your next session."
          >
            <div className="pro-practice-card-grid">
              {recommendedExams.map((exam) => (
                <QuickActionCard
                  key={exam.id}
                  art={dashboardAssets.exam}
                  title={exam.title}
                  description={exam.type.replaceAll("_", " ").toLowerCase()}
                  to={`/exams/${exam.id}/instructions`}
                />
              ))}
              {!recommendedExams.length ? (
                <p className="pro-empty-copy">No published exams yet.</p>
              ) : null}
            </div>
          </ChartCard>
        </section>
      </div>
    </AppLayout>
  );
}
