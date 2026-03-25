import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/ui/BrandLogo";
import AppIcon from "../components/ui/AppIcon";
import { getRoleSummary, hasPermission, PERMISSIONS } from "../utils/roles";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");

  const navItems = [
    { to: "/app", label: "Dashboard", mobileLabel: "Home", icon: "dashboard", end: true, permission: PERMISSIONS.DASHBOARD },
    { to: "/app/bugs", label: "Backlog", mobileLabel: "Bugs", icon: "bug", permission: PERMISSIONS.BUGS },
    { to: "/app/my-work", label: "My Work", mobileLabel: "Work", icon: "work", permission: PERMISSIONS.MY_WORK },
    { to: "/app/activity", label: "Activity", mobileLabel: "Feed", icon: "activity", permission: PERMISSIONS.ACTIVITY },
    { to: "/app/team", label: "Team", mobileLabel: "Team", icon: "team", permission: PERMISSIONS.TEAM },
    { to: "/app/versions", label: "Versions", mobileLabel: "Versions", icon: "stats", permission: PERMISSIONS.VERSIONS },
    { to: "/app/bugs/new", label: "Report Bug", mobileLabel: "Report", icon: "plus", end: true, permission: PERMISSIONS.CREATE_BUG, mobileAccent: true }
  ];

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const nextFlash = location.state?.flashMessage;

    if (!nextFlash) return;

    setFlashMessage(nextFlash);
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!flashMessage) return undefined;

    const timer = window.setTimeout(() => {
      setFlashMessage("");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "Team";
  const visibleNavItems = navItems.filter((item) => hasPermission(user, item.permission));
  const getVisibleNavItem = (to) => visibleNavItems.find((item) => item.to === to);
  const canViewNotifications = hasPermission(user, PERMISSIONS.NOTIFICATIONS);
  const mobilePrimaryNavItems = [];
  const appendMobileNavItem = (item) => {
    if (item && !mobilePrimaryNavItems.some((entry) => entry.to === item.to)) {
      mobilePrimaryNavItems.push(item);
    }
  };

  appendMobileNavItem(getVisibleNavItem("/app"));
  appendMobileNavItem(getVisibleNavItem("/app/bugs"));
  appendMobileNavItem(getVisibleNavItem("/app/bugs/new"));
  appendMobileNavItem(getVisibleNavItem("/app/team") || getVisibleNavItem("/app/activity"));
  appendMobileNavItem(getVisibleNavItem("/app/my-work") || getVisibleNavItem("/app/activity"));

  const userRoleLabel = user?.role || "Workspace";
  const userInitial = firstName.charAt(0).toUpperCase();
  const renderUtilityControls = (mode) => (
    <>
      <button
        type="button"
        className={mode === "sidebar" ? "sidebar-control sidebar-control-secondary" : "workspace-action workspace-action-secondary"}
        onClick={toggleTheme}
      >
        {mode === "sidebar" ? (
          <span className="icon-chip">
            <AppIcon name="stats" />
          </span>
        ) : (
          <AppIcon name="stats" size={14} />
        )}
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </button>
      <button
        type="button"
        className={mode === "sidebar" ? "sidebar-control" : "workspace-action"}
        onClick={logout}
      >
        {mode === "sidebar" ? (
          <span className="icon-chip">
            <AppIcon name="rocket" />
          </span>
        ) : (
          <AppIcon name="rocket" size={14} />
        )}
        <span>Logout</span>
      </button>
    </>
  );

  return (
    <div className="app-shell">
      <div
        className={`sidebar-backdrop ${navOpen ? "visible" : ""}`}
        aria-hidden={!navOpen}
        onClick={() => setNavOpen(false)}
      />

      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <BrandLogo subtitle="Enterprise Delivery Control" />
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            Close
          </button>
        </div>

        <div className="sidebar-meta">
          <p className="muted">
            {getRoleSummary(user?.role)}
          </p>
          <span className="workspace-chip">
            <AppIcon name="shield" size={14} />
            {userRoleLabel} access
          </span>
        </div>

        <nav className="nav" aria-label="Application">
          {visibleNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="icon-chip">
                <AppIcon name={item.icon} className="nav-icon" />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-controls">
          {renderUtilityControls("sidebar")}
        </div>
      </aside>

      <header className="mobile-topbar" aria-label="Mobile top navigation">
        <div className="mobile-topbar__inner">
          <div className="mobile-topbar__brand">
            <BrandLogo size={32} subtitle={userRoleLabel} />
          </div>

          <div className="mobile-topbar__actions">
            {canViewNotifications ? (
              <NavLink
                to="/app/notifications"
                className={({ isActive }) => `mobile-topbar__action${isActive ? " active" : ""}`}
                aria-label="Notifications"
              >
                <AppIcon name="bell" size={18} />
              </NavLink>
            ) : null}

            <button
              type="button"
              className="mobile-topbar__action"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            >
              <AppIcon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>

            <Link
              to="/app/profile"
              className="mobile-profile-button"
              aria-label="Open profile details"
            >
              <span className="mobile-profile-button__avatar">{userInitial}</span>
              <span className="mobile-profile-button__copy">
                <strong>{firstName}</strong>
                <small>{userRoleLabel}</small>
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="workspace-frame">
          <div className="workspace-quick-actions">
            {canViewNotifications ? (
              <NavLink
                to="/app/notifications"
                className={({ isActive }) =>
                  `workspace-action workspace-action-secondary workspace-action-icon${isActive ? " active" : ""}`
                }
                aria-label="Notifications"
              >
                <AppIcon name="bell" size={16} />
              </NavLink>
            ) : null}
            {renderUtilityControls("top")}
          </div>

          <header className="workspace-header">
            <button
              type="button"
              className="topbar-mobile"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className="workspace-header-copy">
              <p className="topbar-eyebrow">Operations Cockpit</p>
              <strong className="topbar-title">
                <AppIcon name="team" />
                Welcome back, {firstName}
              </strong>
              <p className="muted">
                {getRoleSummary(user?.role)}
              </p>
            </div>
          </header>

          <div className="workspace-content">
            {flashMessage ? (
              <div className="app-flash app-flash--success">
                <span>{flashMessage}</span>
              </div>
            ) : null}
            <Outlet />
          </div>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        <div
          className="mobile-bottom-nav__inner"
          style={{ "--mobile-nav-count": Math.max(mobilePrimaryNavItems.length, 1) }}
        >
          {mobilePrimaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mobile-bottom-nav__item${isActive ? " active" : ""}${item.mobileAccent ? " mobile-bottom-nav__item--accent" : ""}`}
            >
              <span className="mobile-bottom-nav__icon">
                <AppIcon name={item.icon} size={item.mobileAccent ? 20 : 18} colorful={!item.mobileAccent} />
              </span>
              <span className="mobile-bottom-nav__label">{item.mobileLabel || item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
