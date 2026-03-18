import { useEffect, useState } from "react";
import { notificationApi } from "../services/notificationService";
import AppIcon from "../components/ui/AppIcon";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    notificationApi
      .list()
      .then(setItems)
      .catch((err) => setError(err?.response?.data?.message || "Could not load notifications."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    await notificationApi.markRead(id);
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));
  }

  const unreadCount = items.filter((item) => !item.read).length;
  const readCount = items.length - unreadCount;

  return (
    <div className="page-stack">
      <section className="card header-row">
        <div>
          <h2 className="section-title"><AppIcon name="bell" /> Notifications</h2>
          <p className="muted">Assignment, status update, and comment alerts.</p>
        </div>
        <button className="btn-secondary" onClick={load}>Refresh</button>
      </section>

      {!loading && !error && (
        <section className="kpi-row stagger-list">
          <article className="kpi-card">
            <p className="muted">Unread</p>
            <strong>{unreadCount}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Read</p>
            <strong>{readCount}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Total Alerts</p>
            <strong>{items.length}</strong>
          </article>
        </section>
      )}

      <section className="card">
        {loading && <p className="muted">Loading notifications...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && items.length === 0 && <p className="muted">No notifications yet.</p>}
        <ul className="comment-list stagger-list">
          {items.map((item) => (
            <li key={item._id}>
              <strong>{item.type.replaceAll("_", " ")}</strong>
              <p>{item.message}</p>
              <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
              {!item.read ? (
                <button className="btn-secondary" onClick={() => markRead(item._id)}>Mark as read</button>
              ) : (
                <span className="pill pill-low">Read</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
