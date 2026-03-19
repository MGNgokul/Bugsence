import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/authService";
import { isStrongPassword, isValidEmail } from "../utils/validation";
import BrandLogo from "../components/ui/BrandLogo";
import AppIcon from "../components/ui/AppIcon";
import { getApiErrorMessage } from "../services/http";

const DEFAULT_PROVIDERS = {
  google: {
    enabled: false,
    label: "Google",
    startUrl: "",
    missing: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
  },
  github: {
    enabled: false,
    label: "GitHub",
    startUrl: "",
    missing: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]
  }
};

function SocialMark({ provider }) {
  if (provider === "google") {
    return (
      <svg className="login-simple__social-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12.2 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-6.9 0-.7-.1-1.4-.2-2.1Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.4-4.1l-3.2 2.5A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#4A90E2"
          d="M6.6 13.9a6 6 0 0 1 0-3.8L3.4 7.6a10 10 0 0 0 0 8.8Z"
        />
        <path
          fill="#FBBC05"
          d="M12 6c1.4 0 2.7.5 3.7 1.4l2.8-2.8A10 10 0 0 0 3.4 7.6l3.2 2.5C7.3 7.7 9.5 6 12 6Z"
        />
      </svg>
    );
  }

  return (
    <svg className="login-simple__social-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .6C5.7.6.8 5.5.8 11.8c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.3-3.3-.1-.3-.6-1.5.1-3.1 0 0 1-.3 3.4 1.3a12 12 0 0 1 6.2 0c2.3-1.6 3.4-1.3 3.4-1.3.7 1.6.3 2.8.1 3.1.8.9 1.3 2 1.3 3.3 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6a11.2 11.2 0 0 0 7.9-10.9C23.2 5.5 18.3.6 12 .6Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { login, completeSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const handledSocialRedirect = useRef(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [providerLoading, setProviderLoading] = useState(true);

  useEffect(() => {
    let active = true;

    authApi
      .providers()
      .then((data) => {
        if (!active) return;

        setProviders({
          ...DEFAULT_PROVIDERS,
          ...(data?.providers || {})
        });
      })
      .catch(() => {
        if (!active) return;
        setProviders(DEFAULT_PROVIDERS);
      })
      .finally(() => {
        if (active) {
          setProviderLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (handledSocialRedirect.current) return;

    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const userParam = params.get("user");
    const authError = params.get("authError");

    if (!token && !userParam && !authError) return;

    handledSocialRedirect.current = true;

    if (authError) {
      setError(authError);
      navigate("/login", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(userParam || "{}");

      if (!token || !user?.id) {
        throw new Error("Invalid social login payload.");
      }

      completeSession({ token, user });
      navigate("/app", { replace: true });
    } catch (_err) {
      setError("Could not complete social sign-in.");
      navigate("/login", { replace: true });
    }
  }, [completeSession, location.search, navigate]);

  const emailValid = isValidEmail(form.email);
  const passwordValid = isStrongPassword(form.password);

  function updateField(field, value) {
    setForm((state) => ({ ...state, [field]: value }));
    setError("");
  }

  function startSocialSignIn(provider) {
    const config = providers[provider];

    if (!config?.enabled || !config?.startUrl) {
      setError(`${config?.label || provider} sign-in is not configured yet.`);
      return;
    }

    window.location.assign(config.startUrl);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }

    if (!passwordValid) {
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
          <p className="muted">Use email login or continue with Google and GitHub.</p>
        </div>

        {error ? <p className="error auth-form-plain__error login-simple__error">{error}</p> : null}

        <div className="login-simple__social-stack">
          <button
            type="button"
            className="login-simple__social"
            disabled={loading || providerLoading || !providers.google?.enabled}
            onClick={() => startSocialSignIn("google")}
          >
            <SocialMark provider="google" />
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            className="login-simple__social"
            disabled={loading || providerLoading || !providers.github?.enabled}
            onClick={() => startSocialSignIn("github")}
          >
            <SocialMark provider="github" />
            <span>Continue with GitHub</span>
          </button>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
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
              onChange={(event) => updateField("password", event.target.value)}
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
