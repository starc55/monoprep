import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import PageTransition from '../components/motion/PageTransition.jsx';

export default function AppLayout({ title, subtitle, actions, children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleNavClick() {
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      {!sidebarOpen ? (
        <button
          type="button"
          className="sidebar-toggle hamburger-toggle"
          aria-label="Open sidebar navigation"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(true)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      ) : null}
      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close sidebar navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`.trim()}>
        <div>
          <div className="sidebar-brand-lockup">
            <img src="/monoprep-logo.png" alt="MonoPrep logo" />
            <div className="sidebar-brand">MonoPrep</div>
          </div>
          <p className="sidebar-copy">Focused practice, scoring, review, and analytics.</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" onClick={handleNavClick}>Dashboard</NavLink>
          <NavLink to="/practice" onClick={handleNavClick}>Practice Exams</NavLink>
          <NavLink to="/support" onClick={handleNavClick}>Support</NavLink>
          <NavLink to="/profile" onClick={handleNavClick}>Profile</NavLink>
        </nav>
        <div className="sidebar-user">
          <strong>{user?.fullName}</strong>
          <span>{user?.email}</span>
          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="app-main">
        <PageTransition>
          <header className="page-header">
            <div>
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <div className="page-actions">{actions}</div>
          </header>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
