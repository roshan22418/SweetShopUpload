"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch, AUTH_STORAGE_KEY as STORAGE_KEY, AUTH_UPDATED_EVENT, AUTH_CLEARED_EVENT } from "@/lib/api";
import { AuthResponse } from "@/types";

interface AuthContextValue {
  user: AuthResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, phoneNumber?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  setUserFullName: (fullName: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);

    // api.ts silently refreshes the access token (or gives up when the refresh token is dead);
    // mirror either outcome into React state so the UI reacts.
    function onUpdated(e: Event) {
      setUser((e as CustomEvent<AuthResponse>).detail);
    }
    function onCleared() {
      setUser(null);
    }
    window.addEventListener(AUTH_UPDATED_EVENT, onUpdated);
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared);
    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, onUpdated);
      window.removeEventListener(AUTH_CLEARED_EVENT, onCleared);
    };
  }, []);

  function persist(auth: AuthResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    setUser(auth);
  }

  async function login(email: string, password: string) {
    const auth = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persist(auth);
  }

  async function register(fullName: string, email: string, password: string, phoneNumber?: string) {
    const auth = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, phoneNumber }),
    });
    persist(auth);
  }

  async function loginWithGoogle(idToken: string) {
    const auth = await apiFetch<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    persist(auth);
  }

  function logout() {
    // Revoke the refresh token server-side (best effort — we log out locally regardless)
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  function setUserFullName(fullName: string) {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, fullName };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, setUserFullName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
