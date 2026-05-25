import Card from './Card.jsx';

export default function StatCard({ label, value, hint, icon: Icon, tone = 'blue' }) {
  return (
    <Card className={`stat-card stat-card-${tone}`.trim()}>
      <div className="stat-card-head">
        <span className="stat-label">{label}</span>
        {Icon ? (
          <span className="stat-icon">
            <Icon aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <strong className="stat-value">{value}</strong>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </Card>
  );
}
