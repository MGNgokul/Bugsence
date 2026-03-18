import { useEffect, useState } from "react";
import { activityApi } from "../services/activityService";
import AppIcon from "../components/ui/AppIcon";

export default function ActivityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    activityApi
      .list({ limit: 120 })
      .then(setItems)
      .catch((err) => setError(err?.response?.data?.message || "Could not load activity feed."))
      .finally(() => setLoading(false));
  }, []);

  const bugLinked = items.filter((item) => item.bugId?.title).length;
  const actorCount = new Set(items.map((item) => item.userId?.name).filter(Boolean)).size;

  return (
    <div className="page-stack">
      <section className="card">
        <h2 className="section-title"><AppIcon name="activity" /> Activity Timeline</h2>
        <p className="muted">Everything happening in the project, ordered by latest action.</p>
      </section>

      {!loading && !error && (
        <section className="kpi-row stagger-list">
          <article className="kpi-card">
            <p className="muted">Events</p>
            <strong>{items.length}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Bug-Linked Events</p>
            <strong>{bugLinked}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Active Contributors</p>
            <strong>{actorCount}</strong>
          </article>
        </section>
      )}

      <section className="card">
        {loading && <p className="muted">Loading activity...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && items.length === 0 && <p className="muted">No activity found.</p>}
        <ul className="timeline stagger-list">
          {items.map((item) => (
            <li key={item._id}>
              <span className="dot" />
              <div>
                <strong>{item.action}</strong>
                <p>{item.bugId?.title || "General event"}</p>
                <p className="muted">
                  {(item.userId?.name || "Unknown user")} | {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
