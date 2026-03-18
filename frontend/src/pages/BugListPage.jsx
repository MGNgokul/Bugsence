import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bugApi } from "../services/bugService";
import AppIcon from "../components/ui/AppIcon";
import { useAuth } from "../context/AuthContext";
import { hasPermission, PERMISSIONS } from "../utils/roles";

export default function BugListPage() {
  const { user } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [filters, setFilters] = useState({ status: "", priority: "", q: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [sortDir, setSortDir] = useState("desc");
  const [updatingId, setUpdatingId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const data = await bugApi.list(params);
      setBugs(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch bugs.");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    const initial = { status: "", priority: "", q: "" };
    setFilters(initial);
    setLoading(true);
    setError("");
    bugApi
      .list()
      .then(setBugs)
      .catch((err) => setError(err?.response?.data?.message || "Failed to fetch bugs."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function applyPreset(type) {
    const myId = user?.id || user?._id;
    if (type === "all") {
      setFilters({ status: "", priority: "", q: "" });
      setTimeout(load, 0);
      return;
    }
    if (type === "my-open") {
      setFilters({ status: "Open", priority: "", q: "" });
      bugApi
        .list({ status: "Open", assignedTo: myId })
        .then(setBugs)
        .catch((err) => setError(err?.response?.data?.message || "Failed to fetch bugs."));
      return;
    }
    if (type === "critical") {
      setFilters({ status: "", priority: "Critical", q: "" });
      bugApi
        .list({ priority: "Critical" })
        .then(setBugs)
        .catch((err) => setError(err?.response?.data?.message || "Failed to fetch bugs."));
      return;
    }
    if (type === "qa") {
      setFilters({ status: "Testing", priority: "", q: "" });
      bugApi
        .list({ status: "Testing" })
        .then(setBugs)
        .catch((err) => setError(err?.response?.data?.message || "Failed to fetch bugs."));
      return;
    }
    if (type === "unassigned") {
      setFilters({ status: "", priority: "", q: "" });
      bugApi
        .list()
        .then((data) => setBugs(data.filter((bug) => !bug.assignedTo?.name)))
        .catch((err) => setError(err?.response?.data?.message || "Failed to fetch bugs."));
    }
  }

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  }

  function sortRank(value, column) {
    if (column === "priority") {
      return { Critical: 4, High: 3, Medium: 2, Low: 1 }[value] || 0;
    }
    if (column === "status") {
      return { Open: 1, "In Progress": 2, Testing: 3, Resolved: 4, Closed: 5 }[value] || 0;
    }
    return String(value || "").toLowerCase();
  }

  const sortedBugs = [...bugs].sort((a, b) => {
    const aValue =
      sortBy === "title"
        ? a.title
        : sortBy === "status"
          ? a.status
          : sortBy === "priority"
            ? a.priority
            : sortBy === "category"
              ? a.category
              : a.assignedTo?.name || "";
    const bValue =
      sortBy === "title"
        ? b.title
        : sortBy === "status"
          ? b.status
          : sortBy === "priority"
            ? b.priority
            : sortBy === "category"
              ? b.category
              : b.assignedTo?.name || "";

    const aRank = sortRank(aValue, sortBy);
    const bRank = sortRank(bValue, sortBy);
    if (aRank < bRank) return sortDir === "asc" ? -1 : 1;
    if (aRank > bRank) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  async function quickStatusUpdate(id, status) {
    setUpdatingId(id);
    setError("");
    try {
      await bugApi.update(id, { status });
      setBugs((prev) => prev.map((bug) => (bug._id === id ? { ...bug, status } : bug)));
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update bug status.");
    } finally {
      setUpdatingId("");
    }
  }

  const openCount = bugs.filter((bug) => !["Resolved", "Closed"].includes(bug.status)).length;
  const criticalCount = bugs.filter((bug) => bug.priority === "Critical").length;
  const unassignedCount = bugs.filter((bug) => !bug.assignedTo?.name).length;
  const canUseQuickActions = hasPermission(user, PERMISSIONS.BUG_QUICK_ACTIONS);
  const canUseUnassignedFilter = hasPermission(user, PERMISSIONS.UNASSIGNED_FILTER);

  return (
    <div className="page-stack">
      <section className="card header-row">
        <div>
          <h2 className="section-title"><AppIcon name="bug" /> Bug Backlog</h2>
          <p className="muted">Track open issues, prioritize work, and inspect ownership across the team.</p>
        </div>
        <Link className="btn-primary" to="/app/bugs/new">
          <AppIcon name="plus" /> New Bug
        </Link>
      </section>

      <section className="card filter-row">
        <input
          placeholder="Search title/description"
          value={filters.q}
          onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
        />
        <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
          <option value="">All Status</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Testing</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters((s) => ({ ...s, priority: e.target.value }))}>
          <option value="">All Priority</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </select>
        <button onClick={load}>Apply</button>
        <button className="btn-secondary" onClick={resetFilters}>Reset</button>
      </section>

      <section className="badge-row">
        <button className="btn-secondary" onClick={() => applyPreset("all")}><AppIcon name="dashboard" /> All</button>
        <button className="btn-secondary" onClick={() => applyPreset("my-open")}><AppIcon name="work" /> My Open</button>
        <button className="btn-secondary" onClick={() => applyPreset("critical")}><AppIcon name="bug" /> Critical</button>
        <button className="btn-secondary" onClick={() => applyPreset("qa")}><AppIcon name="shield" /> QA Queue</button>
        {canUseUnassignedFilter ? (
          <button className="btn-secondary" onClick={() => applyPreset("unassigned")}><AppIcon name="team" /> Unassigned</button>
        ) : null}
      </section>

      <section className="kpi-row stagger-list">
        <article className="kpi-card">
          <p className="muted">Open Bugs</p>
          <strong>{openCount}</strong>
        </article>
        <article className="kpi-card">
          <p className="muted">Critical in Queue</p>
          <strong>{criticalCount}</strong>
        </article>
        <article className="kpi-card">
          <p className="muted">Unassigned</p>
          <strong>{unassignedCount}</strong>
        </article>
      </section>

      <section className="card">
        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Loading bugs...</p>}
        {!loading && !error && <p className="muted">Showing {bugs.length} bug(s).</p>}

        {!loading && !error && bugs.length === 0 ? (
          <div className="empty-state">
            <h3>No bugs found</h3>
            <p>Try a different filter or create a new bug report.</p>
            <Link className="btn-primary" to="/app/bugs/new">
              Report First Bug
            </Link>
          </div>
        ) : null}

        <div className="smart-table-wrap">
          <table className="table smart-table">
            <thead>
              <tr>
                <th>
                  <button className="table-sort" onClick={() => toggleSort("title")}>
                    Title {sortBy === "title" ? (sortDir === "asc" ? "v" : "^") : "-"}
                  </button>
                </th>
                <th>
                  <button className="table-sort" onClick={() => toggleSort("status")}>
                    Status {sortBy === "status" ? (sortDir === "asc" ? "v" : "^") : "-"}
                  </button>
                </th>
                <th>
                  <button className="table-sort" onClick={() => toggleSort("priority")}>
                    Priority {sortBy === "priority" ? (sortDir === "asc" ? "v" : "^") : "-"}
                  </button>
                </th>
                <th>
                  <button className="table-sort" onClick={() => toggleSort("category")}>
                    Category {sortBy === "category" ? (sortDir === "asc" ? "v" : "^") : "-"}
                  </button>
                </th>
                <th>
                  <button className="table-sort" onClick={() => toggleSort("assignee")}>
                    Assigned To {sortBy === "assignee" ? (sortDir === "asc" ? "v" : "^") : "-"}
                  </button>
                </th>
                <th>{canUseQuickActions ? "Quick Actions" : "Details"}</th>
              </tr>
            </thead>
            <tbody className="stagger-list">
              {sortedBugs.map((bug) => (
                <tr key={bug._id}>
                  <td><Link to={`/app/bugs/${bug._id}`}>{bug.title}</Link></td>
                  <td><span className="pill">{bug.status}</span></td>
                  <td><span className={`pill pill-${bug.priority?.toLowerCase()}`}>{bug.priority}</span></td>
                  <td>{bug.category}</td>
                  <td>{bug.assignedTo?.name || "Unassigned"}</td>
                  <td>
                    <div className="quick-actions">
                      <Link className="btn-secondary" to={`/app/bugs/${bug._id}`}>View</Link>
                      {canUseQuickActions ? (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => quickStatusUpdate(bug._id, "In Progress")}
                            disabled={updatingId === bug._id || bug.status === "In Progress"}
                          >
                            Start
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => quickStatusUpdate(bug._id, "Resolved")}
                            disabled={updatingId === bug._id || bug.status === "Resolved"}
                          >
                            Resolve
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
