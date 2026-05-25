import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Trophy,
  UsersRound,
  X
} from 'lucide-react';
import PageTransition from '../components/motion/PageTransition.jsx';
import { useAuthStore } from '../store/authStore.js';

const adminNavigation = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/exams', label: 'Exams', icon: ClipboardList },
  { to: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { to: '/admin/passages', label: 'Passages', icon: BookOpen },
  { to: '/admin/users', label: 'Users', icon: UsersRound },
  { to: '/admin/attempts', label: 'Attempts', icon: Trophy },
  { to: '/admin/stats', label: 'Statistics', icon: BarChart3 }
];

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join('')
    .toUpperCase() || 'MP';
}

export default function AdminLayout({ title, subtitle, actions, children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('monoprep-admin-sidebar-collapsed') === 'true'
  );

  useEffect(() => {
    window.localStorage.setItem('monoprep-admin-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleNavClick() {
    setSidebarOpen(false);
  }

  return (
    <div className={`app-shell admin-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`.trim()}>
      {!sidebarOpen ? (
        <button
          type="button"
          className="sidebar-toggle hamburger-toggle"
          aria-label="Open admin navigation"
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
          aria-label="Close admin navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <motion.aside
        className={`app-sidebar premium-sidebar admin-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`.trim()}
        initial={false}
        animate={{ width: sidebarCollapsed ? 96 : 284 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="sidebar-top">
          <div className="sidebar-brand-lockup">
            <img src="/monoprep-logo.png" alt="MonoPrep logo" />
            <div className="sidebar-brand-copy">
              <div className="sidebar-brand">MonoPrep</div>
              <span>Admin Console</span>
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
          <p className="sidebar-copy">Secure control center for content, users, exams, and outcomes.</p>
        </div>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          <span className="sidebar-section-label">Administration</span>
          {adminNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={handleNavClick}
              aria-label={sidebarCollapsed ? label : undefined}
              data-tooltip={sidebarCollapsed ? label : undefined}
            >
              <Icon aria-hidden="true" />
              <span className="sidebar-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-row">
            <span className="sidebar-avatar admin-avatar">{getInitials(user?.fullName)}</span>
            <div className="sidebar-user-copy">
              <strong>{user?.fullName || 'MonoPrep Admin'}</strong>
              <span>{user?.email || 'Administrator account'}</span>
            </div>
          </div>
          <span className="admin-role">
            <ShieldCheck aria-hidden="true" />
            Administrator
          </span>
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            aria-label={sidebarCollapsed ? 'Sign out' : undefined}
            data-tooltip={sidebarCollapsed ? 'Sign out' : undefined}
          >
            <LogOut aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
        <button
          type="button"
          className="sidebar-mobile-close"
          aria-label="Close admin navigation"
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
