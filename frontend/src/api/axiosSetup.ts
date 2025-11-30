import api from "./axios";
import { callRefreshWithLocalStorage } from "./authClient";

let isRefreshing = false;
let queue: Array<{ resolve: (v?: any) => void; reject: (e: any) => void }> = [];

function processQueue(err: any, token?: string | null) {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
}

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    if (error.response && error.response.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          queue.push({
            resolve: (token: string) => {
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
        const newAccess = await callRefreshWithLocalStorage();
        processQueue(null, newAccess);
        original.headers["Authorization"] = "Bearer " + newAccess;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        // redirect to login on refresh failure
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* cookie helper for client */
function readCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export default api;
