import axios, { AxiosInstance } from "axios";

const normalizeUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};

const isDummyUrl = (url?: string) => {
  if (!url) return true;
  return url.includes("your-backend-service") || url.includes("example.com") || url.includes("your-app");
};

const rawBase =
  (!isDummyUrl(process.env.NEXT_PUBLIC_API_URL) ? process.env.NEXT_PUBLIC_API_URL : null) ||
  (typeof window !== "undefined"
    ? "/api/v1"
    : `${(!isDummyUrl(process.env.BACKEND_URL) ? normalizeUrl(process.env.BACKEND_URL) : "") || "http://127.0.0.1:8000"}/api/v1`);

const baseURL = normalizeUrl(rawBase) || rawBase;

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Intercept requests to attach session token if available in browser
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("soilpilot_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle auth expiration cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem("soilpilot_token");
    }
    return Promise.reject(error);
  }
);

export default api;
