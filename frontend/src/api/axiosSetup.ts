// src/api/axiosSetup.ts
import api from './axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './auth';
import { refresh as refreshAuth } from '../hooks/useAuth'; // reuse refresh logic

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (err: any, token?: string | null) => {
  failedQueue.forEach(p => (err ? p.reject(err) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          const r = await refreshAuth();
          if (!r.success) {
            clearAccessToken();
            processQueue(r.message || 'Refresh failed', null);
            return reject(r.message);
          }
          const newToken = r.accessToken;
          setAccessToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          resolve(api(originalRequest));
        } catch (e) {
          processQueue(e, null);
          reject(e);
        } finally {
          isRefreshing = false;
        }
      });
    }
    return Promise.reject(error);
  }
);
