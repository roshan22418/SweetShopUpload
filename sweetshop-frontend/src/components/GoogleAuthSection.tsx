"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import GoogleSignInButton from "@/components/GoogleSignInButton";

// "Continue with Google" + an "or" divider, shared by /login and /register.
// Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't configured (see GoogleSignInButton).
export default function GoogleAuthSection({ redirect, text }: { redirect: string; text?: "signin_with" | "signup_with" | "continue_with" }) {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleCredential(idToken: string) {
    setError(null);
    try {
      await loginWithGoogle(idToken);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.");
    }
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="mb-5">
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <GoogleSignInButton onCredential={handleCredential} text={text} />
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-charcoal/40">
        <span className="h-px flex-1 bg-gold-light" />
        or
        <span className="h-px flex-1 bg-gold-light" />
      </div>
    </div>
  );
}
