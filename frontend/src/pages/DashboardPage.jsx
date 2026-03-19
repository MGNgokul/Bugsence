import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { analyticsApi } from "../services/analyticsService";
import AppIcon from "../components/ui/AppIcon";
import { getApiErrorMessage } from "../services/http";

const colors = {
  Critical: "var(--chart-4)",
  High: "var(--chart-3)",
  Medium: "var(--chart-2)",
  Low: "var(--chart-5)",
  Open: "var(--chart-4)",
  "In Progress": "var(--chart-2)",
  Testing: "var(--chart-3)",
  Resolved: "var(--chart-1)",
  Closed: "var(--chart-5)"
};

const priorityOrder = ["Critical", "High", "Medium", "Low"];
const statusOrder = ["Open", "In Progress", "Testing", "Resolved", "Closed"];

const tooltipStyles = {
  contentStyle: {
    background: "var(--surface-strong)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    color: "var(--text)",
    boxShadow: "var(--shadow-soft)"
  },
  itemStyle: { color: "var(--text)" },
  labelStyle: { color: "var(--text-muted)" }
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");
  const [downloadingReport, setDownloadingReport] = useState("");

  function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const summary = await analyticsApi.summary();
      setData(summary);
    } catch (err) {
      setData(null);
      setError(err?.response?.data?.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function downloadCsvReport() {
    setDownloadingReport("csv");
    setReportError("");

    try {
      const { blob, filename } = await analyticsApi.downloadCsv();
      downloadBlob(blob, filename);
    } catch (err) {
      setReportError(getApiErrorMessage(err, "Could not download analytics report."));
    } finally {
      setDownloadingReport("");
    }
  }

  async function downloadJsonReport() {
    setDownloadingReport("json");
    setReportError("");

    try {
      const report = await analyticsApi.report();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      downloadBlob(blob, `bugsense-analytics-report-${Date.now()}.json`);
    } catch (err) {
      setReportError(getApiErrorMessage(err, "Could not generate analytics report."));
    } finally {
      setDownloadingReport("");
    }
  }

  if (loading) {
    return (
      <section className="card dashboard-state">
        <p className="dashboard-eyebrow">Loading workspace</p>
        <h2 className="section-title">
          <AppIcon name="dashboard" />
          Building your executive overview
        </h2>
        <p className="muted">We are pulling live delivery, backlog, and quality signals now.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card dashboard-state">
        <p className="dashboard-eyebrow">Dashboard unavailable</p>
        <h2 className="section-title">
          <AppIcon name="activity" />
          Analytics could not be loaded
        </h2>
        <p className="error">{error}</p>
        <div className="dashboard-hero-actions">
          <button onClick={load}>Retry</button>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card dashboard-state">
        <p className="dashboard-eyebrow">No data yet</p>
        <h2 className="section-title">
          <AppIcon name="stats" />
          Dashboard data is not available
        </h2>
        <p className="muted">Start reporting issues and the dashboard will begin to populate.</p>
      </section>
    );
  }

  const total = Number(data.total || 0);
  const resolved = Number(data.resolved || 0);
  const pending = Number(data.pending || 0);
  const critical = Number(data.critical || 0);

  const priorityData = priorityOrder
    .map((name) => ({ name, value: Number(data.byPriority?.[name] || 0) }))
    .filter((item) => item.value > 0);

  const statusData = statusOrder
    .map((name) => ({ name, value: Number(data.byStatus?.[name] || 0) }))
    .filter((item) => item.value > 0);

  const resolvedRate = total ? Math.round((resolved / total) * 100) : 0;
  const criticalRate = total ? Math.round((critical / total) * 100) : 0;
  const highPriorityCount = Number(data.byPriority?.High || 0) + Number(data.byPriority?.Critical || 0);
  const backlogPressure = Math.min(100, Math.round((pending / Math.max(total, 1)) * 100));
  const releaseRisk = Math.min(100, Math.round(((critical * 2 + pending) / Math.max(total, 1)) * 100));
  const releaseConfidence = Math.max(0, 100 - releaseRisk);
  const throughputScore = Math.max(0, Math.min(100, Math.round((resolvedRate * 0.75) + ((100 - backlogPressure) * 0.25))));
  const slaPressure = Math.min(100, Math.round((highPriorityCount / Math.max(total, 1)) * 100));
  const activeWork = Math.max(0, total - resolved);
  const priorityLead = priorityData[0]?.name || "Low";
  const dominantStatus = [...statusData].sort((a, b) => b.value - a.value)[0]?.name || "Open";

  const workloadSignal =
    pending > resolved
      ? "Pending load is higher than resolved output. Keep triage disciplined and unblock owners faster."
      : "Resolution pace is keeping up with the backlog. Use this window to close validation loops.";

  const scoreTracks = [
    {
      key: "release-confidence",
      label: "Release confidence",
      value: releaseConfidence,
      note: `${critical} critical and ${pending} pending are influencing launch readiness.`,
      tone: "cyan"
    },
    {
      key: "resolution-pace",
      label: "Resolution pace",
      value: resolvedRate,
      note: `${resolved} of ${total} tracked items are already resolved.`,
      tone: "blue"
    },
    {
      key: "backlog-control",
      label: "Backlog control",
      value: Math.max(0, 100 - backlogPressure),
      note: `${pending} issues are still active in the queue.`,
      tone: "amber"
    }
  ];

  const commandSignals = [
    {
      key: "release-risk",
      title: "Release risk",
      value: `${releaseRisk}%`,
      note: releaseRisk >= 55 ? "Escalate blockers before the next deployment window." : "Risk profile is currently manageable.",
      tone: releaseRisk >= 55 ? "danger" : "good"
    },
    {
      key: "sla-pressure",
      title: "SLA pressure",
      value: `${slaPressure}%`,
      note: `${highPriorityCount} high and critical issues require closer tracking.`,
      tone: slaPressure >= 35 ? "warn" : "good"
    },
    {
      key: "throughput-score",
      title: "Throughput score",
      value: `${throughputScore}%`,
      note: throughputScore >= 60 ? "Team output is aligned with the current load." : "Delivery needs more focus on resolution flow.",
      tone: throughputScore >= 60 ? "good" : "warn"
    }
  ];

  const focusItems = [
    {
      icon: "shield",
      title: "Quality signal",
      body: critical > 0 ? `${critical} critical issue(s) need immediate attention from engineering and QA.` : "No critical issues are open right now."
    },
    {
      icon: "rocket",
      title: "Execution signal",
      body: workloadSignal
    },
    {
      icon: "activity",
      title: "Next checkpoint",
      body: releaseRisk >= 55 ? "Run a focused triage checkpoint before the next release push." : "Use the current stability window to clear testing and close open loops."
    }
  ];

  const topStats = [
    {
      key: "total",
      label: "Tracked issues",
      value: total,
      note: "All issues currently in the system",
      icon: "bug"
    },
    {
      key: "resolved",
      label: "Resolved",
      value: resolved,
      note: `${resolvedRate}% of total volume`,
      icon: "shield"
    },
    {
      key: "active",
      label: "Active work",
      value: activeWork,
      note: "Items still moving through delivery",
      icon: "work"
    },
    {
      key: "critical",
      label: "Critical share",
      value: `${criticalRate}%`,
      note: priorityLead === "Critical" ? "Critical remains the top risk tier" : `${priorityLead} is the current leading priority`,
      icon: "activity"
    }
  ];

  return (
    <div className="dashboard-page stagger-list">
      <section className="card dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">Executive overview</p>
          <h2 className="section-title">
            <AppIcon name="dashboard" />
            Delivery Command Center
          </h2>
          <p className="dashboard-hero-text">
            A cleaner view of release readiness, issue pressure, and team throughput so the dashboard feels more like a
            professional product cockpit and less like a basic stats page.
          </p>

          <div className="badge-row">
            <span className="badge-soft">
              <AppIcon name="shield" size={14} />
              Resolution rate: {resolvedRate}%
            </span>
            <span className="badge-soft">
              <AppIcon name="bug" size={14} />
              Critical share: {criticalRate}%
            </span>
            <span className="badge-soft">
              <AppIcon name="activity" size={14} />
              Dominant status: {dominantStatus}
            </span>
          </div>

          <div className="dashboard-hero-actions">
            <Link className="btn-primary" to="/app/bugs/new">
              <AppIcon name="plus" />
              Report Bug
            </Link>
            <Link className="btn-secondary" to="/app/bugs">
              <AppIcon name="bug" />
              Open Backlog
            </Link>
            <button type="button" className="btn-secondary" onClick={downloadCsvReport} disabled={downloadingReport === "csv"}>
              <AppIcon name="stats" size={14} />
              {downloadingReport === "csv" ? "Preparing CSV..." : "Download CSV"}
            </button>
            <button type="button" className="btn-secondary" onClick={downloadJsonReport} disabled={downloadingReport === "json"}>
              <AppIcon name="shield" size={14} />
              {downloadingReport === "json" ? "Preparing JSON..." : "Download JSON"}
            </button>
          </div>

          {reportError ? <p className="error">{reportError}</p> : null}
        </div>

        <aside className="dashboard-hero-side stagger-list">
          <article className="dashboard-confidence-card">
            <p className="dashboard-panel-label">Release confidence</p>
            <strong>{releaseConfidence}%</strong>
            <span>{releaseRisk >= 55 ? "Needs attention before release" : "Stable enough to keep momentum"}</span>
          </article>

          <div className="dashboard-progress-list stagger-list">
            {scoreTracks.map((item) => (
              <div className="dashboard-progress-item" key={item.key}>
                <div className="dashboard-progress-meta">
                  <p>{item.label}</p>
                  <strong>{item.value}%</strong>
                </div>
                <div className={`dashboard-progress-bar tone-${item.tone}`}>
                  <span style={{ width: `${item.value}%` }} />
                </div>
                <p className="muted">{item.note}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="dashboard-stat-grid stagger-list">
        {topStats.map((item) => (
          <article className="dashboard-stat-card" key={item.key}>
            <div className="dashboard-stat-head">
              <span className="icon-chip">
                <AppIcon name={item.icon} />
              </span>
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            </div>
            <span>{item.note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="card dashboard-panel dashboard-panel--priority">
          <div className="dashboard-panel-head">
            <div>
              <p className="dashboard-panel-label">Priority breakdown</p>
              <h3>Issue distribution by severity</h3>
            </div>
            <span className="badge-soft">High + Critical: {slaPressure}%</span>
          </div>

          <div className="dashboard-priority-layout">
            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={96} paddingAngle={4}>
                    {priorityData.map((entry) => (
                      <Cell key={entry.name} fill={colors[entry.name] || "var(--chart-1)"} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyles} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="dashboard-priority-list">
              {priorityData.map((item) => {
                const share = total ? Math.round((item.value / total) * 100) : 0;
                return (
                  <li key={item.name}>
                    <span className="dashboard-priority-swatch" style={{ background: colors[item.name] || "var(--chart-1)" }} />
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.value} issue(s)</p>
                    </div>
                    <span>{share}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </article>

        <article className="card dashboard-panel dashboard-panel--status">
          <div className="dashboard-panel-head">
            <div>
              <p className="dashboard-panel-label">Workflow flow</p>
              <h3>Status movement overview</h3>
            </div>
            <span className="badge-soft">Lead status: {dominantStatus}</span>
          </div>

          <div className="dashboard-chart-wrap dashboard-chart-wrap--bar">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} allowDecimals={false} />
                <Tooltip {...tooltipStyles} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={colors[entry.name] || "var(--chart-2)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="dashboard-panel-note">
            Most issues are currently sitting in <strong>{dominantStatus}</strong>, which should guide the next delivery checkpoint.
          </p>
        </article>

        <article className="card dashboard-panel dashboard-panel--signals">
          <div className="dashboard-panel-head">
            <div>
              <p className="dashboard-panel-label">Signals</p>
              <h3>What needs attention now</h3>
            </div>
          </div>

          <div className="dashboard-signal-list stagger-list">
            {commandSignals.map((signal) => (
              <article className={`dashboard-signal-card tone-${signal.tone}`} key={signal.key}>
                <p>{signal.title}</p>
                <strong>{signal.value}</strong>
                <span>{signal.note}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="card dashboard-panel dashboard-panel--insights">
          <div className="dashboard-panel-head">
            <div>
              <p className="dashboard-panel-label">Narrative summary</p>
              <h3>Quality and execution insights</h3>
            </div>
          </div>

          <div className="dashboard-insight-list stagger-list">
            {focusItems.map((item) => (
              <div className="dashboard-insight-item" key={item.title}>
                <span className="icon-chip">
                  <AppIcon name={item.icon} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-mini-grid">
            <article>
              <span>Resolved ratio</span>
              <strong>{resolvedRate}%</strong>
            </article>
            <article>
              <span>Open risk</span>
              <strong>{pending + critical}</strong>
            </article>
            <article>
              <span>Team health</span>
              <strong>{critical > 0 ? "Escalate" : "Stable"}</strong>
            </article>
          </div>
        </article>
      </section>
    </div>
  );
}
