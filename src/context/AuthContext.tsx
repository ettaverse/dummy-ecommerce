"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { User } from "@/types";

const TOKEN_STORAGE_KEY = "shopdemo_auth_token";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

export type AuthResult =
  | { success: true }
  | { success: false; errors: Record<string, string>; message?: string };

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useCallback(
    (currentToken: string | null): HeadersInit => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
      }
      return headers;
    },
    []
  );

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(TOKEN_STORAGE_KEY)
        : null;

    if (!stored) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: authHeaders(stored),
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(stored);
        } else {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [authHeaders]);

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    if (res.status === 400 && data.errors) {
      return { success: false, errors: data.errors };
    }
    return {
      success: false,
      errors: {},
      message: data.error || "Login failed",
    };
  };

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    if (res.status === 400 && data.errors) {
      return { success: false, errors: data.errors };
    }
    return {
      success: false,
      errors: {},
      message: data.error || "Signup failed",
    };
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: authHeaders(token),
      });
    } catch {
      // ignore network errors on logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
