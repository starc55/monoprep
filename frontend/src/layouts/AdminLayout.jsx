import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import PageTransition from '../components/motion/PageTransition.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function AdminLayout({ title, subtitle, actions, children }) {
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
    <div className="app-shell admin-shell">
      {!sidebarOpen ? (
        <button
          type="button"
          className="sidebar-toggle hamburger-toggle"
          aria-label="Open admin navigation"
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
          aria-label="Close admin navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside className={`app-sidebar admin-sidebar ${sidebarOpen ? 'open' : ''}`.trim()}>
        <div>
          <div className="sidebar-brand-lockup">
            <img src="/monoprep-logo.png" alt="MonoPrep logo" />
            <div className="sidebar-brand">MonoPrep Admin</div>
          </div>
          <p className="sidebar-copy">Separate workspace for content, users, attempts, and stats.</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin" onClick={handleNavClick}>Overview</NavLink>
          <NavLink to="/admin/exams" onClick={handleNavClick}>Exams</NavLink>
          <NavLink to="/admin/questions" onClick={handleNavClick}>Questions</NavLink>
          <NavLink to="/admin/passages" onClick={handleNavClick}>Passages</NavLink>
          <NavLink to="/admin/users" onClick={handleNavClick}>Users</NavLink>
          <NavLink to="/admin/attempts" onClick={handleNavClick}>Attempts</NavLink>
          <NavLink to="/admin/stats" onClick={handleNavClick}>Stats</NavLink>
        </nav>
        <div className="sidebar-user">
          <strong>{user?.fullName}</strong>
          <span>{user?.email}</span>
          <button type="button" className="ghost-button" onClick={handleLogout}>
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
