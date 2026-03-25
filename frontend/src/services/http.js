import axios from "axios";

function normalizeBaseUrl(value) {
  return typeof value === "string" ? value.replace(/\/+$/, "") : "";
}

function getRuntimeEnv(overrideEnv) {
  return overrideEnv || import.meta.env || {};
}

function getConfiguredApiBaseUrl(overrideEnv) {
  return normalizeBaseUrl(getRuntimeEnv(overrideEnv).VITE_API_BASE_URL);
}

export function isProductionApiConfigured(overrideEnv) {
  const env = getRuntimeEnv(overrideEnv);
  return !env.PROD || Boolean(getConfiguredApiBaseUrl(overrideEnv));
}

export function getProductionApiSetupMessage(overrideEnv) {
  if (isProductionApiConfigured(overrideEnv)) {
    return "";
  }

  return "Live login is not connected yet. Set VITE_API_BASE_URL in GitHub Actions secrets or repository variables to your deployed backend URL and redeploy the frontend.";
}

function getDevApiCandidates() {
  if (typeof window === "undefined") return [];

  const candidates = [configuredApiBaseUrl, window.location.origin];
  const hostnames = [window.location.hostname, "localhost", "127.0.0.1"].filter(Boolean);
  const ports = ["5008", "5000"];

  for (const port of ports) {
    for (const hostname of hostnames) {
      candidates.push(`http://${hostname}:${port}`);
    }
  }

  return [...new Set(candidates.map(normalizeBaseUrl).filter(Boolean))];
}

async function probeApiBaseUrl(candidate) {
  const response = await axios.get(`${candidate}/api/health`, {
    timeout: 1200,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  });

  if (!response?.data?.ok) {
    throw new Error("Backend health check failed");
  }

  return candidate;
}

let devApiBaseUrlPromise;

async function resolveDevApiBaseUrl() {
  if (!getRuntimeEnv().DEV) {
    return getConfiguredApiBaseUrl() || undefined;
  }

  const configuredApiBaseUrl = getConfiguredApiBaseUrl();

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (!devApiBaseUrlPromise) {
    devApiBaseUrlPromise = Promise.any(getDevApiCandidates().map(probeApiBaseUrl)).catch(() => undefined);
  }

  return devApiBaseUrlPromise;
}

const configuredApiBaseUrl = getConfiguredApiBaseUrl();
export const http = axios.create(configuredApiBaseUrl ? { baseURL: configuredApiBaseUrl } : {});

http.interceptors.request.use(async (config) => {
  if (!config.baseURL && getRuntimeEnv().DEV && typeof config.url === "string" && config.url.startsWith("/api/")) {
    const devApiBaseUrl = await resolveDevApiBaseUrl();
    if (devApiBaseUrl) {
      config.baseURL = devApiBaseUrl;
    }
  }

  config.headers["Cache-Control"] = "no-cache";
  config.headers.Pragma = "no-cache";
  const token = localStorage.getItem("bugsense_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiErrorMessage(error, fallbackMessage = "Request failed") {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;

  const requestUrl = String(error?.config?.url || "");
  const isApiRequest = requestUrl.startsWith("/api/");
  const publicServiceMessage = "Service is temporarily unavailable. Please try again later.";
  const env = getRuntimeEnv();

  if (env.PROD && !Boolean(getConfiguredApiBaseUrl()) && isApiRequest) {
    return publicServiceMessage;
  }

  if (error?.code === "ERR_NETWORK") {
    if (env.PROD) {
      return publicServiceMessage;
    }
    return "Cannot reach the backend API. Start the backend and set VITE_API_BASE_URL if it is not on a local default port.";
  }

  if (error?.response?.status === 404 && isApiRequest) {
    if (env.PROD) {
      return publicServiceMessage;
    }
    return "API route not found. Check the backend deployment URL.";
  }

  return fallbackMessage;
}
