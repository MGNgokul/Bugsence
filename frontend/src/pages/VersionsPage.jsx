import { useEffect, useState } from "react";
import AppIcon from "../components/ui/AppIcon";
import { versionApi } from "../services/versionService";
import { getApiErrorMessage } from "../services/http";
import { useAuth } from "../context/AuthContext";
import * as validationUtils from "../utils/validation";

const EMPTY_FORM = {
  version: "",
  releaseDate: "",
  changes: ""
};

function normalizeForm(item = EMPTY_FORM) {
  return {
    version: item.version || "",
    releaseDate: item.releaseDate ? String(item.releaseDate).slice(0, 10) : "",
    changes: item.changes || ""
  };
}

function validateVersionForm(form) {
  if (typeof validationUtils.validateVersionForm === "function") {
    return validationUtils.validateVersionForm(form);
  }

  // Keep the page usable if the dev server serves a stale validation module during HMR.
  const errors = {};
  const version = String(form.version || "").trim();
  const changes = String(form.changes || "").trim();
  const releaseDate = String(form.releaseDate || "").trim();

  if (!version) {
    errors.version = "Version name is required.";
  } else if (version.length > 50) {
    errors.version = "Version name must be 50 characters or fewer.";
  }

  if (releaseDate && Number.isNaN(new Date(releaseDate).getTime())) {
    errors.releaseDate = "Release date must be a valid date.";
  }

  if (changes.length > 2000) {
    errors.changes = "Release notes must be 2000 characters or fewer.";
  }

  return errors;
}

