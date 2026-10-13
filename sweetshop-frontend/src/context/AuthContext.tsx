"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, ReactNode } from "react";
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

// The session lives in localStorage; React reads it as an external store. Every writer (this file and
// api.ts's silent refresh) fires one of these events, and the browser's "storage" event covers other tabs —
// so logging in or out in one tab updates every open tab.
function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_UPDATED_EVENT, onChange);
  window.addEventListener(AUTH_CLEARED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_UPDATED_EVENT, onChange);
    window.removeEventListener(AUTH_CLEARED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const readSession = () => localStorage.getItem(STORAGE_KEY);
const noSessionOnServer = () => null;

// false during server render and hydration, true afterwards — that's what `loading` means: until the
// browser's storage has been read, "no user" doesn't yet mean "logged out".
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

function parseSession(raw: string | null): AuthResponse | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

// Set when a login/register happens in *this* tab. Other tabs learn about the session too (storage
// event), but only the tab that logged in may move its guest cart into the account — otherwise every
// open tab would merge the same guest cart and multiply its quantities.
let freshLoginUserId: number | null = null;

/** True exactly once, in the tab where {@code userId} just logged in. */
export function consumeFreshLogin(userId: number): boolean {
  if (freshLoginUserId !== userId) return false;
  freshLoginUserId = null;
  return true;
}

function startSession(auth: AuthResponse) {
  freshLoginUserId = auth.userId;
  writeSession(auth);
}

function writeSession(auth: AuthResponse | null) {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    window.dispatchEvent(new CustomEvent(AUTH_UPDATED_EVENT, { detail: auth }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readSession, noSessionOnServer);
  const hydrated = useSyncExternalStore(subscribeNever, onClient, onServer);
  const user = useMemo(() => parseSession(raw), [raw]);

  const login = useCallback(async (email: string, password: string) => {
    startSession(
      await apiFetch<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
    );
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string, phoneNumber?: string) => {
    startSession(
      await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password, phoneNumber }),
      })
    );
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    startSession(
      await apiFetch<AuthResponse>("/api/auth/google", { method: "POST", body: JSON.stringify({ idToken }) })
    );
  }, []);

  const logout = useCallback(() => {
    // Revoke the refresh token server-side (best effort — we log out locally regardless)
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    writeSession(null);
  }, []);

  const setUserFullName = useCallback((fullName: string) => {
    const current = parseSession(readSession());
    if (current) writeSession({ ...current, fullName });
  }, []);

  const value = useMemo(
    () => ({ user, loading: !hydrated, login, register, loginWithGoogle, logout, setUserFullName }),
    [user, hydrated, login, register, loginWithGoogle, logout, setUserFullName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
