import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000" : undefined);
const hasProductionApiBase = Boolean(import.meta.env.VITE_API_BASE_URL);

export const http = axios.create(baseURL ? { baseURL } : {});

http.interceptors.request.use((config) => {
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

  if (import.meta.env.PROD && !hasProductionApiBase && requestUrl.startsWith("/api/")) {
    return "Live API not configured. Deploy the backend and set VITE_API_BASE_URL in GitHub Actions secrets.";
  }

  if (error?.code === "ERR_NETWORK") {
    return "Cannot reach the backend API. Check that the backend is running and the API URL is correct.";
  }

  if (error?.response?.status === 404 && requestUrl.startsWith("/api/")) {
    return "API route not found. Check the backend deployment URL.";
  }

  return fallbackMessage;
}
