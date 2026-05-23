import Card from './Card.jsx';

export default function StatCard({ label, value, hint }) {
  return (
    <Card className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </Card>
  );
}
