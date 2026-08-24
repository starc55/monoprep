import { Link } from 'react-router-dom';
import DashboardArt from './DashboardArt.jsx';

export default function ModuleCard({ art, title, description, to, label = 'Open' }) {
  return (
    <Link className="pro-module-card" to={to}>
      {art ? <DashboardArt src={art} className="module-art" /> : null}
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="pro-card-cue">{label}</span>
    </Link>
  );
}
