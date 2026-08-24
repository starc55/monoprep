import { Link } from 'react-router-dom';
import DashboardArt from './DashboardArt.jsx';

export default function QuickActionCard({ art, title, description, to, label = 'Open' }) {
  return (
    <Link className="pro-quick-action-card" to={to}>
      {art ? <DashboardArt src={art} className="action-art" /> : null}
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <span className="pro-card-cue">{label}</span>
    </Link>
  );
}
