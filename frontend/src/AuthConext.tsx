import  { createContext, useState, useEffect, ReactNode } from "react";
import axios from "./api/axios";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (opts?: { token?: string }) => void;
  logout: () => void;
  verify: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const login = (opts?: { token?: string }) => {
    // If you store token in localStorage do it here. If backend uses HttpOnly cookie, no need.
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout", {}, { withCredentials: true });
    } catch (e) {
      // ignore
    } finally {
      setIsAuthenticated(false);
    }
  };

  const verify = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/auth/verify-status", {
        withCredentials: true,
      });
      setIsAuthenticated(response.status === 200);
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verify();
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, verify }}
    >
      {children}
    </AuthContext.Provider>
  );
};
