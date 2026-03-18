import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { bugApi } from "../services/bugService";
import AppIcon from "../components/ui/AppIcon";
import AiSuggestionPanel from "../components/ui/AiSuggestionPanel";
import { useAuth } from "../context/AuthContext";
import { hasPermission, PERMISSIONS } from "../utils/roles";

export default function BugDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bug, setBug] = useState(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("Open");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bugApi.getById(id);
      setBug(data);
      setStatus(data.status);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load bug.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPostingComment(true);
    try {
      await bugApi.addComment(id, { comment });
      setComment("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not add comment.");
    } finally {
      setPostingComment(false);
    }
  }

  async function updateStatus() {
    setSavingStatus(true);
    try {
      await bugApi.update(id, { status });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update status.");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) return <p>Loading bug...</p>;
  if (error && !bug) return <p className="error">{error}</p>;
  if (!bug) return <p className="muted">Bug not found.</p>;

  const timelineCount = bug.statusTimeline?.length || 0;
  const commentCount = bug.comments?.length || 0;
  const latestTimeline = timelineCount > 0 ? bug.statusTimeline[timelineCount - 1] : null;
  const canUpdateStatus = hasPermission(user, PERMISSIONS.BUG_STATUS);

  return (
    <div className="page-stack">
      <section className="card">
        {error && <p className="error">{error}</p>}
        <h2 className="section-title"><AppIcon name="bug" /> {bug.title}</h2>
        <p className="muted">{bug.description}</p>
        <div className="badge-row">
          <span className="badge-soft"><AppIcon name="activity" size={14} /> Timeline events: {timelineCount}</span>
          <span className="badge-soft"><AppIcon name="team" size={14} /> Comments: {commentCount}</span>
          <span className="badge-soft"><AppIcon name="work" size={14} /> Assignee: {bug.assignedTo?.name || "Unassigned"}</span>
        </div>
        <div className="meta-grid">
          <p><strong>Status:</strong> {bug.status}</p>
          <p><strong>Priority:</strong> {bug.priority}</p>
          <p><strong>Category:</strong> {bug.category}</p>
          <p><strong>Version:</strong> {bug.versionIntroduced || "N/A"}</p>
        </div>
        <p><strong>Steps:</strong> {bug.stepsToReproduce || "N/A"}</p>
        <p><strong>Expected:</strong> {bug.expectedResult || "N/A"}</p>
        <p><strong>Actual:</strong> {bug.actualResult || "N/A"}</p>
      </section>

      <AiSuggestionPanel
        suggestion={bug.aiSuggestion}
        title="AI Bug Fix Suggestions"
        subtitle="Structured guidance generated from the current bug report details."
        error={error && bug ? error : ""}
        emptyTitle="No AI fix suggestion available"
        emptyText="Reload the bug details after adding more bug information to generate a stronger suggestion."
      />

      <section className="kpi-row stagger-list">
        <article className="kpi-card">
          <p className="muted">Current Status</p>
          <strong>{bug.status}</strong>
        </article>
        <article className="kpi-card">
          <p className="muted">Priority</p>
          <strong>{bug.priority}</strong>
        </article>
        <article className="kpi-card">
          <p className="muted">Latest Timeline Entry</p>
          <strong>{latestTimeline?.status || "Not updated"}</strong>
        </article>
      </section>

      {canUpdateStatus ? (
        <section className="card">
          <h3 className="section-title"><AppIcon name="activity" /> Update Status</h3>
          <div className="inline-actions">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Open</option>
              <option>In Progress</option>
              <option>Testing</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
            <button onClick={updateStatus} disabled={savingStatus}>
              {savingStatus ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      ) : (
        <section className="card">
          <h3 className="section-title"><AppIcon name="shield" /> Role Access</h3>
          <p className="muted">
            Your role can review bug details and collaborate through comments, but only Admin and Developer users can change status.
          </p>
        </section>
      )}

      <section className="card">
        <h3 className="section-title"><AppIcon name="stats" /> Status Timeline</h3>
        <ul className="timeline stagger-list">
          {(bug.statusTimeline || []).map((item, idx) => (
            <li key={`${item.status}-${idx}`}>
              <span className="dot" />
              <div>
                <strong>{item.status}</strong>
                <p className="muted">{new Date(item.changedAt).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3 className="section-title"><AppIcon name="team" /> Comments</h3>
        <ul className="comment-list stagger-list">
          {(bug.comments || []).map((item) => (
            <li key={item._id}>
              <strong>{item.userId?.name || "User"}:</strong> {item.comment}
            </li>
          ))}
        </ul>
        <form className="inline-actions" onSubmit={addComment}>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment" />
          <button type="submit" disabled={postingComment || !comment.trim()}>
            {postingComment ? "Posting..." : "Post"}
          </button>
        </form>
      </section>
    </div>
  );
}
