import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const client = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: false,
});

client.interceptors.request.use(config => {
  const token = sessionStorage.getItem('access');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = sessionStorage.getItem('refresh');
      if (refresh) {
        try {
          const resp = await axios.post(`${BACKEND_URL}/api/auth/refresh`, { refresh });
          if (resp.data.access) {
            sessionStorage.setItem('access', resp.data.access);
            originalRequest.headers.Authorization = `Bearer ${resp.data.access}`;
            return client(originalRequest);
          }
        } catch (e) {
          sessionStorage.removeItem('access');
          sessionStorage.removeItem('refresh');
          window.location.href = '/login';
          return Promise.reject(e);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
