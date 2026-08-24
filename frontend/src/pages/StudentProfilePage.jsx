import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Medal, Trophy, UserPlus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { followStudent, getStudentProfile, unfollowStudent } from '../services/socialService.js';
import { resolveAssetUrl } from '../utils/assets.js';
import { useAuthStore } from '../store/authStore.js';
import { getLeagueFromScore, getLevelFromScore } from '../utils/league.js';

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'MP';
}

function dateLabel(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const row = await getStudentProfile(id);
    setStudent(row);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  async function toggleFollow() {
    if (!student || student.id === user?.id) return;
    setPending(true);
    try {
      if (student.isFollowing) await unfollowStudent(student.id);
      else await followStudent(student.id);
      await load();
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Student Profile" subtitle="Loading public educational profile.">
        <Loader label="Loading student profile..." />
      </AppLayout>
    );
  }

  if (!student) {
    return (
      <AppLayout title="Student Profile">
        <EmptyState icon={BookOpen} title="Student not found" message="This public student profile is not available." />
      </AppLayout>
    );
  }

  const scoreData = (student.scoreHistory || []).map((row, index) => ({
    name: dateLabel(row.date) || `A${index + 1}`,
    score: row.totalScore
  }));
  const skillData = (student.skillBreakdown || []).slice(0, 8).map((row) => ({
    skill: row.skill.replaceAll('_', ' ').slice(0, 16),
    accuracy: row.accuracy
  }));
  const league = getLeagueFromScore(student.bestScore);
  const level = getLevelFromScore(student.bestScore, student.completedExams, student.accuracy);

  return (
    <AppLayout
      title="Public Student Profile"
      subtitle="Only public educational stats are visible here."
      actions={<Link className="button button-ghost" to="/students"><ArrowLeft aria-hidden="true" /> Students</Link>}
    >
      <motion.section className="public-profile-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <span className="student-avatar xl">
          {student.avatarUrl ? <img src={resolveAssetUrl(student.avatarUrl)} alt="" /> : initials(student.fullName)}
        </span>
        <div>
          <p>{student.username ? `@${student.username}` : student.emailPreview}</p>
          <h2>{student.fullName}</h2>
          <div className="student-social-meta">
            <span>Rank {student.rank ? `#${student.rank}` : '--'}</span>
            <span className={`league-badge league-${league.key}`}>Level {level} - {league.name}</span>
            <span>{student.followersCount} followers</span>
            <span>{student.followingCount} following</span>
          </div>
        </div>
        <button type="button" onClick={toggleFollow} disabled={pending || student.id === user?.id}>
          <UserPlus aria-hidden="true" />
          {student.id === user?.id ? 'Your profile' : student.isFollowing ? 'Following' : 'Follow'}
        </button>
      </motion.section>

      <section className="public-profile-stats">
        {[
          ['Best score', student.bestScore || '--'],
          ['Average score', student.averageScore || '--'],
          ['Completed tests', student.completedExams],
          ['Accuracy', `${student.accuracy}%`],
          ['Global rank', student.rank ? `#${student.rank}` : '--'],
          ['League', league.name]
        ].map(([label, value]) => (
          <article key={label}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </section>

      <section className="public-profile-grid">
        <article className="cockpit-panel">
          <header><Trophy aria-hidden="true" /><strong>Score Progress</strong></header>
          {scoreData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis domain={[400, 1600]} stroke="#94a3b8" />
                <Tooltip />
                <Line dataKey="score" stroke="#38bdf8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="helper-copy">No public score history yet.</p>}
        </article>
        <article className="cockpit-panel">
          <header><BookOpen aria-hidden="true" /><strong>Skill Breakdown</strong></header>
          {skillData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={skillData}>
                <XAxis dataKey="skill" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="helper-copy">Skill stats unlock after scored questions.</p>}
        </article>
      </section>

      <section className="public-profile-grid">
        <article className="cockpit-panel">
          <header><Medal aria-hidden="true" /><strong>Achievements</strong></header>
          <div className="achievement-strip">
            {student.achievements.map((achievement) => (
              <span key={achievement.id}><Medal aria-hidden="true" /> {achievement.title}</span>
            ))}
            {!student.achievements.length ? <p className="helper-copy">No achievements unlocked yet.</p> : null}
          </div>
        </article>
        <article className="cockpit-panel">
          <header><BookOpen aria-hidden="true" /><strong>Recent Public Attempts</strong></header>
          <div className="cockpit-list">
            {student.recentAttempts.map((attempt) => (
              <span key={attempt.id}>
                <span>{attempt.examTitle}</span>
                <b>{attempt.totalScore || '--'}</b>
              </span>
            ))}
            {!student.recentAttempts.length ? <p className="helper-copy">No submitted attempts yet.</p> : null}
          </div>
        </article>
      </section>
    </AppLayout>
  );
}
