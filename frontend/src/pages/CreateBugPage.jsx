import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { bugApi } from "../services/bugService";
import { validateBugForm } from "../utils/validation";
import AppIcon from "../components/ui/AppIcon";
import AiSuggestionPanel from "../components/ui/AiSuggestionPanel";

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
    versionIntroduced: ""
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionError, setSuggestionError] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  function updateField(field, value) {
    setForm((state) => ({ ...state, [field]: value }));
    setSubmitError("");
    setSuggestionError("");
    setSuggestion(null);
    setErrors((state) => {
      if (!state[field]) return state;
      const next = { ...state };
      delete next[field];
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    const validation = validateBugForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setLoading(true);
    try {
      const data = await bugApi.create(form);
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
    const validation = validateBugForm(form);
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
              placeholder="e.g. 1.2.0"
              value={form.versionIntroduced}
              onChange={(e) => updateField("versionIntroduced", e.target.value)}
            />
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

        <label className="field">
          <span>Severity</span>
          <select value={form.severity} onChange={(e) => updateField("severity", e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Bug"}
        </button>
      </form>

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
    </div>
  );
}
