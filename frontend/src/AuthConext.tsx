import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useContext,
} from "react";
import api from "./api/axiosSetup";
import { logout as logoutClient } from "./api/authClient";
import { tokenStore } from "./tokenStore";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const login = async () => {
    // set flag; real login happens in LoginPage which calls authClient.login
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await logoutClient();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    async function run() {
      try {
        setIsLoading(true);

        const token = tokenStore.get();
        if (!token) {
          if (!isMounted.current) return;
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        await api.post("/auth/verify-status", { withCredentials: true });

        if (!isMounted.current) return;
        setIsAuthenticated(true);
      } catch {
        if (!isMounted.current) return;
        setIsAuthenticated(false);
      } finally {
        if (!isMounted.current) return;
        setIsLoading(false);
      }
    }

    run();

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