export default function VersionsPage() {
  const { user } = useAuth();
  const [versions, setVersions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingReleaseId, setUpdatingReleaseId] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const canManage = user?.role === "Admin";

  async function load() {
    setLoading(true);
    setError("");

    try {
      setVersions(await versionApi.list());
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load versions."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(field, value) {
    setForm((state) => ({ ...state, [field]: value }));
    setError("");
    setFieldErrors((state) => {
      if (!state[field]) return state;
      const next = { ...state };
      delete next[field];
      return next;
    });
  }

  function resetForm() {
    setEditingId("");
    setForm(EMPTY_FORM);
    setFieldErrors({});
  }

  function beginEdit(item) {
    setEditingId(item._id);
    setForm(normalizeForm(item));
    setError("");
    setFieldErrors({});
  }

  async function submit(event) {
    event.preventDefault();
    const validation = validateVersionForm(form);
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        const updated = await versionApi.update(editingId, form);
        setVersions((state) => state.map((item) => (item._id === editingId ? updated : item)));
      } else {
        const created = await versionApi.create(form);
        setVersions((state) => [created, ...state]);
      }
      resetForm();
    } catch (err) {
      if (err?.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setError(getApiErrorMessage(err, "Could not save version."));
    } finally {
      setSaving(false);
    }
  }

  async function removeVersion(item) {
    if (!window.confirm(`Delete version ${item.version}?`)) return;

    setError("");
    try {
      await versionApi.remove(item._id);
      setVersions((state) => state.filter((entry) => entry._id !== item._id));
      if (editingId === item._id) resetForm();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete version."));
    }
  }

  async function toggleReleaseReady(item, releaseReady) {
    setUpdatingReleaseId(item._id);
    setError("");

    try {
      const updated = await versionApi.setReleaseReady(item._id, releaseReady);
      setVersions((state) => state.map((entry) => (entry._id === item._id ? updated : entry)));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update release readiness."));
    } finally {
      setUpdatingReleaseId("");
    }
  }

  function getReleasePillClass(item) {
    const status = item.releaseReadiness?.status;

    if (status === "Ready") return "pill-low";
    if (status === "Eligible") return "pill-medium";
    return "pill-high";
  }

  const trackedCount = versions.length;
  const referencedCount = versions.filter((item) => item.totalUsage > 0).length;
  const releaseReadyCount = versions.filter((item) => item.releaseReadiness?.isCurrentlyReady).length;

  return (
    <div className="page-stack">
      <section className="card header-row">
        <div>
          <h2 className="section-title"><AppIcon name="stats" /> Version Tracking</h2>
          <p className="muted">Track release versions, release dates, and bug references in one place.</p>
        </div>
        {canManage ? (
          <button className="btn-secondary" type="button" onClick={resetForm}>
            {editingId ? "New Version" : "Reset"}
          </button>
        ) : null}
      </section>

      {!loading && !error ? (
        <section className="kpi-row stagger-list">
          <article className="kpi-card">
            <p className="muted">Tracked Versions</p>
            <strong>{trackedCount}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Referenced by Bugs</p>
            <strong>{referencedCount}</strong>
          </article>
          <article className="kpi-card">
            <p className="muted">Release Ready</p>
            <strong>{releaseReadyCount}</strong>
          </article>
        </section>
      ) : null}

      {canManage ? (
        <form className="card form-grid" onSubmit={submit}>
          <div className="header-row">
            <div>
              <h3 className="section-title"><AppIcon name="plus" /> {editingId ? "Edit Version" : "Add Version"}</h3>
              <p className="muted">Maintain the version catalogue used across bug reporting and release tracking.</p>
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="split">
            <label className="field">
              <span>Version</span>
              <input
                value={form.version}
                onChange={(event) => updateField("version", event.target.value)}
                placeholder="e.g. 2.4.0"
                required
              />
              {fieldErrors.version ? <small className="error">{fieldErrors.version}</small> : null}
            </label>

            <label className="field">
              <span>Release date</span>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(event) => updateField("releaseDate", event.target.value)}
              />
              {fieldErrors.releaseDate ? <small className="error">{fieldErrors.releaseDate}</small> : null}
            </label>
          </div>

          <label className="field">
            <span>Changes</span>
            <textarea
              value={form.changes}
              onChange={(event) => updateField("changes", event.target.value)}
              placeholder="Short release notes or key changes."
            />
            {fieldErrors.changes ? <small className="error">{fieldErrors.changes}</small> : null}
          </label>

          <div className="inline-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Version" : "Create Version"}
            </button>
            {editingId ? (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <section className="card">
          {error ? <p className="error">{error}</p> : null}
          <p className="muted">You can view tracked versions here. Only Admin users can create, edit, or delete them.</p>
        </section>
      )}

      <section className="card">
        {loading ? <p className="muted">Loading versions...</p> : null}
        {!loading && error && !canManage ? <p className="error">{error}</p> : null}
        {!loading && !error && versions.length === 0 ? <p className="muted">No versions have been tracked yet.</p> : null}

        {!loading && !error && versions.length > 0 ? (
          <div className="smart-table-wrap">
            <table className="table smart-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Release Date</th>
                  <th>Release Gate</th>
                  <th>Gate Notes</th>
                  <th>Changes</th>
                  <th>Introduced</th>
                  <th>Fixed</th>
                  <th>Total Usage</th>
                  {canManage ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody className="stagger-list">
                {versions.map((item) => (
                  <tr key={item._id}>
                    <td>{item.version}</td>
                    <td>{item.releaseDate ? new Date(item.releaseDate).toLocaleDateString() : "Not set"}</td>
                    <td>
                      <span className={`pill ${getReleasePillClass(item)}`}>
                        {item.releaseReadiness?.status || "Blocked"}
                      </span>
                    </td>
                    <td>
                      {item.releaseReadiness?.blockingReasons?.[0]
                        || (item.releaseReadiness?.isCurrentlyReady
                          ? "Approved and clear to ship."
                          : item.releaseReadiness?.canMarkReady
                            ? "Ready for admin approval."
                            : "Waiting on release checks.")}
                    </td>
                    <td>{item.changes || "No release notes"}</td>
                    <td>{item.introducedCount || 0}</td>
                    <td>{item.fixedCount || 0}</td>
                    <td>{item.totalUsage || 0}</td>
                    {canManage ? (
                      <td>
                        <div className="quick-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => toggleReleaseReady(item, !item.releaseReadiness?.markedReady)}
                            disabled={
                              updatingReleaseId === item._id
                              || (!item.releaseReadiness?.markedReady && !item.releaseReadiness?.canMarkReady)
                            }
                          >
                            {updatingReleaseId === item._id
                              ? "Saving..."
                              : item.releaseReadiness?.markedReady
                                ? "Clear Ready"
                                : "Mark Ready"}
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => beginEdit(item)}>
                            Edit
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => removeVersion(item)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
