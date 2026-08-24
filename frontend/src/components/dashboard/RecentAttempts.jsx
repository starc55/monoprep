import { Link } from 'react-router-dom';

function formatStatus(status = '') {
  return status.replaceAll('_', ' ').toLowerCase();
}

function formatDate(value) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function RecentAttempts({ attempts = [], limit = 5 }) {
  const rows = attempts.slice(0, limit);

  return (
    <div className="pro-attempt-list">
      <div className="pro-attempt-head">
        <span>Exam</span>
        <span>Score</span>
        <span>Status</span>
        <span>Date</span>
      </div>
      {rows.map((attempt) => (
        <Link
          key={attempt.id}
          to={attempt.status === 'IN_PROGRESS' ? `/attempts/${attempt.id}/exam` : `/attempts/${attempt.id}/review`}
          className="pro-attempt-row"
        >
          <strong>{attempt.examTitle}</strong>
          <b>{attempt.totalScore || '--'}</b>
          <span>{formatStatus(attempt.status)}</span>
          <small>{formatDate(attempt.submittedAt || attempt.startedAt)}</small>
        </Link>
      ))}
      {!rows.length ? <p className="pro-empty-copy">No attempts yet. Start a practice exam to build history.</p> : null}
    </div>
  );
}
