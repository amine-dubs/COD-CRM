// ============================================================
// COD CRM — Axios API Client
// ============================================================
// Configures a centralized Axios instance with:
// - Base URL from env
// - JWT token auto-injection
// - Store ID header
// - Token refresh on 401
// - CSRF protection via custom header
// - Error normalization
// ============================================================

import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/auth/tokens";

const resolveDefaultApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl;

  // Default to the machine hostname with backend port used by local Apache/XAMPP setups.
  const defaultPort = "8080";
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol || "http:";
    const hostname = window.location.hostname || "localhost";
    return `${protocol}//${hostname}:${defaultPort}/api/v1`;
  }

  return `http://localhost:${defaultPort}/api/v1`;
};

const API_BASE_URL = resolveDefaultApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Request Interceptor ───────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inject access token
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Inject store ID from localStorage
    if (typeof window !== "undefined") {
      const storeId = localStorage.getItem("store_id");
      if (storeId) {
        config.headers["X-Store-Id"] = storeId;
      }

      // CSRF protection: Add custom header that can't be set by forms
      // This prevents CSRF because cross-origin requests with custom headers
      // require CORS preflight, which the server controls
      if (["post", "put", "patch", "delete"].includes(config.method?.toLowerCase() || "")) {
        config.headers["X-Requested-With"] = "XMLHttpRequest";
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor (token refresh) ──────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and we haven't retried yet, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data.data;
        setTokens(access_token, refresh_token);
        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
