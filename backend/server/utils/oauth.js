const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");

function normalizeUrl(value) {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function isStrongPassword(password) {
  return typeof password === "string" && password.trim().length >= 6;
}

function isValidName(name) {
  return typeof name === "string" && name.trim().length >= 2;
}

function buildUrl(base, pathname) {
  const url = new URL(base);
  const basePath = url.pathname.replace(/\/+$/, "");
  const nextPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  url.pathname = `${basePath}${nextPath}`.replace(/\/{2,}/g, "/");
  url.search = "";
  url.hash = "";
  return url;
}

function getBackendBaseUrl(req) {
  const configured = normalizeUrl(process.env.SERVER_URL || process.env.API_PUBLIC_URL);
  if (configured) return configured;

  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProtocol || req.protocol || "http";
  const host = forwardedHost || req.get("host");

  return `${protocol}://${host}`;
}

function getClientBaseUrl(req) {
  const configured = normalizeUrl(process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.APP_URL);
  if (configured) return configured;

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:5173";
  }

  const requestOrigin = normalizeUrl(req.headers.origin);
  return requestOrigin || getBackendBaseUrl(req);
}

function getProviderConfig(provider, req) {
  const common = {
    google: {
      label: "Google",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    github: {
      label: "GitHub",
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    }
  }[provider];

  if (!common) return null;

  const missing = Object.entries({
    ...(provider === "google"
      ? {
          GOOGLE_CLIENT_ID: common.clientId,
          GOOGLE_CLIENT_SECRET: common.clientSecret
        }
      : {
          GITHUB_CLIENT_ID: common.clientId,
          GITHUB_CLIENT_SECRET: common.clientSecret
        })
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const callbackUrl = buildUrl(getBackendBaseUrl(req), `/api/auth/${provider}/callback`).toString();
  const startUrl = buildUrl(getBackendBaseUrl(req), `/api/auth/${provider}/start`).toString();

  return {
    ...common,
    provider,
    callbackUrl,
    startUrl,
    enabled: missing.length === 0,
    missing
  };
}

function getProviderStatus(req) {
  return {
    google: getProviderConfig("google", req),
    github: getProviderConfig("github", req)
  };
}

function getStateSecret() {
  return process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || "bugsense_oauth_state";
}

function signStatePayload(encodedPayload) {
  return crypto.createHmac("sha256", getStateSecret()).update(encodedPayload).digest("base64url");
}

function createOAuthState(provider) {
  const payload = Buffer.from(
    JSON.stringify({
      provider,
      issuedAt: Date.now()
    })
  ).toString("base64url");

  return `${payload}.${signStatePayload(payload)}`;
}

function verifyOAuthState(state, provider) {
  if (typeof state !== "string" || !state.includes(".")) {
    throw new Error("OAuth state is missing or invalid.");
  }

  const [payload, signature] = state.split(".");
  const expectedSignature = signStatePayload(payload);

  if (!payload || !signature || signature.length !== expectedSignature.length) {
    throw new Error("OAuth state signature is invalid.");
  }

  const isValidSignature = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!isValidSignature) {
    throw new Error("OAuth state signature is invalid.");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

  if (parsed.provider !== provider) {
    throw new Error("OAuth provider mismatch.");
  }

  if (!parsed.issuedAt || Date.now() - parsed.issuedAt > 10 * 60 * 1000) {
    throw new Error("OAuth state has expired.");
  }

  return parsed;
}

async function createGeneratedPassword() {
  return bcrypt.hash(crypto.randomUUID(), 10);
}

async function resolveOAuthUser({ provider, providerId, email, name, avatar }) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("The provider did not return a valid email address.");
  }

  let user = await User.findOne({ email: normalizedEmail });

  if (!user && providerId) {
    user = await User.findOne({
      authProvider: provider,
      providerId: String(providerId)
    });
  }

  if (!user) {
    user = new User({
      name: isValidName(name) ? name.trim() : normalizedEmail.split("@")[0],
      email: normalizedEmail,
      password: await createGeneratedPassword(),
      role: "Tester",
      authProvider: provider,
      providerId: providerId ? String(providerId) : undefined,
      avatar
    });
  } else {
    user.email = normalizedEmail;
    user.name = isValidName(name) ? name.trim() : user.name;
    user.authProvider = provider;
    user.providerId = providerId ? String(providerId) : user.providerId;
    if (avatar) {
      user.avatar = avatar;
    }

    if (!user.password) {
      user.password = await createGeneratedPassword();
    }
  }

  await user.save();
  return user;
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
    authProvider: user.authProvider || "local"
  };
}

function buildClientLoginUrl(req, params = {}) {
  const url = buildUrl(getClientBaseUrl(req), "/login");

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
  });

  return url.toString();
}

module.exports = {
  buildClientLoginUrl,
  getProviderConfig,
  getProviderStatus,
  createOAuthState,
  verifyOAuthState,
  resolveOAuthUser,
  sanitizeUser,
  normalizeEmail,
  isValidEmail,
  isStrongPassword,
  isValidName
};
