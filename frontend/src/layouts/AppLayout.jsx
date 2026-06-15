import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flame,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Swords,
  Settings,
  UserRound,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import PageTransition from '../components/motion/PageTransition.jsx';

const studentNavigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/practice', label: 'Practice Exams', icon: ClipboardList },
  { to: '/question-hub', label: 'Question Hub', icon: BookOpen },
  { to: '/vocabulary', label: 'Vocabulary', icon: MessageSquareText },
  { to: '/analytics', label: 'Analytics / Results', icon: BarChart3 },
  { to: '/competition', label: 'Competition Panel', icon: Flame },
  {
    to: '/support-sessions',
    label: 'Support Sessions',
    icon: Swords,
    children: [
      { to: '/support-sessions/schedules', label: 'Schedules', icon: CalendarDays },
      { to: '/support-sessions/mentors', label: 'Mentors', icon: UserRound }
    ]
  },
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('monoprep-sidebar-collapsed') === 'true'
  );
  const [supportOpen, setSupportOpen] = useState(() => location.pathname.startsWith('/support-sessions'));

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
        className={`app-sidebar premium-sidebar student-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`.trim()}
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
          <span className="sidebar-corner-orbit" aria-hidden="true"><GraduationCap /></span>
          {studentNavigation.map(({ to, label, icon: Icon, children: childItems }) => {
            const isGroupActive = childItems?.some((item) => location.pathname.startsWith(item.to)) || location.pathname === to;

            if (childItems?.length) {
              return (
                <div key={to} className={`sidebar-nav-group ${supportOpen ? 'open' : ''}`.trim()}>
                  <button
                    type="button"
                    className={`sidebar-link sidebar-group-toggle ${isGroupActive ? 'active' : ''}`.trim()}
                    onClick={() => setSupportOpen((value) => !value)}
                    aria-expanded={supportOpen}
                    aria-label={sidebarCollapsed ? label : undefined}
                    data-tooltip={sidebarCollapsed ? label : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span className="sidebar-label">{label}</span>
                    <ChevronDown aria-hidden="true" className="sidebar-group-caret" />
                  </button>
                  <div className="sidebar-subnav">
                    {childItems.map(({ to: childTo, label: childLabel, icon: ChildIcon }) => (
                      <NavLink
                        key={childTo}
                        to={childTo}
                        onClick={handleNavClick}
                        aria-label={sidebarCollapsed ? childLabel : undefined}
                        data-tooltip={sidebarCollapsed ? childLabel : undefined}
                      >
                        <ChildIcon aria-hidden="true" />
                        <span className="sidebar-label">{childLabel}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                aria-label={sidebarCollapsed ? label : undefined}
                data-tooltip={sidebarCollapsed ? label : undefined}
              >
                <Icon aria-hidden="true" />
                <span className="sidebar-label">{label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            className="sidebar-link"
            onClick={handleLogout}
            aria-label={sidebarCollapsed ? 'Logout' : undefined}
            data-tooltip={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut aria-hidden="true" />
            <span className="sidebar-label">Logout</span>
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-row">
            <span className="sidebar-avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : getInitials(user?.fullName)}
            </span>
            <div className="sidebar-user-copy">
              <strong>{user?.fullName || 'MonoPrep Student'}</strong>
              <span>{user?.username ? `@${user.username}` : user?.email || 'Signed-in account'}</span>
            </div>
            <NavLink className="sidebar-settings" to="/settings" aria-label="Open settings">
              <Settings aria-hidden="true" />
            </NavLink>
          </div>
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
