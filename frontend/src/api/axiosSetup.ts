import { tokenStore } from "../tokenStore";
import { callRefresh } from "./authClient";
import api from "./axios";

type QueueItem = {
  resolve: (token?: string | null) => void;
  reject: (err?: any) => void;
};

export function readCookie(name: string): string | null {
  const cookieString = document.cookie;

  if (!cookieString) {
    return null;
  }

  const cookies = cookieString.split("; ");

  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }

  return null;
}

let isRefreshing = false;
let queue: QueueItem[] = [];

function processQueue(err: any | null, token?: string | null) {
  queue.forEach((p) => {
    if (err) p.reject(err);
    else p.resolve(token);
  });
  queue = [];
}

api.interceptors.request.use((config) => {
  // ensure cookies are sent
  config.withCredentials = true;

  // Authorization from in-memory store (optional)
  const token = tokenStore.get();
  if (token && config.headers)
    config.headers["Authorization"] = `Bearer ${token}`;

  // Add CSRF header for state-changing requests
  const method = (config.method || "get").toUpperCase();
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isStateChanging && config.headers) {
    const csrf = readCookie("csrf_token");
    if (csrf) {
      config.headers["x-csrf-token"] = csrf;
    } else {
      // optional: helpful dev warning without being noisy in prod
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("No CSRF cookie found; server may reject this request");
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    const url = original.url || "";
    const isAuthEndpoint =
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/verify-status");

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          queue.push({
            resolve: (token?: string | null) => {
              if (original.headers)
                original.headers["Authorization"] = "Bearer " + token;
              resolve(api(original));
            },
            reject,
          })
        );
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const newAccess = await callRefresh(); // server reads refresh cookie and returns new access
        processQueue(null, newAccess);
        if (original.headers)
          original.headers["Authorization"] = "Bearer " + newAccess;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        // on refresh failure, clear memory token and redirect to login
        tokenStore.clear();
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
