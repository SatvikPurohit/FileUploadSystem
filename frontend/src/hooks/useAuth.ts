// src/hooks/authHooks.ts
import api from '../api/axios';
import { setAccessToken, clearAccessToken } from '../api/auth';

type ValidationErrors = { email?: string; password?: string };

/**
 * Validate and return an errors object (caller should set UI state)
 */
export function validateLogin(email: string, password: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!email) errors.email = 'Email required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email';
  if (!password) errors.password = 'Password required';
  else if (typeof password === 'string' && password.length < 8) errors.password = 'Password must be >= 8 chars';
  return errors;
}

/**
 * Login: returns { success: boolean, data?, errors?, message? }
 * Caller should set form errors if errors object returned.
 */
export async function login(email: string, password: string) {
  const errors = validateLogin(email, password);
  if (Object.keys(errors).length) {
    return { success: false, errors };
  }

  try {
    // Using axios instance that has withCredentials:true
    const res = await api.post('/auth/login', { username: email, password });
    const access = res.data?.accessToken;
    if (!access) {
      // Unexpected server response
      return { success: false, message: 'No access token returned from server' };
    }

    setAccessToken(access);
    return { success: true, data: res.data };
  } catch (err: any) {
    // Normalize axios error
    if (err.response) {
      // Server responded (4xx/5xx)
      const message = err.response.data?.message || err.response.statusText || 'Login failed';
      return { success: false, message, status: err.response.status };
    } else if (err.request) {
      // Request made but no response (network)
      return { success: false, message: 'Network error — cannot reach server' };
    } else {
      return { success: false, message: err.message || 'Unknown error' };
    }
  }
}

/**
 * Refresh access token using cookie (server reads HttpOnly cookie).
 * Returns { success, accessToken, message }
 */
export async function refresh() {
  try {
    const res = await api.post('/auth/refresh'); // axios has withCredentials:true
    const newAccess = res.data?.accessToken;
    if (!newAccess) return { success: false, message: 'No access token in refresh response' };
    setAccessToken(newAccess);
    return { success: true, accessToken: newAccess };
  } catch (err: any) {
    // clear token on failure
    clearAccessToken();
    if (err.response) {
      return { success: false, message: err.response.data?.message || 'Refresh failed', status: err.response.status };
    }
    return { success: false, message: 'Network error during refresh' };
  }
}

/**
 * Logout: server will clear cookie; client clears memory token and navigates to login.
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // ignore server errors — still clear client
  } finally {
    clearAccessToken();
    window.location.href = '/login';
  }
}
