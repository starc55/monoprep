import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import LanguageSwitcher from "../components/ui/LanguageSwitcher.jsx";
import { dashboardAssets } from "../data/dashboardAssets.js";

export default function AuthLayout({
  title,
  subtitle,
  children,
  alternatePath,
  alternateLabel,
}) {
  return (
    <div className="auth-shell">
      <div className="auth-shell-toolbar">
        <Link to="/products">
          <ArrowLeft aria-hidden="true" /> MonoPrep
        </Link>
        <LanguageSwitcher />
      </div>
      <div className="auth-board-copy" aria-hidden="true">
        <span>Digital SAT</span>
        <strong>Plan. Practice. Prove it.</strong>
      </div>
      <div className="auth-panel">
        <div className="auth-brand">
          <Link className="auth-logo" to="/">
            <img src="/monoprep-logo.png" alt="" />
            <span>MonoPrep</span>
          </Link>
          <img className="auth-corner-art" src={dashboardAssets.mono} alt="" />
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
