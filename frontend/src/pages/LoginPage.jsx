import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStrongPassword, isValidEmail } from "../utils/validation";
import BrandLogo from "../components/ui/BrandLogo";
import AppIcon from "../components/ui/AppIcon";
import { getApiErrorMessage } from "../services/http";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!isStrongPassword(form.password)) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/app");
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page login-simple">
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <form className="auth-form-plain login-simple__panel" onSubmit={submit}>
        <div className="login-simple__brand">
          <BrandLogo size={48} subtitle="Secure Workspace Login" />
        </div>

        <div className="auth-panel-header login-simple__header">
          <p className="auth-panel-kicker">Welcome Back</p>
          <h2>Login to BugSense</h2>
          <p className="muted">Enter your email and password to continue.</p>
        </div>

        {error ? <p className="error auth-form-plain__error login-simple__error">{error}</p> : null}

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
          <div className="login-simple__password">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              required
            />
            <button
              type="button"
              className="login-simple__toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <p className="login-simple__validation-note">Password must be at least 6 characters.</p>

        <button type="submit" className="login-simple__submit" disabled={loading}>
          <AppIcon name={loading ? "activity" : "rocket"} size={16} colorful={false} />
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="auth-switch login-simple__switch">
          Don&apos;t have an account? <Link to="/register">Create account</Link>
        </p>
      </form>
    </div>
  );
}
