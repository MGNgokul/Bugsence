import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { bugApi } from "../services/bugService";
import AppIcon from "../components/ui/AppIcon";
import AiSuggestionPanel from "../components/ui/AiSuggestionPanel";
import AiAssistantPanel from "../components/ui/AiAssistantPanel";
import { useAuth } from "../context/AuthContext";
import { hasPermission, PERMISSIONS } from "../utils/roles";
import { userApi } from "../services/userService";
import { versionApi } from "../services/versionService";
import { getApiErrorMessage } from "../services/http";
import * as validationUtils from "../utils/validation";

function hasTrackedVersion(value, trackedVersions = []) {
  if (typeof validationUtils.hasTrackedVersion === "function") {
    return validationUtils.hasTrackedVersion(value, trackedVersions);
  }

  // Keep the page usable if the dev server serves a stale validation module during HMR.
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) return true;

  const normalizedVersions = trackedVersions
    .map((item) => (typeof item === "string" ? item : item?.version))
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (normalizedVersions.length === 0) return true;

  return normalizedVersions.includes(normalizedValue);
}

function getMentionHandle(member = {}) {
  const nameParts = String(member.name || "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const emailLocalPart = String(member.email || "").trim().toLowerCase().split("@")[0];

  if (nameParts.length > 1) {
    return nameParts.join(".");
  }

  return emailLocalPart || nameParts[0] || "";
}

function isImageAttachment(item = {}) {
  return String(item.fileType || "").startsWith("image/");
}

function formatFileSize(bytes = 0) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024 * 1024) {
    return `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function BugDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bug, setBug] = useState(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("Open");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [versions, setVersions] = useState([]);
  const [assignment, setAssignment] = useState({ assignedTo: "", deadline: "" });
  const [versionFixed, setVersionFixed] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bugApi.getById(id);
      setBug(data);
      setStatus(data.status);
      setVersionFixed(data.versionFixed || "");
      setAssignment({
        assignedTo: data.assignedTo?._id || data.assignedTo || "",
        deadline: data.deadline ? String(data.deadline).slice(0, 10) : ""
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load bug."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    Promise.all([userApi.list(), versionApi.list()])
      .then(([users, trackedVersions]) => {
        setTeamMembers(users);
        setVersions(trackedVersions);
      })
      .catch(() => {
        setTeamMembers([]);
        setVersions([]);
      });
  }, []);

  async function addComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPostingComment(true);
    setSuccessMessage("");
    try {
      await bugApi.addComment(id, { comment });
      setComment("");
      setSuccessMessage("Comment posted successfully.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not add comment."));
    } finally {
      setPostingComment(false);
    }
  }

  async function updateStatus() {
    if (!hasTrackedVersion(versionFixed, versions)) {
      setError("Version fixed must match a tracked version.");
      return;
    }

    setSavingStatus(true);
    setError("");
    setSuccessMessage("");
    try {
      await bugApi.update(id, { status, versionFixed });
      setSuccessMessage("Bug status updated successfully.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update bug."));
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveAssignment() {
    if (!assignment.assignedTo) {
      setError("Select a team member before saving the assignment.");
      return;
    }

    setAssigning(true);
    setError("");
    setSuccessMessage("");

    try {
      await bugApi.assign(id, assignment);
      setSuccessMessage("Bug assigned successfully.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not assign bug."));
    } finally {
      setAssigning(false);
    }
  }

  async function uploadAttachments(event) {
    event.preventDefault();

    if (attachmentFiles.length === 0) {
      setError("Choose at least one file before uploading.");
      return;
    }

    setUploadingAttachments(true);
    setError("");
    setSuccessMessage("");

    try {
      await bugApi.addAttachments(id, attachmentFiles);
      setAttachmentFiles([]);
      setSuccessMessage("Attachments uploaded successfully.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not upload attachments."));
    } finally {
      setUploadingAttachments(false);
    }
  }

  if (loading) return <p>Loading bug...</p>;
  if (error && !bug) return <p className="error">{error}</p>;
  if (!bug) return <p className="muted">Bug not found.</p>;

  const timelineCount = bug.statusTimeline?.length || 0;
  const commentCount = bug.comments?.length || 0;
  const latestTimeline = timelineCount > 0 ? bug.statusTimeline[timelineCount - 1] : null;
  const canUpdateStatus = hasPermission(user, PERMISSIONS.BUG_STATUS);
  const canAssign = hasPermission(user, PERMISSIONS.BUG_ASSIGN);
  const assignableUsers = teamMembers.filter((member) => member.role === "Developer");
  const currentUserId = user?.id || user?._id || "";
  const attachments = bug.attachments || [];
  const mentionExamples = teamMembers
    .filter((member) => String(member._id) !== String(currentUserId))
    .map(getMentionHandle)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 3);

  return (
    <div className="page-stack">
      <section className="card bug-details-hero">
        {error && <p className="error">{error}</p>}
        {successMessage ? <p className="app-flash app-flash--success app-flash--inline">{successMessage}</p> : null}
        <div className="bug-details-hero__header">
          <h2 className="section-title"><AppIcon name="bug" /> {bug.title}</h2>
          <p className="muted bug-details-hero__description">{bug.description}</p>
        </div>
        <div className="badge-row bug-details-hero__badges">
          <span className="badge-soft"><AppIcon name="activity" size={14} /> Timeline events: {timelineCount}</span>
          <span className="badge-soft"><AppIcon name="team" size={14} /> Comments: {commentCount}</span>
          <span className="badge-soft"><AppIcon name="work" size={14} /> Assignee: {bug.assignedTo?.name || "Unassigned"}</span>
        </div>
        <div className="meta-grid bug-details-meta">
          <article className="bug-details-meta__item">
            <span>Status</span>
            <strong>{bug.status}</strong>
          </article>
          <article className="bug-details-meta__item">
            <span>Priority</span>
            <strong>{bug.priority}</strong>
          </article>
          <article className="bug-details-meta__item">
            <span>Severity</span>
            <strong>{bug.severity}</strong>
          </article>
          <article className="bug-details-meta__item">
            <span>Category</span>
            <strong>{bug.category}</strong>
          </article>
          <article className="bug-details-meta__item">
            <span>Version</span>
            <strong>{bug.versionIntroduced || "N/A"}</strong>
          </article>
          <article className="bug-details-meta__item">
            <span>Version Fixed</span>
            <strong>{bug.versionFixed || "N/A"}</strong>
          </article>
          <article className="bug-details-meta__item">
            <span>Deadline</span>
            <strong>{bug.deadline ? new Date(bug.deadline).toLocaleDateString() : "N/A"}</strong>
          </article>
        </div>
        <div className="bug-details-copy">
          <article className="bug-details-copy__item">
            <h4>Steps to reproduce</h4>
            <p>{bug.stepsToReproduce || "N/A"}</p>
          </article>
          <article className="bug-details-copy__item">
            <h4>Expected result</h4>
            <p>{bug.expectedResult || "N/A"}</p>
          </article>
          <article className="bug-details-copy__item">
            <h4>Actual result</h4>
            <p>{bug.actualResult || "N/A"}</p>
          </article>
        </div>
      </section>

      <section className="card">
        <div className="header-row">
          <div>
            <h3 className="section-title"><AppIcon name="work" /> Attachments</h3>
            <p className="muted">Keep screenshots, logs, and evidence directly on the bug.</p>
          </div>
          <span className="workspace-chip">{attachments.length} file(s)</span>
        </div>

        {attachments.length > 0 ? (
          <ul className="attachment-list stagger-list">
            {attachments.map((item, index) => (
              <li key={`${item.url}-${index}`} className="attachment-card">
                {isImageAttachment(item) ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <img src={item.url} alt={item.originalName || `Attachment ${index + 1}`} />
                  </a>
                ) : (
                  <div className="attachment-card__placeholder">
                    <AppIcon name="work" size={18} />
                    <span>{item.fileType || "File"}</span>
                  </div>
                )}

                <div className="attachment-meta">
                  <strong>{item.originalName || item.fileName || `Attachment ${index + 1}`}</strong>
                  <span className="muted">
                    {formatFileSize(item.fileSize)} / {item.fileType || "Unknown type"}
                  </span>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    Open attachment
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No files uploaded yet. Add screenshots or logs to make debugging easier.</p>
        )}

        <form className="form-grid" onSubmit={uploadAttachments}>
          <label className="field">
            <span>Add more files</span>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.csv,.json,.zip,.mp4"
              onChange={(event) => setAttachmentFiles(Array.from(event.target.files || []))}
            />
          </label>

          {attachmentFiles.length > 0 ? (
            <ul className="attachment-list attachment-list--compact">
              {attachmentFiles.map((file) => (
                <li key={`${file.name}-${file.lastModified}`} className="attachment-card">
                  <div className="attachment-meta">
                    <strong>{file.name}</strong>
                    <span className="muted">
                      {formatFileSize(file.size)} / {file.type || "Unknown type"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <button type="submit" disabled={uploadingAttachments || attachmentFiles.length === 0}>
            {uploadingAttachments ? "Uploading..." : "Upload Attachments"}
          </button>
        </form>
      </section>

      <section id="bug-ai" className="page-stack">
        <AiSuggestionPanel
          suggestion={bug.aiSuggestion}
          title="AI Bug Fix Suggestions"
          subtitle="Structured guidance generated from the current bug report details."
          error={error && bug ? error : ""}
          emptyTitle="No AI fix suggestion available"
          emptyText="Reload the bug details after adding more bug information to generate a stronger suggestion."
        />

        <AiAssistantPanel
          payload={{
            title: bug.title,
            description: bug.description,
            stepsToReproduce: bug.stepsToReproduce,
            expectedResult: bug.expectedResult,
            actualResult: bug.actualResult,
            priority: bug.priority,
            severity: bug.severity,
            category: bug.category,
            versionIntroduced: bug.versionIntroduced,
            versionFixed: bug.versionFixed
          }}
          conversationKey={id}
          title="Ask AI About This Bug"
          subtitle="Use the saved bug details as context and ask follow-up triage questions."
        />
      </section>

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
          <div className="form-grid">
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

            <label className="field">
              <span>Version fixed</span>
              <input
                list="tracked-version-fixed-options"
                value={versionFixed}
                onChange={(e) => {
                  setVersionFixed(e.target.value);
                  setError("");
                }}
                placeholder="Optional resolved version"
              />
              <datalist id="tracked-version-fixed-options">
                {versions.map((item) => (
                  <option key={item._id} value={item.version} />
                ))}
              </datalist>
            </label>
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

      {canAssign ? (
        <section className="card">
          <h3 className="section-title"><AppIcon name="team" /> Assignment</h3>
          <div className="form-grid">
            <div className="split">
              <label className="field">
                <span>Assign to</span>
                <select
                  value={assignment.assignedTo}
                  onChange={(e) => setAssignment((state) => ({ ...state, assignedTo: e.target.value }))}
                >
                  <option value="">Select developer</option>
                  {assignableUsers.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Deadline</span>
                <input
                  type="date"
                  value={assignment.deadline}
                  onChange={(e) => setAssignment((state) => ({ ...state, deadline: e.target.value }))}
                />
              </label>
            </div>

            <button type="button" onClick={saveAssignment} disabled={assigning}>
              {assigning ? "Saving assignment..." : "Save Assignment"}
            </button>
            {assignableUsers.length === 0 ? (
              <p className="muted">No developer accounts are available yet. Create a developer user first.</p>
            ) : null}
          </div>
        </section>
      ) : null}

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
        <p className="muted">
          Mention teammates with <code>@handle</code> to send a direct notification.
          {mentionExamples.length > 0 ? ` Examples: ${mentionExamples.map((item) => `@${item}`).join(", ")}` : ""}
        </p>
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
