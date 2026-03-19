import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppIcon from "../components/ui/AppIcon";
import { authApi } from "../services/authService";
import { getApiErrorMessage } from "../services/http";
import { useAuth } from "../context/AuthContext";
import { getRoleSummary, hasPermission, PERMISSIONS } from "../utils/roles";

function normalizeProfileUser(user) {
  if (!user) return null;

  return {
    id: user.id || user._id || "",
    name: user.name || "",
    email: user.email || "",
    role: user.role || "Tester",
    createdAt: user.createdAt || null
  };
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(() => normalizeProfileUser(user));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    authApi.profile()
      .then((data) => {
        if (!active) return;
        setProfile(normalizeProfileUser(data?.user) || normalizeProfileUser(user));
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err, "Could not load profile details."));
        setProfile((current) => current || normalizeProfileUser(user));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const account = profile || normalizeProfileUser(user);
  const firstName = account?.name?.trim()?.split(/\s+/)[0] || "Team";
  const userInitial = firstName.charAt(0).toUpperCase();
  const memberSince = account?.createdAt ? new Date(account.createdAt).toLocaleDateString() : "Not available";

  const quickLinks = useMemo(() => {
    const links = [
      { to: "/app", label: "Dashboard", text: "See current workspace health and delivery signals.", icon: "dashboard" },
      { to: "/app/my-work", label: "My Work", text: "Review bugs currently assigned to you.", icon: "work" },
      { to: "/app/notifications", label: "Notifications", text: "Check assignment, mention, and status alerts.", icon: "bell" }
    ];

    if (hasPermission(account, PERMISSIONS.ACTIVITY)) {
      links.push({
        to: "/app/activity",
        label: "Activity",
        text: "Review the latest bug history and workspace changes.",
        icon: "activity"
      });
    }

    if (hasPermission(account, PERMISSIONS.TEAM)) {
      links.push({
        to: "/app/team",
        label: "Team",
        text: "Open the team roster and delivery ownership view.",
        icon: "team"
      });
    }

    if (hasPermission(account, PERMISSIONS.VERSIONS)) {
      links.push({
        to: "/app/versions",
        label: "Versions",
        text: "Track release readiness and version-linked bug counts.",
        icon: "stats"
      });
    }

    return links;
  }, [account]);

  return (
    <div className="page-stack">
      <section className="card header-row">
        <div>
          <h2 className="section-title"><AppIcon name="team" /> Profile Details</h2>
          <p className="muted">Account identity, access level, and quick workspace links.</p>
        </div>
        <div className="quick-actions">
          <span className="workspace-chip">
            <AppIcon name="shield" size={14} />
            {account?.role || "Tester"} access
          </span>
          <button type="button" className="btn-secondary" onClick={logout}>
            <AppIcon name="rocket" size={14} />
            Logout
          </button>
        </div>
      </section>

      {error ? (
        <section className="card">
          <p className="error">{error}</p>
        </section>
      ) : null}

      <section className="card">
        {loading && !account ? <p className="muted">Loading profile...</p> : null}
        {account ? (
          <div className="split">
            <div className="mini-card profile-summary">
              <div className="header-row">
                <div className="profile-summary__identity">
                  <span className="profile-summary__avatar">{userInitial}</span>
                  <div className="profile-summary__copy">
                    <strong>{account.name || "Workspace User"}</strong>
                    <small>{account.role || "Tester"}</small>
                  </div>
                </div>
              </div>
              <p>{getRoleSummary(account.role)}</p>
            </div>

            <div className="mini-card">
              <div className="form-grid">
                <p><strong>Email:</strong> {account.email || "Not available"}</p>
                <p><strong>Member Since:</strong> {memberSince}</p>
                <p><strong>User ID:</strong> {account.id || "Not available"}</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {!loading && account ? (
        <section className="kpi-row stagger-list">
          <article className="kpi-card">
            <p className="muted">Role</p>
            <strong>{account.role}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Quick Links</p>
            <strong>{quickLinks.length}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Profile Status</p>
            <strong>{error ? "Fallback" : "Live"}</strong>
          </article>
        </section>
      ) : null}

      <section className="card">
        <div className="header-row">
          <div>
            <h3 className="section-title"><AppIcon name="rocket" /> Workspace Shortcuts</h3>
            <p className="muted">Use these links instead of the old mobile hamburger menu.</p>
          </div>
        </div>

        <div className="interactive-grid stagger-list">
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to} className="mini-card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name={item.icon} />
                </span>
                <h4>{item.label}</h4>
              </div>
              <p>{item.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
