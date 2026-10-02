"use client";

import { useEffect, useRef } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

// Minimal typing for the bits of Google Identity Services we use.
interface GoogleId {
  initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, options: Record<string, string | number>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null; // allow a retry on the next mount
        reject(new Error("Failed to load Google sign-in"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface Props {
  /** Called with Google's ID token (a JWT) after the user picks an account. */
  onCredential: (idToken: string) => void;
  text?: "continue_with" | "signin_with" | "signup_with";
}

export default function GoogleSignInButton({ onCredential, text = "continue_with" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the newest callback without re-initialising Google's button on every render.
  const callbackRef = useRef(onCredential);
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        const el = containerRef.current;
        if (cancelled || !el || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => callbackRef.current(r.credential),
        });
        // Google only accepts a pixel width between 200 and 400
        const width = Math.min(400, Math.max(200, el.offsetWidth));
        el.innerHTML = "";
        window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", text, width });
      })
      .catch(() => {
        // Script blocked/offline: the password form still works, so just show no Google button.
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  return <div ref={containerRef} className="flex min-h-[44px] w-full justify-center" />;
}
