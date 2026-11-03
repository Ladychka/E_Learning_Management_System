import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config";
import { tokenStorage } from "../storage/tokenStorage";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

async function expireSession() {
  await tokenStorage.clear();
  sessionExpiredHandler?.();
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await expireSession();
      return null;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });
      const accessToken = response.data?.data?.accessToken as string | undefined;
      if (!accessToken) {
        await expireSession();
        return null;
      }
      await tokenStorage.save(accessToken, refreshToken);
      return accessToken;
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status === 401 || status === 403) {
        await expireSession();
      }
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const url = config.url || "";
  const isPublicAuthEndpoint =
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password");

  if (!isPublicAuthEndpoint) {
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const url = originalRequest?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.length > 0) return message;
    if (error.code === "ECONNABORTED") {
      return "The request timed out. Check the backend connection.";
    }
    if (!error.response) {
      return "Cannot reach the ELMS server. Check that the backend is running.";
    }
    return `Request failed with status ${error.response.status}.`;
  }
  return "Something went wrong. Please try again.";
}
