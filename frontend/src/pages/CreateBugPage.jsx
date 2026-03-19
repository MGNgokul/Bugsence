import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { bugApi } from "../services/bugService";
import { validateBugForm } from "../utils/validation";
import AppIcon from "../components/ui/AppIcon";
import AiTriagePanel from "../components/ui/AiTriagePanel";
import AiSuggestionPanel from "../components/ui/AiSuggestionPanel";
import AiAssistantPanel from "../components/ui/AiAssistantPanel";
import { versionApi } from "../services/versionService";

const CATEGORY_OPTIONS = ["UI Bug", "Backend Bug", "Performance Issue", "Security Bug", "Database Bug", "Other"];

export default function CreateBugPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    stepsToReproduce: "",
    expectedResult: "",
    actualResult: "",
    priority: "Medium",
    severity: "Medium",
    category: "",
    versionIntroduced: ""
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState(null);
  const [triageError, setTriageError] = useState("");
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionError, setSuggestionError] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [versions, setVersions] = useState([]);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    versionApi.list().then(setVersions).catch(() => setVersions([]));
  }, []);

  useEffect(() => {
    const title = String(form.title || "").trim();
    const description = String(form.description || "").trim();

    if (title.length < 5 && description.length < 15) {
      setDuplicateMatches([]);
      setDuplicateError("");
      setCheckingDuplicates(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      setDuplicateError("");

      try {
        const data = await bugApi.previewDuplicates({ title, description });
        if (!active) return;
        setDuplicateMatches(data?.duplicates || []);
      } catch (err) {
        if (!active) return;
        setDuplicateMatches([]);
        setDuplicateError(err?.response?.data?.message || "Could not check for duplicate bugs.");
      } finally {
        if (active) {
          setCheckingDuplicates(false);
        }
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.title, form.description]);

  useEffect(() => {
    const title = String(form.title || "").trim();
    const description = String(form.description || "").trim();
    const actualResult = String(form.actualResult || "").trim();

    if (title.length < 5 && description.length < 15 && actualResult.length < 3) {
      setTriage(null);
      setTriageError("");
      setLoadingTriage(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoadingTriage(true);
      setTriageError("");

      try {
        const data = await bugApi.previewTriage(form);
        if (!active) return;
        setTriage(data?.triage || null);
      } catch (err) {
        if (!active) return;
        setTriage(null);
        setTriageError(err?.response?.data?.message || "Could not generate AI triage recommendations.");
      } finally {
        if (active) {
          setLoadingTriage(false);
        }
      }
    }, 550);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    form.title,
    form.description,
    form.stepsToReproduce,
    form.expectedResult,
    form.actualResult,
    form.versionIntroduced
  ]);

  function updateField(field, value) {
    setForm((state) => ({ ...state, [field]: value }));
    setSubmitError("");
    setTriageError("");
    setSuggestionError("");
    setSuggestion(null);
    setErrors((state) => {
      if (!state[field]) return state;
      const next = { ...state };
      delete next[field];
      return next;
    });
  }

  function applyTriageRecommendation() {
    if (!triage) return;

    setForm((state) => ({
      ...state,
      category: triage.category || state.category,
      priority: triage.priority || state.priority,
      severity: triage.severity || state.severity
    }));
    setSubmitError("");
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    const validation = validateBugForm(form, versions);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setLoading(true);
    try {
      const data = await bugApi.create({
        ...form,
        attachments
      });
      navigate(`/app/bugs/${data._id}`);
    } catch (err) {
      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
      setSubmitError(err?.response?.data?.message || "Could not create bug report.");
    } finally {
      setLoading(false);
    }
  }

  async function previewSuggestion() {
    const validation = validateBugForm(form, versions);
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      setSuggestion(null);
      setSuggestionError("Complete the required bug fields before generating AI bug fix suggestions.");
      return;
    }

    setSuggestionError("");
    setLoadingSuggestion(true);

    try {
      const data = await bugApi.previewSuggestion(form);
      setSuggestion(data?.suggestion || null);
    } catch (err) {
      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
      setSuggestion(null);
      setSuggestionError(err?.response?.data?.message || "Could not generate AI fix suggestions.");
    } finally {
      setLoadingSuggestion(false);
    }
  }

  const canPreviewSuggestion = !loading && !loadingSuggestion;

  return (
    <div className="page-stack">
      <section className="card">
        <h2 className="section-title"><AppIcon name="plus" /> Report Bug</h2>
        <p className="muted">Provide complete details so the assigned developer can reproduce and resolve quickly.</p>
        <div className="interactive-grid stagger-list">
          <article className="mini-card">
            <span className="icon-chip"><AppIcon name="bug" /></span>
            <h4>Repro Steps Matter</h4>
            <p>Clear steps cut investigation time and improve assignment accuracy.</p>
          </article>
          <article className="mini-card">
            <span className="icon-chip"><AppIcon name="shield" /></span>
            <h4>Expected vs Actual</h4>
            <p>Capturing both outcomes helps teams identify regression boundaries fast.</p>
          </article>
          <article className="mini-card">
            <span className="icon-chip"><AppIcon name="stats" /></span>
            <h4>Priority + Severity</h4>
            <p>Use both to communicate risk and scheduling urgency correctly.</p>
          </article>
        </div>
      </section>

      <form className="card form-grid" onSubmit={submit}>
        {submitError && <p className="error">{submitError}</p>}

        <label className="field">
          <span>Bug title</span>
          <input
            required
            placeholder="Login form freezes after submit"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
          />
          {errors.title && <small className="error">{errors.title}</small>}
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            required
            placeholder="Describe what goes wrong and how often it happens."
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
          />
          {errors.description && <small className="error">{errors.description}</small>}
        </label>

        <label className="field">
          <span>Steps to reproduce</span>
          <textarea
            placeholder="1. Open login page 2. Submit credentials 3. Observe spinner never ends"
            value={form.stepsToReproduce}
            onChange={(e) => updateField("stepsToReproduce", e.target.value)}
          />
          {errors.stepsToReproduce && <small className="error">{errors.stepsToReproduce}</small>}
        </label>

        <label className="field">
          <span>Expected result</span>
          <input
            placeholder="User should be redirected to dashboard"
            value={form.expectedResult}
            onChange={(e) => updateField("expectedResult", e.target.value)}
          />
          {errors.expectedResult && <small className="error">{errors.expectedResult}</small>}
        </label>

        <label className="field">
          <span>Actual result</span>
          <input
            placeholder="Page hangs and API times out"
            value={form.actualResult}
            onChange={(e) => updateField("actualResult", e.target.value)}
          />
          {errors.actualResult && <small className="error">{errors.actualResult}</small>}
        </label>

        <div className="split">
          <label className="field">
            <span>Version introduced</span>
            <input
              list="tracked-version-options"
              placeholder="e.g. 1.2.0"
              value={form.versionIntroduced}
              onChange={(e) => updateField("versionIntroduced", e.target.value)}
            />
            <datalist id="tracked-version-options">
              {versions.map((item) => (
                <option key={item._id} value={item.version} />
              ))}
            </datalist>
            {errors.versionIntroduced && <small className="error">{errors.versionIntroduced}</small>}
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={form.priority} onChange={(e) => updateField("priority", e.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>
        </div>

        <div className="split">
          <label className="field">
            <span>Severity</span>
            <select value={form.severity} onChange={(e) => updateField("severity", e.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>

          <label className="field">
            <span>Category</span>
            <select value={form.category} onChange={(e) => updateField("category", e.target.value)}>
              <option value="">Auto-detect</option>
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Attachments and screenshots</span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.csv,.json,.zip,.mp4"
            onChange={(e) => setAttachments(Array.from(e.target.files || []))}
          />
          <small className="muted">Add up to 5 files. Images, PDF, TXT, CSV, JSON, ZIP, and MP4 are supported.</small>
          {attachments.length > 0 ? (
            <ul className="attachment-list attachment-list--compact">
              {attachments.map((file) => (
                <li key={`${file.name}-${file.lastModified}`} className="attachment-card">
                  <div className="attachment-meta">
                    <strong>{file.name}</strong>
                    <span className="muted">
                      {(file.size / 1024 / 1024).toFixed(2)} MB / {file.type || "Unknown type"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Bug"}
        </button>
      </form>

      <AiTriagePanel
        triage={triage}
        loading={loadingTriage}
        error={triageError}
        onApply={applyTriageRecommendation}
        applyDisabled={
          !triage ||
          (form.category === triage.category && form.priority === triage.priority && form.severity === triage.severity)
        }
      />

      {checkingDuplicates || duplicateError || duplicateMatches.length > 0 ? (
        <section className="card">
          <div className="header-row">
            <div>
              <h3 className="section-title"><AppIcon name="bug" /> Possible Duplicates</h3>
              <p className="muted">Review similar bugs before creating a new report.</p>
            </div>
            {checkingDuplicates ? <span className="workspace-chip">Checking...</span> : null}
          </div>

          {duplicateError ? <p className="error">{duplicateError}</p> : null}

          {!duplicateError && duplicateMatches.length > 0 ? (
            <ul className="comment-list stagger-list">
              {duplicateMatches.map((item) => (
                <li key={item._id}>
                  <strong>{item.title}</strong>
                  <p>
                    Similarity: {item.duplicateScore}% / Status: {item.status} / Priority: {item.priority}
                  </p>
                  <p className="muted">
                    {item.versionIntroduced ? `Introduced in ${item.versionIntroduced} / ` : ""}
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recently created"}
                  </p>
                  <div className="quick-actions">
                    <Link className="btn-secondary" to={`/app/bugs/${item._id}`}>
                      Open bug
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <AiSuggestionPanel
        suggestion={suggestion}
        title="AI Bug Fix Suggestions"
        subtitle="Generate a fix direction and validation checks from a complete bug report before saving."
        actionLabel="Generate Suggestions"
        onAction={previewSuggestion}
        actionDisabled={!canPreviewSuggestion}
        actionBusy={loadingSuggestion}
        error={suggestionError}
        emptyTitle="Preview suggestions before you submit"
        emptyText="Complete the title, description, reproduction steps, expected result, and actual result to generate AI fix suggestions."
      />

      <AiAssistantPanel
        payload={form}
        conversationKey="create-bug-draft"
        title="Ask AI About This Draft Bug"
        subtitle="Chat with the assistant while writing the report to identify likely cause, missing details, or best next checks."
      />
    </div>
  );
}
