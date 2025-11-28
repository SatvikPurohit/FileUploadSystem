import { useState, useCallback } from 'react';
import client from '../api/client';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await client.post('/api/auth/login', { email, password });
      const { access, refresh } = resp.data;
      if (access) sessionStorage.setItem('access', access);
      if (refresh) sessionStorage.setItem('refresh', refresh);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setError(error?.response?.data?.message || error?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('access');
    sessionStorage.removeItem('refresh');
  }, []);

  const isLoggedIn = !!sessionStorage.getItem('access');

  return { login, logout, isLoggedIn, loading, error };
};
