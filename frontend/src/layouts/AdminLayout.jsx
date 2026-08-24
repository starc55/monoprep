import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import PageTransition from "../components/motion/PageTransition.jsx";
import { useAuthStore } from "../store/authStore.js";
import DashboardArt from "../components/dashboard/DashboardArt.jsx";
import LordIcon from "../components/ui/LordIcon.jsx";
import SupportWidget from "../components/support/SupportWidget.jsx";
import { dashboardAssets } from "../data/dashboardAssets.js";
import LanguageSwitcher from "../components/ui/LanguageSwitcher.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const adminIconMap = {
  overview: "https://cdn.lordicon.com/fttvwdlw.json",
  exams: "https://cdn.lordicon.com/hmpomorl.json",
  questions: "https://cdn.lordicon.com/weqkkuwt.json",
  passages: "https://cdn.lordicon.com/fttvwdlw.json",
  desmos: "https://cdn.lordicon.com/abfverha.json",
  teachers: "https://cdn.lordicon.com/lewtedlh.json",
  users: "https://cdn.lordicon.com/upkivhua.json",
  stats: "https://cdn.lordicon.com/oqhqyeud.json",
  admin: "https://cdn.lordicon.com/lewtedlh.json",
  logout: "https://cdn.lordicon.com/upkivhua.json"
};

const adminNavigation = [
  { to: "/admin", label: "Overview", labelKey: "nav.overview", icon: "overview", end: true },
  { to: "/admin/exams", label: "Exams", labelKey: "nav.exams", icon: "exams" },
  { to: "/admin/passages", label: "Passages", labelKey: "nav.passages", icon: "passages" },
  { to: "/admin/desmos-lessons", label: "Desmos Lessons", labelKey: "nav.desmosLessons", icon: "desmos" },
  { to: "/admin/teachers", label: "Teachers", labelKey: "nav.teachers", icon: "teachers" },
  { to: "/admin/users", label: "Users", labelKey: "nav.users", icon: "users" },
  { to: "/admin/stats", label: "Statistics", labelKey: "nav.statistics", icon: "stats" },
];

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((item) => item.charAt(0))
      .join("")
      .toUpperCase() || "MP"
  );
}

function SidebarIcon({ name, size = 24 }) {
  return (
    <LordIcon
      src={adminIconMap[name] || adminIconMap.overview}
      size={size}
      className="sidebar-lord-icon"
      colors="primary:#dbeafe,secondary:#60a5fa"
    />
  );
}

export default function AdminLayout({ title, subtitle, actions, children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      window.localStorage.getItem("monoprep-admin-sidebar-collapsed") === "true"
  );
  const { t, literal } = useI18n();

  useEffect(() => {
    window.localStorage.setItem(
      "monoprep-admin-sidebar-collapsed",
      String(sidebarCollapsed)
    );
  }, [sidebarCollapsed]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function handleNavClick() {
    setSidebarOpen(false);
  }

  return (
    <div
      className={`app-shell admin-shell ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`.trim()}
    >
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
        className={`app-sidebar premium-sidebar admin-sidebar ${
          sidebarOpen ? "open" : ""
        } ${sidebarCollapsed ? "collapsed" : ""}`.trim()}
        initial={false}
        animate={{ width: sidebarCollapsed ? 96 : 284 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <DashboardArt src={dashboardAssets.mono} className="sidebar-art" />
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
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>
          <p className="sidebar-copy">
            Secure control center for content, users, exams, and outcomes.
          </p>
        </div>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          <span className="sidebar-section-label">{t("nav.administration")}</span>
          {adminNavigation.map(({ to, label, labelKey, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={handleNavClick}
              aria-label={sidebarCollapsed ? t(labelKey) : undefined}
              data-tooltip={sidebarCollapsed ? t(labelKey) : undefined}
            >
              <SidebarIcon name={icon} />
              <span className="sidebar-label">{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-row">
            <span className="sidebar-avatar admin-avatar">
              {getInitials(user?.fullName)}
            </span>
            <div className="sidebar-user-copy">
              <strong>{user?.fullName || "MonoPrep Admin"}</strong>
              <span>{user?.email || "Administrator account"}</span>
            </div>
          </div>
          <span className="admin-role">
            <SidebarIcon name="admin" size={20} />
            Administrator
          </span>
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            aria-label={sidebarCollapsed ? "Sign out" : undefined}
            data-tooltip={sidebarCollapsed ? "Sign out" : undefined}
          >
            <SidebarIcon name="logout" size={22} />
            <span>{t("nav.signOut")}</span>
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
              <h1>{literal(title)}</h1>
              {subtitle ? <p>{literal(subtitle)}</p> : null}
            </div>
            <div className="page-actions"><LanguageSwitcher />{actions}</div>
          </header>
          {children}
        </PageTransition>
      </main>
      <SupportWidget />
    </div>
  );
}
