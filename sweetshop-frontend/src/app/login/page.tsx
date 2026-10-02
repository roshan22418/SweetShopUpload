"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import AuthLayout from "@/components/AuthLayout";
import GoogleAuthSection from "@/components/GoogleAuthSection";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-medium text-ink">Welcome back</h1>
      <p className="mb-6 text-sm text-charcoal/60">Login to order from KING CAKE PLACE.</p>
      <GoogleAuthSection redirect={redirect} text="signin_with" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal/80">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gold-light px-3 py-2 transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal/80">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gold-light px-3 py-2 transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gold px-4 py-2 font-semibold text-ink shadow-sm transition hover:bg-gold-light disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-sm text-charcoal/70">
        Don&apos;t have an account?{" "}
        <Link href={`/register?redirect=${encodeURIComponent(redirect)}`} className="font-medium text-plum hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
