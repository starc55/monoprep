import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, message, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      {Icon ? (
        <span className="empty-state-icon">
          <Icon aria-hidden="true" />
        </span>
      ) : null}
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && actionTo ? (
        <Link className="button button-primary" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
