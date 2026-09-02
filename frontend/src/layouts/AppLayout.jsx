import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";
import PageTransition from "../components/motion/PageTransition.jsx";
import NotificationBell from "../components/notifications/NotificationBell.jsx";
import DashboardArt from "../components/dashboard/DashboardArt.jsx";
import LordIcon from "../components/ui/LordIcon.jsx";
import SupportWidget from "../components/support/SupportWidget.jsx";
import { dashboardAssets } from "../data/dashboardAssets.js";
import LanguageSwitcher from "../components/ui/LanguageSwitcher.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const sidebarIconMap = {
  dashboard: "https://cdn.lordicon.com/vvkusrbh.json",
  practice: "https://cdn.lordicon.com/hmpomorl.json",
  questionHub: "https://cdn.lordicon.com/fttvwdlw.json",
  desmos: "https://cdn.lordicon.com/abfverha.json",
  vocabulary: "https://cdn.lordicon.com/weqkkuwt.json",
  analytics: "https://cdn.lordicon.com/oqhqyeud.json",
  competition: "https://cdn.lordicon.com/lvrxlmju.json",
  community: "https://cdn.lordicon.com/gznfrpfp.json",
  leaderboard: "https://cdn.lordicon.com/vttzorhw.json",
  profile: "https://cdn.lordicon.com/kdduutaw.json",
  settings: "https://cdn.lordicon.com/nfuackpv.json",
  logout: "https://cdn.lordicon.com/vfiwitrm.json",
};

const studentNavigation = [
  {
    to: "/dashboard",
    label: "Dashboard",
    labelKey: "nav.dashboard",
    icon: "dashboard",
  },
  {
    to: "/practice",
    label: "Practice Exams",
    labelKey: "nav.practice",
    icon: "practice",
  },
  {
    to: "/question-hub",
    label: "Question Hub",
    labelKey: "nav.questionHub",
    icon: "questionHub",
  },
  {
    to: "/desmos-hack",
    label: "Desmos Hack",
    labelKey: "nav.desmos",
    icon: "desmos",
  },
  {
    to: "/vocabulary",
    label: "Vocabulary",
    labelKey: "nav.vocabulary",
    icon: "vocabulary",
  },
  {
    to: "/analytics",
    label: "Analytics / Results",
    labelKey: "nav.analytics",
    icon: "analytics",
  },
  {
    to: "/competition",
    label: "Competition",
    labelKey: "nav.competition",
    icon: "competition",
  },
  {
    to: "/students",
    key: "community",
    label: "Community",
    labelKey: "nav.community",
    icon: "community",
    children: [
      {
        to: "/students",
        label: "Students",
        labelKey: "nav.students",
        icon: "community",
      },
      {
        to: "/leaderboard",
        label: "Leaderboard",
        labelKey: "nav.leaderboard",
        icon: "leaderboard",
      },
    ],
  },
  {
    to: "/profile",
    label: "Profile",
    labelKey: "nav.profile",
    icon: "profile",
  },
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
      src={sidebarIconMap[name] || sidebarIconMap.dashboard}
      size={size}
      className="sidebar-lord-icon"
      colors="primary:#dbeafe,secondary:#60a5fa"
    />
  );
}

export default function AppLayout({ title, subtitle, actions, children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem("monoprep-sidebar-collapsed") === "true"
  );
  const [openGroups, setOpenGroups] = useState(() => ({
    community:
      location.pathname.startsWith("/students") ||
      location.pathname.startsWith("/leaderboard"),
  }));
  const navigationItems = studentNavigation;
  const { t, literal } = useI18n();
  const examRoomRoute = /^\/attempts\/[^/]+\/exam\/?$/.test(location.pathname);

  useEffect(() => {
    window.localStorage.setItem(
      "monoprep-sidebar-collapsed",
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
      className={`app-shell student-shell ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      }`.trim()}
    >
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
        className={`app-sidebar premium-sidebar student-sidebar ${
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
              <span>SAT</span>
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
            Focused practice, scoring, review, and analytics.
          </p>
        </div>
        <nav className="sidebar-nav" aria-label="Student navigation">
          <span className="sidebar-section-label">{t("nav.menu")}</span>
          {navigationItems.map(
            ({ to, key, label, labelKey, icon, children: childItems }) => {
              const displayLabel = labelKey ? t(labelKey) : label;
              const groupKey = key || to;
              const isGroupActive =
                childItems?.some((item) =>
                  location.pathname.startsWith(item.to)
                ) || location.pathname === to;
              const groupOpen = Boolean(openGroups[groupKey]);

              if (childItems?.length) {
                return (
                  <div
                    key={to}
                    className={`sidebar-nav-group ${
                      groupOpen ? "open" : ""
                    }`.trim()}
                  >
                    <button
                      type="button"
                      className={`sidebar-link sidebar-group-toggle ${
                        isGroupActive ? "active" : ""
                      }`.trim()}
                      onClick={() =>
                        setOpenGroups((current) => ({
                          ...current,
                          [groupKey]: !current[groupKey],
                        }))
                      }
                      aria-expanded={groupOpen}
                      aria-label={sidebarCollapsed ? displayLabel : undefined}
                      data-tooltip={sidebarCollapsed ? displayLabel : undefined}
                    >
                      <SidebarIcon name={icon} />
                      <span className="sidebar-label">{displayLabel}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className="sidebar-group-caret"
                      />
                    </button>
                    <div className="sidebar-subnav">
                      {childItems.map(
                        ({
                          to: childTo,
                          label: childLabel,
                          labelKey: childLabelKey,
                          icon: childIcon,
                        }) => (
                          <NavLink
                            key={childTo}
                            to={childTo}
                            onClick={handleNavClick}
                            aria-label={
                              sidebarCollapsed
                                ? childLabelKey
                                  ? t(childLabelKey)
                                  : childLabel
                                : undefined
                            }
                            data-tooltip={
                              sidebarCollapsed
                                ? childLabelKey
                                  ? t(childLabelKey)
                                  : childLabel
                                : undefined
                            }
                          >
                            <SidebarIcon name={childIcon} size={22} />
                            <span className="sidebar-label">
                              {childLabelKey ? t(childLabelKey) : childLabel}
                            </span>
                          </NavLink>
                        )
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  aria-label={sidebarCollapsed ? displayLabel : undefined}
                  data-tooltip={sidebarCollapsed ? displayLabel : undefined}
                >
                  <SidebarIcon name={icon} />
                  <span className="sidebar-label">{displayLabel}</span>
                </NavLink>
              );
            }
          )}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-row">
            <span className="sidebar-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" />
              ) : (
                getInitials(user?.fullName)
              )}
            </span>
            <div className="sidebar-user-copy">
              <strong>{user?.fullName || "MonoPrep Student"}</strong>
              <span>
                {user?.username
                  ? `@${user.username}`
                  : user?.email || "Signed-in account"}
              </span>
            </div>
            <NavLink
              className="sidebar-settings"
              to="/settings"
              aria-label="Open settings"
            >
              <SidebarIcon name="settings" size={22} />
            </NavLink>
          </div>
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
              <h1>{literal(title)}</h1>
              {subtitle ? <p>{literal(subtitle)}</p> : null}
            </div>
            <div className="page-actions">
              <NotificationBell />
              {!examRoomRoute ? <LanguageSwitcher /> : null}
              {actions}
            </div>
          </header>
          {children}
        </PageTransition>
      </main>
      <SupportWidget />
    </div>
  );
}
