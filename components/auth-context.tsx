"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { demoLogin, type DemoUser, type UserRole } from "@/lib/authDemo";

interface AuthContextValue {
  user: DemoUser | null;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<DemoUser | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "talentdraft_demo_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as DemoUser;
        setUser(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  async function login(email: string, password: string) {
    const u = await demoLogin(email, password);
    if (!u) return null;
    setUser(u);
    return u;
  }

  function logout() {
    setUser(null);
  }

  const value: AuthContextValue = {
    user,
    role: user?.role ?? null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
