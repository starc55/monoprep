import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, MapPin, Medal, Shield, Sparkles, Trophy, Users } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ScoreTerritoryMap from '../components/maps/ScoreTerritoryMap.jsx';
import { getLeaderboard, getMyAnalytics } from '../services/analyticsService.js';

function getSatScore(value) {
  if (!value) return 0;
  return value <= 100 ? Math.round(400 + (value / 100) * 1200) : value;
}

function getSectionScore(value) {
  if (!value) return 200;
  return value <= 100 ? Math.round(200 + (value / 100) * 600) : value;
}

function getTerritory(score) {
  if (score >= 1450) return { label: 'Ivy Arena', progress: 94, tone: 'Master', land: 92 };
  if (score >= 1250) return { label: 'Scholar District', progress: 76, tone: 'Advanced', land: 70 };
  if (score >= 1050) return { label: 'Rising Campus', progress: 58, tone: 'Growing', land: 52 };
  if (score >= 800) return { label: 'Foundation Field', progress: 38, tone: 'Starter', land: 34 };
  return { label: 'Open Map', progress: 18, tone: 'New', land: 20 };
}

function initials(name = '') {
  return name.replace('@', '').slice(0, 2).toUpperCase() || 'MP';
}

export default function CompetitionPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

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

  const score = analytics?.overview?.attemptsTaken ? getSatScore(analytics?.overview?.bestScore) : 0;
  const territory = getTerritory(score);
  const rows = useMemo(() => {
    const remoteRows = leaderboard?.top || [];
    if (!leaderboard?.currentUser) return remoteRows;
    const hasCurrent = remoteRows.some((row) => row.userId === leaderboard.currentUser.userId || row.isCurrentUser);
    return hasCurrent ? remoteRows : [...remoteRows.slice(0, 5), leaderboard.currentUser];
  }, [leaderboard]);

  if (loading) {
    return (
      <AppLayout title="Competition Panel" subtitle="Leaderboard, score territory, and gamified prep progress.">
        <Loader label="Loading competition panel..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Competition Panel" subtitle="Leaderboard, score territory, and gamified prep progress.">
      <motion.div
        className="competition-grid"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="territory-card mapcn-card">
          <span className="profile-chip"><MapPin aria-hidden="true" /> Score territory</span>
          <h2>{territory.label}</h2>
          <p>Your best SAT estimate grows your virtual learning territory. Higher scores unlock larger zones.</p>
          <ProgressBar value={territory.progress} tone="green" />
          <ScoreTerritoryMap score={score} label={territory.label} />
        </Card>

        <div className="competition-stats">
          <StatCard icon={Trophy} tone="amber" label="Best SAT Estimate" value={score ? `${score}` : 'Start'} />
          <StatCard icon={Flame} tone="red" label="Attempts" value={`${analytics?.overview?.attemptsTaken || 0}`} />
          <StatCard icon={Users} tone="blue" label="League" value={territory.tone} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
      <Card title="Leaderboard" className="leaderboard-card gamified-leaderboard">
        <div className="leaderboard-summary">
          <span><Users aria-hidden="true" /> {leaderboard?.participants || 0} participants total</span>
          {leaderboard?.currentUser ? <b>Your rank: #{leaderboard.currentUser.rank}</b> : <b>Finish a test to claim your rank</b>}
        </div>
        {rows.length ? <div className="leaderboard-list">
          {rows.map((row, index) => {
            const rank = row.rank || index + 1;
            return (
              <article key={`${row.name}-${rank}`} className={row.isCurrentUser ? 'leaderboard-row current' : 'leaderboard-row'}>
                <span className="leaderboard-rank">{rank <= 3 ? <Medal aria-hidden="true" /> : rank}</span>
                <span className="leaderboard-avatar">{row.avatarUrl ? <img src={row.avatarUrl} alt="" /> : initials(row.name)}</span>
                <div>
                  <strong>{row.name}</strong>
                  <span>R&W: {getSectionScore(row.readingWritingScore)} - Math: {getSectionScore(row.mathScore)}</span>
                </div>
                <b>{getSatScore(row.score) || '--'}</b>
                {row.isCurrentUser ? <Sparkles aria-hidden="true" /> : null}
              </article>
            );
          })}
        </div> : (
          <EmptyState icon={Shield} title="No competitors yet" message="Submitted practice attempts will populate the leaderboard automatically." />
        )}
      </Card>
      </motion.div>
    </AppLayout>
  );
}
