import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppIcon from "../components/ui/AppIcon";
import BrandLogo from "../components/ui/BrandLogo";

const freeProviders = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "proton.me"];

export default function MarketingInfoPage({ title, subtitle, points = [], icon = "spark" }) {
  const interactivePoints = points.length > 0 ? points : ["Enterprise-grade workflow clarity"];
  const [activePoint, setActivePoint] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const activeContent = interactivePoints[activePoint] || interactivePoints[0];

  const stats = useMemo(
    () => [
      { label: "Execution clarity", value: "92%" },
      { label: "Pilot rollout", value: "2 weeks" },
      { label: "Cycle gain", value: "+18%" }
    ],
    []
  );

  const detailCards = useMemo(
    () => [
      {
        title: "Business impact",
        text: `${title} becomes easier to explain to leadership because the experience is cleaner and the signal hierarchy is stronger.`
      },
      {
        title: "Operational impact",
        text: "Teams spend less time decoding status and more time acting on it across QA, product, and engineering."
      },
      {
        title: "Design impact",
        text: "The layout uses more intentional spacing, contrast, and responsive behavior to feel premium on any screen."
      }
    ],
    [title]
  );

  function validate(payload) {
    const nextErrors = {};
    const trimmedName = payload.name.trim();
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedMessage = payload.message.trim();

    if (trimmedName.length < 2) nextErrors.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email.";
    } else if (freeProviders.includes(trimmedEmail.split("@")[1])) {
      nextErrors.email = "Use a work email domain.";
    }
    if (trimmedMessage.length < 10) nextErrors.message = "Message should be at least 10 characters.";

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setSuccess("");

    if (Object.keys(nextErrors).length > 0) return;

    setSuccess("Validated and submitted. Our team will contact you shortly.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="marketing-page">
      <div className="marketing-bg-grid" />

      <header className="marketing-header">
        <BrandLogo size={32} subtitle={`${title} Brief`} />
        <div className="marketing-actions">
          <Link className="btn-secondary" to="/">Back to Landing</Link>
          <Link className="btn-secondary" to="/login">Login</Link>
          <Link className="btn-primary" to="/register">Start Free</Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div>
          <p className="marketing-chip">ENTERPRISE UX REFRESH</p>
          <h1 className="section-title">
            <AppIcon name={icon} />
            {title}
          </h1>
          <p>{subtitle}</p>
          <div className="badge-row">
            <span className="badge-soft">Responsive layout</span>
            <span className="badge-soft">Interactive content</span>
            <span className="badge-soft">Professional color balance</span>
          </div>
        </div>

        <article className="marketing-panel marketing-hero-panel">
          <p className="marketing-eyebrow">Why it feels stronger now</p>
          <h3>Built to read like a modern MNC product page.</h3>
          <p>
            This section pairs cooler trust tones with warmer call-to-action accents so the page feels premium, structured,
            and easier to scan.
          </p>
          <ul className="marketing-facts">
            <li>Clear information hierarchy for busy teams</li>
            <li>Interactive modules instead of flat text blocks</li>
            <li>Balanced contrast for desktop and mobile use</li>
          </ul>
        </article>
      </section>

      <section className="marketing-stats">
        {stats.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="marketing-interactive">
        <aside className="marketing-points">
          {interactivePoints.map((point, index) => (
            <button
              key={point}
              type="button"
              className={activePoint === index ? "active" : ""}
              onClick={() => setActivePoint(index)}
            >
              <AppIcon name="shield" size={14} />
              <span>{point}</span>
            </button>
          ))}
        </aside>

        <article className="marketing-panel">
          <p className="marketing-eyebrow">Focused detail</p>
          <h3>{activeContent}</h3>
          <p>
            {activeContent} becomes more valuable when the surrounding interface is visually calmer, easier to navigate,
            and intentionally responsive for every role.
          </p>

          <div className="marketing-detail-grid">
            {detailCards.map((card) => (
              <div key={card.title} className="mini-card">
                <span className="icon-chip">
                  <AppIcon name="spark" />
                </span>
                <h4>{card.title}</h4>
                <p>{card.text}</p>
              </div>
            ))}
          </div>

          <details>
            <summary>How teams use it</summary>
            <p>Teams apply this in triage rituals, status transitions, and release planning checkpoints.</p>
          </details>
          <details>
            <summary>Why the redesign matters</summary>
            <p>Professional interfaces reduce friction because users can find the right information faster and trust the product more.</p>
          </details>
        </article>
      </section>

      <section className="marketing-form-block">
        <div>
          <p className="marketing-eyebrow">Validated request</p>
          <h3>Tell us what your team needs.</h3>
          <p>
            Share the workflow, scale, or rollout challenge you are solving and we will follow up with the right next step.
          </p>
        </div>

        <form className="marketing-form" onSubmit={handleSubmit} noValidate>
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
          />
          {errors.name ? <p className="marketing-error">{errors.name}</p> : null}

          <input
            type="email"
            placeholder="Work email"
            value={form.email}
            onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
          />
          {errors.email ? <p className="marketing-error">{errors.email}</p> : null}

          <textarea
            placeholder="Tell us what you need..."
            value={form.message}
            onChange={(event) => setForm((state) => ({ ...state, message: event.target.value }))}
          />
          {errors.message ? <p className="marketing-error">{errors.message}</p> : null}

          <button type="submit">Submit Request</button>
          {success ? <p className="marketing-success">{success}</p> : null}
        </form>
      </section>
    </div>
  );
}
