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
  const isApiRequest = requestUrl.startsWith("/api/");
  const publicServiceMessage = "Service is temporarily unavailable. Please try again later.";

  if (import.meta.env.PROD && !hasProductionApiBase && isApiRequest) {
    return publicServiceMessage;
  }

  if (error?.code === "ERR_NETWORK") {
    if (import.meta.env.PROD) {
      return publicServiceMessage;
    }
    return "Cannot reach the backend API. Check that the backend is running and the API URL is correct.";
  }

  if (error?.response?.status === 404 && isApiRequest) {
    if (import.meta.env.PROD) {
      return publicServiceMessage;
    }
    return "API route not found. Check the backend deployment URL.";
  }

  return fallbackMessage;
}
