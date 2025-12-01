// src/AuthConext.tsx
import { createContext, useState, useEffect, ReactNode } from "react";
import api from "./api/axios";
import { login as loginClient, logout as logoutClient } from "./api/authClient";
import Navbar from "./components/Navbar";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  verify: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const login = async () => {
    // set flag; real login happens in LoginPage which calls authClient.login
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await logoutClient();
    setIsAuthenticated(false);
  };

  const verify = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/auth/verify-status", { withCredentials: true });
      setIsAuthenticated(response.status === 200);
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { verify(); }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, verify }}>
      {children}
    </AuthContext.Provider>
  );
};
