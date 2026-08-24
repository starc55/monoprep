import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, media, title, message, actionLabel, actionTo, actionOnClick }) {
  return (
    <div className="empty-state">
      {media || (Icon ? (
        <span className="empty-state-icon">
          <Icon aria-hidden="true" />
        </span>
      ) : null)}
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && actionOnClick ? (
        <button type="button" className="button button-primary" onClick={actionOnClick}>
          {actionLabel}
        </button>
      ) : actionLabel && actionTo ? (
        <Link className="button button-primary" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
