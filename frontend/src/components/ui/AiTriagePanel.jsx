import AppIcon from "./AppIcon";

export default function AiTriagePanel({
  triage,
  title = "AI Triage Recommendation",
  subtitle = "Identify the likely category and recommended risk level before saving the bug.",
  loading = false,
  error = "",
  onApply,
  applyDisabled = false,
  emptyTitle = "AI triage appears here as you write",
  emptyText = "Add a stronger title, description, or actual result to generate a category, priority, and severity recommendation."
}) {
  return (
    <section className="card ai-triage-panel">
      <div className="header-row ai-triage-panel__header">
        <div>
          <h3 className="section-title">
            <AppIcon name="spark" />
            {title}
          </h3>
          {subtitle ? <p className="muted ai-triage-panel__subtitle">{subtitle}</p> : null}
        </div>

        <div className="badge-row ai-triage-panel__status">
          {loading ? <span className="workspace-chip">Analyzing...</span> : null}
          {triage && onApply ? (
            <button type="button" className="btn-secondary ai-triage-panel__apply" onClick={onApply} disabled={applyDisabled}>
              Apply Recommendation
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="error ai-triage-panel__error">{error}</p> : null}

      {!triage ? (
        <div className="empty-state ai-triage-panel__empty">
          <strong>{emptyTitle}</strong>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="ai-triage-panel__content">
          <article className="ai-triage-panel__summary">
            <div>
              <p className="command-title">Recommendation</p>
              <strong>{triage.summary}</strong>
              <p>{triage.rationale}</p>
            </div>
            <div className="badge-row ai-triage-panel__badges">
              <span className="badge-soft">Confidence: {triage.confidence}</span>
              {triage.source ? <span className="badge-soft">Source: {triage.source}</span> : null}
              {triage.model ? <span className="badge-soft">Model: {triage.model}</span> : null}
            </div>
          </article>

          <div className="ai-triage-panel__grid">
            <article className="mini-card ai-triage-panel__card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name="bug" />
                </span>
                <h4>Category</h4>
              </div>
              <strong>{triage.category}</strong>
            </article>

            <article className="mini-card ai-triage-panel__card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name="stats" />
                </span>
                <h4>Priority</h4>
              </div>
              <strong>{triage.priority}</strong>
            </article>

            <article className="mini-card ai-triage-panel__card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name="shield" />
                </span>
                <h4>Severity</h4>
              </div>
              <strong>{triage.severity}</strong>
            </article>
          </div>

          <article className="mini-card ai-triage-panel__signals-card">
            <div className="mini-card-head">
              <span className="icon-chip">
                <AppIcon name="activity" />
              </span>
              <h4>Signals</h4>
            </div>
            <ul className="ai-triage-panel__signals">
              {(triage.signals || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}
