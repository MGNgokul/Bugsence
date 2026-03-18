import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const http = axios.create({
  baseURL
});

http.interceptors.request.use((config) => {
  config.headers["Cache-Control"] = "no-cache";
  config.headers.Pragma = "no-cache";
  const token = localStorage.getItem("bugsense_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
