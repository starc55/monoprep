import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Trophy,
  UserRound,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import PageTransition from '../components/motion/PageTransition.jsx';

const studentNavigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/practice', label: 'Practice Exams', icon: ClipboardList },
  { to: '/attempts', label: 'Attempts / Results', icon: Trophy },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/support', label: 'Support', icon: Headphones },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings }
];

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join('')
    .toUpperCase() || 'MP';
}

export default function AppLayout({ title, subtitle, actions, children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('monoprep-sidebar-collapsed') === 'true'
  );

  useEffect(() => {
    window.localStorage.setItem('monoprep-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleNavClick() {
    setSidebarOpen(false);
  }

  return (
    <div className={`app-shell student-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`.trim()}>
      {!sidebarOpen ? (
        <button
          type="button"
          className="sidebar-toggle hamburger-toggle"
          aria-label="Open sidebar navigation"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(true)}
        >
          <Menu aria-hidden="true" />
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
      <motion.aside
        className={`app-sidebar student-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`.trim()}
        initial={false}
        animate={{ width: sidebarCollapsed ? 96 : 284 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="sidebar-top">
          <div className="sidebar-brand-lockup">
            <img src="/monoprep-logo.png" alt="MonoPrep logo" />
            <div className="sidebar-brand-copy">
              <div className="sidebar-brand">MonoPrep</div>
              <span>SAT Prep Studio</span>
            </div>
            <button
              type="button"
              className="collapse-control"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>
          <p className="sidebar-copy">Focused practice, scoring, review, and analytics.</p>
        </div>
        <nav className="sidebar-nav" aria-label="Student navigation">
          <span className="sidebar-section-label">Menu</span>
          {studentNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={handleNavClick} title={sidebarCollapsed ? label : undefined}>
              <Icon aria-hidden="true" />
              <span className="sidebar-label">{label}</span>
            </NavLink>
          ))}
          <button type="button" className="sidebar-link" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            <span className="sidebar-label">Logout</span>
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-row">
            <span className="sidebar-avatar">{getInitials(user?.fullName)}</span>
            <div className="sidebar-user-copy">
              <strong>{user?.fullName}</strong>
              <span>{user?.email}</span>
            </div>
            <NavLink className="sidebar-settings" to="/settings" aria-label="Open settings">
              <Settings aria-hidden="true" />
            </NavLink>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
        <button
          type="button"
          className="sidebar-mobile-close"
          aria-label="Close sidebar navigation"
          onClick={() => setSidebarOpen(false)}
        >
          <X aria-hidden="true" />
        </button>
      </motion.aside>
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
