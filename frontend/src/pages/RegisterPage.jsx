import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStrongPassword, isValidEmail, isValidName } from "../utils/validation";
import BrandLogo from "../components/ui/BrandLogo";
import AppIcon from "../components/ui/AppIcon";

const VALID_ROLES = new Set(["Admin", "Developer", "Tester"]);

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Tester"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!isValidName(form.name)) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isStrongPassword(form.password)) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!VALID_ROLES.has(form.role)) {
      setError("Choose a valid workspace role.");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/app");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page register-simple">
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <form className="auth-form-plain register-simple__panel" onSubmit={submit}>
        <div className="register-simple__brand">
          <BrandLogo size={48} subtitle="Create Workspace Access" />
        </div>

        <div className="auth-panel-header register-simple__header">
          <p className="auth-panel-kicker">Create Your Account</p>
          <h2>Register for BugSense</h2>
          <p className="muted">Set up your account and choose your workspace role.</p>
        </div>

        <div className="badge-row register-simple__badges">
          <span className="badge-soft">
            <AppIcon name="team" size={14} />
            Role-aware access
          </span>
          <span className="badge-soft">
            <AppIcon name="bug" size={14} />
            Track issues end-to-end
          </span>
        </div>

        {error ? <p className="error auth-form-plain__error">{error}</p> : null}

        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            placeholder="Your name"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Role</span>
          <select value={form.role} onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}>
            <option>Tester</option>
            <option>Developer</option>
            <option>Admin</option>
          </select>
        </label>

        <button type="submit" className="register-simple__submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="auth-switch register-simple__switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
