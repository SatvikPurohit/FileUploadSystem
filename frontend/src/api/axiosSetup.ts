import { tokenStore } from "../tokenStore";
import { callRefresh } from "./authClient";
import api from "./axios";
import axios from "axios";


type QueueItem = {
  resolve: (token?: string | null) => void;
  reject: (err?: any) => void;
};

let isRefreshing = false;
let queue: QueueItem[] = [];

function processQueue(err: any | null, token?: string | null) {
  queue.forEach((p) => {
    if (err) p.reject(err);
    else p.resolve(token);
  });
  queue = [];
}

// attach header from in-memory store
api.interceptors.request.use((config) => {
  config.withCredentials = true;
  const token = tokenStore.get();
  if (token && config.headers) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});


api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    // Don't retry auth endpoints to avoid infinite loops
    const url = original.url || "";
    const isAuthEndpoint = url.includes("/auth/refresh") || 
                          url.includes("/auth/login") || 
                          url.includes("/auth/verify-status");
    
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          queue.push({
            resolve: (token?: string | null) => {
              if (original.headers) original.headers["Authorization"] = "Bearer " + token;
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
        if (original.headers) original.headers["Authorization"] = "Bearer " + newAccess;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        // on refresh failure, clear memory token and call logout to clear cookies
        tokenStore.clear();
        
        // Call logout endpoint to clear HttpOnly cookies
        // Use raw axios instance (not 'api') to avoid triggering interceptors again
        try {
          await axios.post(
            (api.defaults.baseURL || "http://localhost:4000/api") + "/auth/logout",
            {},
            { withCredentials: true }
          );
        } catch (logoutErr) {
          // Ignore logout errors - cookies might already be expired
          console.warn("Logout call failed during refresh error:", logoutErr);
        }
        
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
