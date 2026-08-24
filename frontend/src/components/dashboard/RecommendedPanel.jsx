import { Link } from 'react-router-dom';
import DashboardArt from './DashboardArt.jsx';
import SkillProgressList from './SkillProgressList.jsx';

export default function RecommendedPanel({
  art,
  title,
  description,
  primaryTo,
  primaryLabel,
  secondaryTo,
  secondaryLabel,
  skills = []
}) {
  return (
    <aside className="pro-recommended-panel">
      <div className="pro-recommended-head">
        {art ? <DashboardArt src={art} className="panel-art" /> : null}
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <SkillProgressList skills={skills} emptyLabel="Complete a scored attempt to reveal weakest skills." />
      <div className="pro-recommended-actions">
        {primaryTo ? (
          <Link className="button button-primary" to={primaryTo}>
            {primaryLabel}
          </Link>
        ) : null}
        {secondaryTo ? <Link className="button button-ghost" to={secondaryTo}>{secondaryLabel}</Link> : null}
      </div>
    </aside>
  );
}
