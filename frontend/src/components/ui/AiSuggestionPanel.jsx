import AppIcon from "./AppIcon";

export default function AiSuggestionPanel({
  suggestion,
  title = "AI Fix Suggestions",
  subtitle = "",
  actionLabel = "",
  onAction,
  actionDisabled = false,
  actionBusy = false,
  error = "",
  emptyTitle = "No suggestions yet",
  emptyText = "Generate suggestions to inspect likely causes, fix steps, and validation checks."
}) {
  return (
    <section className="card ai-suggestion-panel">
      <div className="header-row ai-suggestion-panel__header">
        <div>
          <h3 className="section-title">
            <AppIcon name="spark" />
            {title}
          </h3>
          {subtitle ? <p className="muted ai-suggestion-panel__subtitle">{subtitle}</p> : null}
        </div>

        {onAction ? (
          <button type="button" className="btn-secondary ai-suggestion-panel__action" onClick={onAction} disabled={actionDisabled || actionBusy}>
            <AppIcon name={actionBusy ? "activity" : "spark"} size={14} colorful={false} />
            {actionBusy ? "Working..." : actionLabel}
          </button>
        ) : null}
      </div>

      {error ? <p className="error ai-suggestion-panel__error">{error}</p> : null}

      {!suggestion ? (
        <div className="empty-state ai-suggestion-panel__empty">
          <strong>{emptyTitle}</strong>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="ai-suggestion-panel__content">
          <article className="ai-suggestion-panel__summary">
            <div>
              <p className="command-title">Summary</p>
              <strong>{suggestion.summary}</strong>
            </div>
            <div className="badge-row ai-suggestion-panel__badges">
              <span className="badge-soft">Confidence: {suggestion.confidence}</span>
              {suggestion.source ? <span className="badge-soft">Source: {suggestion.source}</span> : null}
              {suggestion.model ? <span className="badge-soft">Model: {suggestion.model}</span> : null}
            </div>
          </article>

          <div className="ai-suggestion-panel__grid">
            <article className="mini-card ai-suggestion-panel__card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name="activity" />
                </span>
                <h4>Likely Cause</h4>
              </div>
              <p>{suggestion.likelyCause}</p>
            </article>

            <article className="mini-card ai-suggestion-panel__card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name="stats" />
                </span>
                <h4>Signals</h4>
              </div>
              <ul className="ai-suggestion-panel__list">
                {(suggestion.signals || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="ai-suggestion-panel__grid">
            <article className="mini-card ai-suggestion-panel__card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name="rocket" />
                </span>
                <h4>Suggested Fix Steps</h4>
              </div>
              <ul className="ai-suggestion-panel__list">
                {(suggestion.fixes || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="mini-card ai-suggestion-panel__card">
              <div className="mini-card-head">
                <span className="icon-chip">
                  <AppIcon name="shield" />
                </span>
                <h4>Validation Checks</h4>
              </div>
              <ul className="ai-suggestion-panel__list">
                {(suggestion.validationChecks || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
