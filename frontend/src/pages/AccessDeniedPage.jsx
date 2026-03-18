import { Link } from "react-router-dom";
import AppIcon from "../components/ui/AppIcon";

export default function AccessDeniedPage() {
  return (
    <section className="card access-card">
      <p className="dashboard-eyebrow">Access limited</p>
      <h2 className="section-title">
        <AppIcon name="shield" />
        This area is not available for your role
      </h2>
      <p className="muted">
        Your current workspace role does not include this section. Use the dashboard or bug workspace pages that match your
        responsibilities.
      </p>
      <div className="dashboard-hero-actions">
        <Link className="btn-primary" to="/app">Go to Dashboard</Link>
        <Link className="btn-secondary" to="/app/bugs">Open Bugs</Link>
      </div>
    </section>
  );
}
