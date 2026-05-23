import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children, alternatePath, alternateLabel }) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-badge">MonoPrep</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
        <p className="auth-alt">
          <Link to={alternatePath}>{alternateLabel}</Link>
        </p>
      </div>
    </div>
  );
}
