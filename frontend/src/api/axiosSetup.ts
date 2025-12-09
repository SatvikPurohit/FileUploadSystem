// src/api/axiosSetup.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { tokenStore } from "../tokenStore";
import { callRefresh } from "./authClient";

/**
 * Expectations:
 *  - callRefresh(): Promise<{ accessToken?: string } | string | null>
 *      - Server reads HttpOnly refresh cookie and returns { accessToken } (or token string)
 *  - tokenStore.get()/set()/clear() manage in-memory/localStorage token
 */

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "",
  // set default so you don't have to pass withCredentials everywhere
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookieString = document.cookie;
  if (!cookieString) return null;
  const cookies = cookieString.split("; ");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=");
    if (cookieName === name) return decodeURIComponent(cookieValue || "");
  }
  return null;
}

/* ---- Request interceptor ---- */
api.interceptors.request.use((config) => {
  // ensure cookies are sent (also set on instance but keep it here to be explicit)
  config.withCredentials = true;

  // Add Authorization header from tokenStore (if present)
  const token = tokenStore.get();
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  // Add CSRF header on state-changing methods (if you use one)
  const method = (config.method || "get").toUpperCase();
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (isStateChanging && config.headers) {
    const csrf = readCookie("csrf_token");
    if (csrf) config.headers["x-csrf-token"] = csrf;
  }

  return config;
});

/* ---- Refresh queue to serialize concurrent refresh attempts ---- */
let isRefreshing = false;
type Pending = {
  resolve: (token?: string | null) => void;
  reject: (err?: any) => void;
};
let pending: Pending[] = [];

function processPending(err: any | null, token?: string | null) {
  pending.forEach((p) => {
    if (err) p.reject(err);
    else p.resolve(token);
  });
  pending = [];
}

/* ---- Response interceptor ---- */
api.interceptors.response.use(
  (res) => res,
  async (
    error: AxiosError & { config?: AxiosRequestConfig & { _retry?: boolean } }
  ) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    const url = original.url || "";
    const isAuthEndpoint =
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/verify-status");

    // Only attempt refresh on 401 and not on auth endpoints
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      // If a refresh is already in progress, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pending.push({
            resolve: (token?: string | null) => {
              if (!token) return reject(error);
              if (original.headers)
                original.headers["Authorization"] = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      // mark and start refresh
      original._retry = true;
      isRefreshing = true;

      try {
        // IMPORTANT: callRefresh should use plain axios (server-side reads HttpOnly cookie)
        const refreshResp = await callRefresh(); // you implement this
        // callRefresh returns the new access token (string) or { accessToken }
        const newAccess =
          typeof refreshResp === "string"
            ? refreshResp
            : (refreshResp && (refreshResp as any).accessToken) || null;

        if (!newAccess) {
          throw new Error("refresh did not return access token");
        }

        // persist in token store
        tokenStore.set(newAccess);

        // resolve queued requests
        processPending(null, newAccess);

        // set header and retry original
        if (original.headers)
          original.headers["Authorization"] = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        processPending(e, null);
        // on refresh failure, clear token and force a navigation to login
        tokenStore.clear();
        // small delay to let current stack finish; then redirect
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
