import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bugApi } from "../services/bugService";
import { useAuth } from "../context/AuthContext";
import AppIcon from "../components/ui/AppIcon";

export default function MyWorkPage() {
  const { user } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const assignedTo = user?.id || user?._id;
    if (!assignedTo) return;

    setLoading(true);
    bugApi
      .list({ assignedTo })
      .then(setBugs)
      .catch((err) => setError(err?.response?.data?.message || "Could not load assigned bugs."))
      .finally(() => setLoading(false));
  }, [user?.id, user?._id]);

  const completed = bugs.filter((bug) => ["Resolved", "Closed"].includes(bug.status)).length;
  const active = bugs.filter((bug) => bug.status === "In Progress").length;

  return (
    <div className="page-stack">
      <section className="card">
        <h2 className="section-title"><AppIcon name="work" /> My Work</h2>
        <p className="muted">Bugs currently assigned to you.</p>
      </section>

      {!loading && !error && (
        <section className="kpi-row stagger-list">
          <article className="kpi-card">
            <p className="muted">Assigned</p>
            <strong>{bugs.length}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">In Progress</p>
            <strong>{active}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Resolved / Closed</p>
            <strong>{completed}</strong>
          </article>
        </section>
      )}

      <section className="card">
        {loading && <p className="muted">Loading assignments...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && bugs.length === 0 && <p className="muted">No assigned bugs.</p>}
        {!loading && !error && bugs.length > 0 && (
          <div className="smart-table-wrap">
            <table className="table smart-table">
              <thead>
                <tr>
                  <th>Bug</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="stagger-list">
                {bugs.map((bug) => (
                  <tr key={bug._id}>
                    <td><Link to={`/app/bugs/${bug._id}`}>{bug.title}</Link></td>
                    <td><span className="pill">{bug.status}</span></td>
                    <td><span className={`pill pill-${bug.priority?.toLowerCase()}`}>{bug.priority}</span></td>
                    <td>{bug.deadline ? new Date(bug.deadline).toLocaleDateString() : "N/A"}</td>
                    <td>
                      <div className="quick-actions">
                        <Link className="btn-secondary" to={`/app/bugs/${bug._id}`}>
                          <AppIcon name="work" /> Solve Now
                        </Link>
                        <Link className="btn-secondary" to={`/app/bugs/${bug._id}#bug-ai`}>
                          <AppIcon name="stats" /> Ask AI
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
