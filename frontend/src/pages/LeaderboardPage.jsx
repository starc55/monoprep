import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Eye, Search, Trophy, UserPlus, UsersRound } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import PremiumSelect from '../components/ui/PremiumSelect.jsx';
import { getLeaderboard } from '../services/analyticsService.js';
import { followStudent, getStudents, unfollowStudent } from '../services/socialService.js';
import { useAuthStore } from '../store/authStore.js';
import { resolveAssetUrl } from '../utils/assets.js';
import { getLeagueFromScore, getLevelFromScore } from '../utils/league.js';

const filters = [
  { id: 'overall', label: 'Overall' },
  { id: 'reading', label: 'Reading & Writing' },
  { id: 'math', label: 'Math' },
  { id: 'competition', label: 'Competition XP' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' }
];

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'MP';
}

function inRange(value, days) {
  if (!value) return false;
  const submittedAt = new Date(value).getTime();
  return submittedAt >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function getDisplayName(row) {
  return row.fullName || row.name?.replace(/^@/, '') || row.username || 'MonoPrep Student';
}

function getHandle(row) {
  if (row.username) return `@${row.username}`;
  if (row.emailPreview) return row.emailPreview;
  if (row.name?.startsWith('@')) return row.name;
  return 'MonoPrep member';
}

function formatScore(score) {
  const value = Number(score) || 0;
  return value ? value.toLocaleString() : '--';
}

function mergeRows(students, leaderboard) {
  const scoreMap = new Map((leaderboard?.top || []).map((row) => [row.userId, row]));
  if (leaderboard?.currentUser) {
    scoreMap.set(leaderboard.currentUser.userId, leaderboard.currentUser);
  }

  return students.map((student) => {
    const scored = scoreMap.get(student.id) || {};
    return {
      ...student,
      rank: scored.rank || student.rank,
      bestScore: scored.bestScore || student.bestScore || 0,
      leagueScore: scored.leagueScore || scored.score || student.leagueScore || student.bestScore || 0,
      readingWritingScore: scored.readingWritingScore || 0,
      mathScore: scored.mathScore || 0,
      submittedAt: scored.submittedAt || null,
      isCurrentUser: Boolean(scored.isCurrentUser),
      xp: scored.xp || student.xp || 0,
      level: scored.level || student.level || 1,
      league: scored.league || student.league || 'Bronze'
    };
  });
}

function StudentAvatar({ row, className = '' }) {
  const name = getDisplayName(row);
  return (
    <span className={`student-avatar ${className}`.trim()}>
      {row.avatarUrl ? <img src={resolveAssetUrl(row.avatarUrl)} alt="" /> : initials(name)}
    </span>
  );
}

export default function LeaderboardPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [filter, setFilter] = useState('overall');
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState('');

  async function load() {
    const [studentRows, leaderboardRow] = await Promise.all([
      getStudents({ sort: 'score', search }).catch(() => []),
      getLeaderboard().catch(() => null)
    ]);
    setStudents(studentRows);
    setLeaderboard(leaderboardRow);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load().finally(() => setLoading(false));
    }, 160);
    return () => window.clearTimeout(timeout);
  }, [search]);

  async function toggleFollow(row) {
    if (row.id === user?.id) return;
    setPendingId(row.id);
    try {
      if (row.isFollowing) await unfollowStudent(row.id);
      else await followStudent(row.id);
      await load();
    } finally {
      setPendingId('');
    }
  }

  const rows = useMemo(() => {
    let nextRows = mergeRows(students, leaderboard);

    if (filter === 'reading') {
      nextRows = nextRows.filter((row) => row.readingWritingScore).sort((a, b) => b.readingWritingScore - a.readingWritingScore);
    } else if (filter === 'math') {
      nextRows = nextRows.filter((row) => row.mathScore).sort((a, b) => b.mathScore - a.mathScore);
    } else if (filter === 'competition') {
      nextRows = nextRows.filter((row) => row.xp).sort((a, b) => b.xp - a.xp);
    } else if (filter === 'week') {
      nextRows = nextRows.filter((row) => inRange(row.submittedAt, 7)).sort((a, b) => b.leagueScore - a.leagueScore);
    } else if (filter === 'month') {
      nextRows = nextRows.filter((row) => inRange(row.submittedAt, 31)).sort((a, b) => b.leagueScore - a.leagueScore);
    } else {
      nextRows = nextRows.sort((a, b) => b.leagueScore - a.leagueScore || (a.rank || 999999) - (b.rank || 999999));
    }

    return nextRows.map((row, index) => {
      const bestScore = Number(row.bestScore) || 0;
      const leagueScore = Number(row.leagueScore) || bestScore;
      const league = typeof row.league === 'string'
        ? { key: row.league.toLowerCase(), name: row.league }
        : getLeagueFromScore(leagueScore);
      return {
        ...row,
        displayName: getDisplayName(row),
        displayRank: filter === 'overall' ? row.rank || index + 1 : index + 1,
        league,
        level: row.level || getLevelFromScore(leagueScore, row.completedExams, row.accuracy)
      };
    });
  }, [filter, leaderboard, students]);

  const topRows = rows.slice(0, 3);
  const podiumRows = [topRows[1], topRows[0], topRows[2]].filter(Boolean);
  const currentRank = leaderboard?.currentUser?.rank || rows.find((row) => row.id === user?.id || row.isCurrentUser)?.displayRank;

  return (
    <AppLayout title="Leaderboard" subtitle="Premium community ranking powered by submitted MonoPrep attempts.">
      <div className="community-toolbar leaderboard-toolbar">
        <label className="community-search">
          <Search aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leaderboard" />
        </label>
        <PremiumSelect
          ariaLabel="Leaderboard ranking metric"
          value={filter}
          onChange={setFilter}
          options={filters.map((item) => ({ value: item.id, label: item.label }))}
          className="leaderboard-metric-select"
        />
      </div>

      {loading ? <Loader label="Loading leaderboard..." /> : null}

      {!loading && podiumRows.length ? (
        <section className="leaderboard-podium-stage" aria-label="Top three MonoPrep students">
          {podiumRows.map((row, index) => (
            <motion.article
              key={row.id}
              className={`leaderboard-podium-card rank-${row.displayRank}`}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.07 }}
              whileHover={{ y: -8 }}
            >
              <div className="podium-avatar-wrap">
                <StudentAvatar row={row} className="xl" />
                <span className="podium-crown"><Crown aria-hidden="true" /></span>
              </div>
              <div className="podium-name">
                <strong title={row.displayName}>{row.displayName}</strong>
                <span>{formatScore(row.leagueScore)} league score</span>
              </div>
              <div className="podium-base">
                <b>#{row.displayRank}</b>
                <span className={`league-badge league-${row.league.key}`}>Level {row.level} - {row.league.name}</span>
              </div>
            </motion.article>
          ))}
        </section>
      ) : null}

      {!loading && !rows.length ? (
        <EmptyState icon={Trophy} title="No leaderboard rows yet" message="Submitted practice attempts will populate this ranking automatically." />
      ) : null}

      {!loading && rows.length ? (
        <section className="leaderboard-ranking-card">
          <header className="leaderboard-ranking-header">
            <div>
              <h2>Ranking List</h2>
              <p>{rows.length} ranked students from submitted MonoPrep attempts.</p>
            </div>
            <span>{currentRank ? `Your rank #${currentRank}` : 'Submit an attempt to join'}</span>
          </header>
          <div className="leaderboard-ranking-list">
            {rows.map((row, index) => {
              const isCurrentUser = row.id === user?.id || row.isCurrentUser;
              return (
                <motion.article
                  key={row.id}
                  className={`leaderboard-ranking-row ${isCurrentUser ? 'current' : ''}`.trim()}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.28) }}
                >
                  <div className="leaderboard-rank-stack">
                    <span>#{row.displayRank}</span>
                    {row.displayRank <= 3 ? <Crown aria-hidden="true" className={`rank-crown rank-${row.displayRank}`} /> : null}
                  </div>
                  <StudentAvatar row={row} className="small" />
                  <div className="leaderboard-rank-identity">
                    <strong title={row.displayName}>{row.displayName}</strong>
                    <span>{getHandle(row)}</span>
                    <small className={`league-badge league-${row.league.key}`}>Level {row.level} - {row.league.name}</small>
                  </div>
                  <div className="leaderboard-row-score">
                    <strong>{formatScore(row.leagueScore)}</strong>
                    <span>League score</span>
                  </div>
                  <div className="leaderboard-actions">
                    <button type="button" disabled={pendingId === row.id || isCurrentUser} onClick={() => toggleFollow(row)}>
                      <UserPlus aria-hidden="true" />
                      {isCurrentUser ? 'You' : row.isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <Link to={`/students/${row.id}`} aria-label={`View ${row.displayName} profile`}><Eye aria-hidden="true" /></Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      ) : null}
    </AppLayout>
  );
}
