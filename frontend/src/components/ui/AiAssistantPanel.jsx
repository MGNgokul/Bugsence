import { useEffect, useState } from "react";
import { bugApi } from "../../services/bugService";
import AppIcon from "./AppIcon";

const DEFAULT_PROMPTS = [
  "What is the likely root cause?",
  "Which fix step should I try first?",
  "How should I validate this bug?",
  "What detail is missing from this report?"
];

function normalizeText(value) {
  return String(value || "").trim();
}

function createMessage(role, text, meta = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    text: normalizeText(text),
    confidence: meta.confidence || "",
    source: meta.source || "",
    model: meta.model || "",
    followUps: Array.isArray(meta.followUps) ? meta.followUps.filter(Boolean).slice(0, 4) : []
  };
}

function toHistoryEntry(message) {
  return {
    role: message.role,
    text: normalizeText(message.text)
  };
}

export default function AiAssistantPanel({
  payload = {},
  title = "Ask BugSense AI",
  subtitle = "Ask follow-up questions about likely cause, fix path, risk, or validation.",
  conversationKey = "default",
  promptSuggestions = DEFAULT_PROMPTS,
  emptyTitle = "Start a bug triage chat",
  emptyText = "Use this like a small bug-focused ChatGPT. Ask about root cause, first fix, missing details, or validation steps."
}) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMessages([]);
    setQuestion("");
    setError("");
    setLoading(false);
  }, [conversationKey]);

  const latestAssistantMessage = messages
    .slice()
    .reverse()
    .find((item) => item.role === "assistant");

  const promptChips = (
    latestAssistantMessage?.followUps?.length ? latestAssistantMessage.followUps : promptSuggestions
  )
    .filter(Boolean)
    .slice(0, 4);

  const hasContext = ["title", "description", "stepsToReproduce", "actualResult"].some((field) =>
    normalizeText(payload?.[field])
  );

  async function askQuestion(rawQuestion) {
    const nextQuestion = normalizeText(rawQuestion ?? question);

    if (!nextQuestion || loading) {
      return;
    }

    const userMessage = createMessage("user", nextQuestion);
    const history = messages.map(toHistoryEntry).slice(-6);

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const data = await bugApi.askAssistant({
        ...payload,
        question: nextQuestion,
        history
      });
      const answer = data?.answer;

      setMessages((current) => [
        ...current,
        createMessage("assistant", answer?.reply || "I could not generate an answer for this bug right now.", {
          confidence: answer?.confidence,
          source: answer?.source,
          model: answer?.model,
          followUps: answer?.followUps
        })
      ]);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not generate an AI bug answer.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    askQuestion();
  }

  function clearChat() {
    setMessages([]);
    setQuestion("");
    setError("");
  }

  return (
    <section className="card ai-assistant-panel">
      <div className="header-row ai-assistant-panel__header">
        <div>
          <h3 className="section-title">
            <AppIcon name="chat" />
            {title}
          </h3>
          {subtitle ? <p className="muted ai-assistant-panel__subtitle">{subtitle}</p> : null}
        </div>

        {messages.length > 0 ? (
          <button type="button" className="btn-secondary ai-assistant-panel__clear" onClick={clearChat} disabled={loading}>
            Clear Chat
          </button>
        ) : null}
      </div>

      {error ? <p className="error ai-assistant-panel__error">{error}</p> : null}

      {!hasContext ? (
        <p className="muted ai-assistant-panel__hint">
          Add at least a title or description for stronger bug identification.
        </p>
      ) : null}

      {messages.length === 0 ? (
        <div className="empty-state ai-assistant-panel__empty">
          <strong>{emptyTitle}</strong>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="ai-assistant-panel__messages">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`ai-assistant-panel__message ai-assistant-panel__message--${message.role}`}
            >
              <div className="ai-assistant-panel__message-head">
                <strong>{message.role === "assistant" ? "BugSense AI" : "You"}</strong>
                {message.role === "assistant" ? (
                  <div className="badge-row ai-assistant-panel__message-badges">
                    {message.confidence ? <span className="badge-soft">Confidence: {message.confidence}</span> : null}
                    {message.source ? <span className="badge-soft">Source: {message.source}</span> : null}
                    {message.model ? <span className="badge-soft">Model: {message.model}</span> : null}
                  </div>
                ) : null}
              </div>
              <p>{message.text}</p>
            </article>
          ))}

          {loading ? (
            <article className="ai-assistant-panel__message ai-assistant-panel__message--assistant ai-assistant-panel__message--loading">
              <div className="ai-assistant-panel__message-head">
                <strong>BugSense AI</strong>
              </div>
              <p>Reviewing the bug details...</p>
            </article>
          ) : null}
        </div>
      )}

      {promptChips.length > 0 ? (
        <div className="ai-assistant-panel__chips">
          {promptChips.map((item, index) => (
            <button
              key={`${item}-${index}`}
              type="button"
              className="ai-assistant-panel__chip"
              onClick={() => askQuestion(item)}
              disabled={loading}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <form className="ai-assistant-panel__composer" onSubmit={handleSubmit}>
        <label className="field ai-assistant-panel__field">
          <span>Ask a bug question</span>
          <textarea
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: What is the most likely root cause of this bug?"
          />
        </label>
        <button type="submit" disabled={loading || !normalizeText(question)}>
          <AppIcon name={loading ? "activity" : "chat"} size={14} colorful={false} />
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </form>
    </section>
  );
}
