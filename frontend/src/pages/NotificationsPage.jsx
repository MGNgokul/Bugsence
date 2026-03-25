import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { notificationApi } from "../services/notificationService";
import AppIcon from "../components/ui/AppIcon";
import { useAuth } from "../context/AuthContext";
import { subscribeRealtime } from "../services/realtimeService";

function getNotificationLabel(type) {
  return String(type || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NotificationsPage() {
  const { token } = useAuth();
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

  useEffect(() => {
    return subscribeRealtime(
      "notification:new",
      (payload) => {
        if (!payload?._id) return;

        setItems((prev) => {
          const existing = prev.find((item) => item._id === payload._id);
          if (existing) {
            return prev.map((item) => (item._id === payload._id ? payload : item));
          }

          return [payload, ...prev];
        });
      },
      token
    );
  }, [token]);

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
          <p className="muted">Assignment, status update, comment, and mention alerts.</p>
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
              <strong>{getNotificationLabel(item.type)}</strong>
              <p>{item.message}</p>
              {item.bugId?.title ? <p className="muted">Bug: {item.bugId.title}</p> : null}
              <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
              <div className="quick-actions">
                {item.bugId?._id ? (
                  <Link className="btn-secondary" to={`/app/bugs/${item.bugId._id}`}>
                    Open bug
                  </Link>
                ) : null}
                {!item.read ? (
                  <button className="btn-secondary" onClick={() => markRead(item._id)}>Mark as read</button>
                ) : (
                  <span className="pill pill-low">Read</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
