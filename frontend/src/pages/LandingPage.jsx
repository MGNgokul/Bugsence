import { useState } from "react";
import { Link } from "react-router-dom";
import AppIcon from "../components/ui/AppIcon";
import BrandLogo from "../components/ui/BrandLogo";

const navigationItems = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Docs", to: "/docs" },
  { label: "Preview", to: "/preview" }
];

const heroMetrics = [
  { value: "5", label: "workflow states" },
  { value: "3", label: "role-based views" },
  { value: "1", label: "shared activity timeline" }
];

const signalCards = [
  {
    title: "Catch blockers before release",
    text: "Track open bugs, triage the backlog, and move work forward before issues pile up near launch.",
    icon: "bug"
  },
  {
    title: "Assign work with clarity",
    text: "Admins can assign owners and deadlines so developers and testers know exactly what happens next.",
    icon: "stats"
  },
  {
    title: "Keep every update visible",
    text: "Status changes, comments, notifications, and AI suggestions stay connected to the same bug record.",
    icon: "shield"
  }
];

const featureCards = [
  {
    title: "Role-aware authentication",
    text: "Separate Admin, Developer, and Tester access keeps every workspace view relevant to the user.",
    icon: "dashboard"
  },
  {
    title: "Backlog and status control",
    text: "Move bugs through Open, In Progress, Testing, Resolved, and Closed without losing context.",
    icon: "activity"
  },
  {
    title: "Comments and activity history",
    text: "Every update is captured in a shared timeline so handoffs are easier across QA and engineering.",
    icon: "work"
  },
  {
    title: "Analytics and AI suggestions",
    text: "Summary insights and fix suggestions help teams prioritize high-impact issues faster.",
    icon: "rocket"
  }
];

const marqueeLogos = [
  "Dashboard",
  "Backlog",
  "My Work",
  "Activity",
  "Notifications",
  "Team",
  "Validation",
  "Analytics"
];

const launchProof = [
  {
    title: "5-stage workflow",
    text: "Move issues from Open to Closed with a clear status path the whole team can follow.",
    icon: "spark"
  },
  {
    title: "Comment and audit trail",
    text: "Bug details, notes, and status updates stay together so context is not lost across handoffs.",
    icon: "bug"
  },
  {
    title: "Built for real teams",
    text: "Admins manage access, developers own fixes, and testers keep validation moving in one workspace.",
    icon: "shield"
  }
];

const marqueeItems = [...marqueeLogos, ...marqueeLogos];

function isValidWorkEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [workEmail, setWorkEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleNavClick() {
    setMenuOpen(false);
  }

  function handleScanSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!isValidWorkEmail(workEmail)) {
      setError("Enter a valid work email to create your workspace.");
      return;
    }

    setSuccess(`Workspace setup is ready for ${workEmail.trim()}. Continue to registration to create your BugSense account.`);
  }

  return (
    <div className="landing-bugsense">
      <div className="landing-bugsense__grid" />
      <div className="landing-bugsense__noise" />
      <div className="landing-bugsense__orb landing-bugsense__orb--one" />
      <div className="landing-bugsense__orb landing-bugsense__orb--two" />

      <header className="landing-bugsense__header">
        <Link className="landing-bugsense__brand" to="/" onClick={handleNavClick}>
          <BrandLogo size={34} subtitle="AI Website Intelligence" />
        </Link>

        <button
          type="button"
          className="landing-bugsense__menu"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          Menu
        </button>

        <div className={`landing-bugsense__nav-wrap ${menuOpen ? "open" : ""}`}>
          <nav className="landing-bugsense__nav" aria-label="Primary">
            {navigationItems.map((item) =>
              item.href ? (
                <a key={item.label} href={item.href} onClick={handleNavClick}>
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.to} onClick={handleNavClick}>
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="landing-bugsense__header-actions">
            <Link className="landing-bugsense__signin" to="/login" onClick={handleNavClick}>
              Sign In
            </Link>
            <Link className="btn-primary landing-bugsense__button landing-bugsense__button--primary" to="/register" onClick={handleNavClick}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-bugsense__main">
        <section className="landing-bugsense__hero" id="top">
          <Link className="landing-bugsense__announcement" to="/preview" onClick={handleNavClick}>
            <span className="landing-bugsense__announcement-icon">
              <AppIcon name="rocket" size={14} />
            </span>
            Preview the workspace
            <span className="landing-bugsense__announcement-text">See dashboard and backlog pages</span>
            <span aria-hidden="true">-&gt;</span>
          </Link>

          <div className="landing-bugsense__hero-copy">
            <h1>
              Track Bugs Clearly
              <span>Move Every Issue</span>
              <em>From Report to Release</em>
            </h1>

            <p>
              BugSense gives Admin, Developer, and Tester teams one shared workspace for bug reports, assignments,
              comments, analytics, notifications, and release-ready status tracking.
            </p>
          </div>

          <div className="landing-bugsense__hero-actions">
            <Link className="btn-primary landing-bugsense__button landing-bugsense__button--primary" to="/register">
              Start Free Trial
            </Link>
            <a className="btn-secondary landing-bugsense__button landing-bugsense__button--secondary" href="#how-it-works" onClick={handleNavClick}>
              See How It Works
            </a>
          </div>

          <p className="landing-bugsense__hero-meta">Role-aware workspace / Fast setup / Built for full-stack bug tracking</p>

          <div className="landing-bugsense__scan-card" id="demo">
            <p className="landing-bugsense__scan-kicker">
              <AppIcon name="spark" size={14} />
              Create your free BugSense workspace in 60 seconds
            </p>

            <form className="landing-bugsense__scan-form" onSubmit={handleScanSubmit} noValidate>
              <input
                type="email"
                value={workEmail}
                onChange={(event) => setWorkEmail(event.target.value)}
                placeholder="team@company.com"
                aria-label="Work email"
              />
              <button type="submit" className="landing-bugsense__scan-submit">
                Create Workspace
              </button>
            </form>

            <p className="landing-bugsense__scan-meta">No credit card / Admin, Developer, Tester roles / Dashboard ready after signup</p>
            {error ? <p className="prx-form-error">{error}</p> : null}
            {success ? <p className="prx-form-success">{success}</p> : null}
          </div>

          <div className="landing-bugsense__metrics">
            {heroMetrics.map((item, index) => (
              <article key={item.label} style={{ animationDelay: `${0.2 + index * 0.08}s` }}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-bugsense__comparison" id="how-it-works">
          <div className="landing-bugsense__section-head landing-bugsense__section-head--center">
            <p className="landing-bugsense__eyebrow">Bug workflow</p>
            <h2>
              Your release has blockers <span>you can&apos;t track.</span>
              BugSense makes them visible.
            </h2>
            <p>From missing repro steps to unclear ownership, the app keeps every bug actionable from report to validation.</p>
          </div>

          <div className="landing-bugsense__demo-stage">
            <div className="landing-bugsense__demo-tag landing-bugsense__demo-tag--broken">Open Bug</div>
            <div className="landing-bugsense__demo-tag landing-bugsense__demo-tag--fixed">Resolved Flow</div>
            <div className="landing-bugsense__demo-divider" />

            <article className="landing-bugsense__phone landing-bugsense__phone--broken">
              <div className="landing-bugsense__phone-topbar">
                <span>Bug #142</span>
                <span className="landing-bugsense__phone-nav landing-bugsense__phone-nav--broken">Open</span>
              </div>
              <div className="landing-bugsense__phone-media landing-bugsense__phone-media--broken">
                <div className="landing-bugsense__phone-image-token" />
                <p>Steps incomplete</p>
              </div>
              <div className="landing-bugsense__phone-title landing-bugsense__phone-title--broken">
                Login issue reported without clear reproduction details
              </div>
              <div className="landing-bugsense__phone-action landing-bugsense__phone-action--broken">
                <span className="landing-bugsense__phone-button">Needs Triage</span>
                <span className="landing-bugsense__phone-side-action">
                  <AppIcon name="work" size={14} />
                </span>
              </div>
              <div className="landing-bugsense__phone-review landing-bugsense__phone-review--broken">
                No assignee / No deadline / Priority unclear
              </div>
            </article>

            <article className="landing-bugsense__phone landing-bugsense__phone--fixed">
              <div className="landing-bugsense__phone-topbar">
                <span>Bug #142</span>
                <div className="landing-bugsense__phone-links">
                  <span>Testing</span>
                  <span>Owner</span>
                  <span>QA</span>
                </div>
              </div>
              <div className="landing-bugsense__phone-media landing-bugsense__phone-media--fixed">
                <div className="landing-bugsense__phone-image-token landing-bugsense__phone-image-token--fixed" />
                <p>Repro confirmed</p>
              </div>
              <div className="landing-bugsense__phone-title">Issue tracked with owner, timeline, comments, and validation notes</div>
              <div className="landing-bugsense__phone-action">
                <span className="landing-bugsense__phone-button landing-bugsense__phone-button--fixed">Ready for QA</span>
                <span className="landing-bugsense__phone-side-action landing-bugsense__phone-side-action--fixed">
                  <AppIcon name="shield" size={14} />
                </span>
              </div>
              <div className="landing-bugsense__phone-review">Assigned to Developer / Deadline set / Status logged</div>
            </article>
          </div>

          <div className="landing-bugsense__signal-grid">
            {signalCards.map((item, index) => (
              <article key={item.title} className="landing-bugsense__signal-card" style={{ animationDelay: `${0.12 + index * 0.08}s` }}>
                <span className="icon-chip">
                  <AppIcon name={item.icon} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-bugsense__workflow" id="features">
          <div className="landing-bugsense__section-head">
            <div>
              <p className="landing-bugsense__eyebrow">Project modules</p>
              <h2>Everything your bug-tracking project needs in one workflow.</h2>
            </div>
            <p>
              The landing page now tells the same story as the product itself: dashboard visibility, structured bug
              reports, assignments, team roles, activity history, and guided validation.
            </p>
          </div>

          <div className="landing-bugsense__marquee">
            <div className="landing-bugsense__marquee-track">
              {marqueeItems.map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          </div>

          <div className="landing-bugsense__feature-grid">
            {featureCards.map((item, index) => (
              <article key={item.title} className="landing-bugsense__feature-card" style={{ animationDelay: `${0.14 + index * 0.06}s` }}>
                <span className="icon-chip">
                  <AppIcon name={item.icon} />
                </span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-bugsense__cta" id="pricing">
          <div className="landing-bugsense__cta-copy">
            <p className="landing-bugsense__eyebrow">Start your workspace</p>
            <h2>Keep bug reports, ownership, and release progress in one place.</h2>
            <p>
              Build a cleaner bug management flow with authentication, backlog control, role-based access, and a
              polished interface that matches the actual features inside your app.
            </p>

            <div className="landing-bugsense__hero-actions">
              <Link className="btn-primary landing-bugsense__button landing-bugsense__button--primary" to="/register">
                Start 7-Day Trial
              </Link>
              <Link className="btn-secondary landing-bugsense__button landing-bugsense__button--secondary" to="/preview">
                Open Preview
              </Link>
            </div>
          </div>

          <div className="landing-bugsense__proof-grid">
            {launchProof.map((item, index) => (
              <article key={item.title} className="landing-bugsense__proof-card" style={{ animationDelay: `${0.18 + index * 0.08}s` }}>
                <span className="icon-chip">
                  <AppIcon name={item.icon} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-bugsense__footer">
        <p>BugSense helps Admin, Developer, and Tester teams report bugs, assign work, and ship fixes with better visibility.</p>
        <div>
          <a href="#how-it-works" onClick={handleNavClick}>
            How It Works
          </a>
          <a href="#features" onClick={handleNavClick}>
            Features
          </a>
          <Link to="/docs">Docs</Link>
          <Link to="/login">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
