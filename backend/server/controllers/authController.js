const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const {
  buildClientLoginUrl,
  createOAuthState,
  getProviderConfig,
  getProviderStatus,
  isStrongPassword,
  isValidEmail,
  isValidName,
  normalizeEmail,
  resolveOAuthUser,
  sanitizeUser,
  verifyOAuthState
} = require("../utils/oauth");

async function requestJson(url, options, fallbackMessage) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_err) {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data.error_description || data.message || fallbackMessage);
  }

  return data;
}

function getOAuthConfigOrThrow(provider, req) {
  const config = getProviderConfig(provider, req);

  if (!config?.enabled) {
    throw new Error(`${config?.label || provider} sign-in is not configured on the server.`);
  }

  return config;
}

function redirectOAuthError(res, req, provider, message) {
  res.redirect(buildClientLoginUrl(req, { authError: message, provider }));
}

async function register(req, res, next) {
  try {
    const { role } = req.body;
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (!isValidName(name)) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already exists." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "Tester",
      authProvider: "local"
    });

    res.status(201).json({
      user: sanitizeUser(user),
      token: signToken(user._id)
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials." });

    res.json({
      user: sanitizeUser(user),
      token: signToken(user._id)
    });
  } catch (err) {
    next(err);
  }
}

function providers(req, res) {
  res.json({ providers: getProviderStatus(req) });
}

function startGoogle(req, res) {
  try {
    const config = getOAuthConfigOrThrow("google", req);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", createOAuthState("google"));

    res.redirect(url.toString());
  } catch (err) {
    res.status(503).json({ message: err.message });
  }
}

function startGitHub(req, res) {
  try {
    const config = getOAuthConfigOrThrow("github", req);
    const url = new URL("https://github.com/login/oauth/authorize");

    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.callbackUrl);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", createOAuthState("github"));

    res.redirect(url.toString());
  } catch (err) {
    res.status(503).json({ message: err.message });
  }
}

async function googleCallback(req, res) {
  try {
    const config = getOAuthConfigOrThrow("google", req);
    const code = String(req.query.code || "");
    verifyOAuthState(String(req.query.state || ""), "google");

    if (!code) {
      throw new Error("Google did not return an authorization code.");
    }

    const tokenData = await requestJson(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.callbackUrl,
          grant_type: "authorization_code"
        })
      },
      "Google token exchange failed."
    );

    const profile = await requestJson(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      },
      "Google profile lookup failed."
    );

    const user = await resolveOAuthUser({
      provider: "google",
      providerId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatar: profile.picture
    });

    res.redirect(
      buildClientLoginUrl(req, {
        token: signToken(user._id),
        user: sanitizeUser(user),
        provider: "google"
      })
    );
  } catch (err) {
    redirectOAuthError(res, req, "google", err.message || "Google sign-in failed.");
  }
}

async function githubCallback(req, res) {
  try {
    const config = getOAuthConfigOrThrow("github", req);
    const code = String(req.query.code || "");
    verifyOAuthState(String(req.query.state || ""), "github");

    if (!code) {
      throw new Error("GitHub did not return an authorization code.");
    }

    const tokenData = await requestJson(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl
        })
      },
      "GitHub token exchange failed."
    );

    const profile = await requestJson(
      "https://api.github.com/user",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "BugSense"
        }
      },
      "GitHub profile lookup failed."
    );

    let email = profile.email;

    if (!email) {
      const emails = await requestJson(
        "https://api.github.com/user/emails",
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${tokenData.access_token}`,
            "User-Agent": "BugSense"
          }
        },
        "GitHub email lookup failed."
      );

      const primaryEmail =
        emails.find((item) => item.primary && item.verified) ||
        emails.find((item) => item.verified) ||
        emails[0];

      email = primaryEmail?.email;
    }

    const user = await resolveOAuthUser({
      provider: "github",
      providerId: profile.id,
      email,
      name: profile.name || profile.login,
      avatar: profile.avatar_url
    });

    res.redirect(
      buildClientLoginUrl(req, {
        token: signToken(user._id),
        user: sanitizeUser(user),
        provider: "github"
      })
    );
  } catch (err) {
    redirectOAuthError(res, req, "github", err.message || "GitHub sign-in failed.");
  }
}

async function profile(req, res) {
  res.json({ user: req.user });
}

module.exports = {
  register,
  login,
  providers,
  startGoogle,
  googleCallback,
  startGitHub,
  githubCallback,
  profile
};
