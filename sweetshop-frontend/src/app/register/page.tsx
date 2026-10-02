"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import AuthLayout from "@/components/AuthLayout";
import GoogleAuthSection from "@/components/GoogleAuthSection";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(fullName, email, password, phoneNumber || undefined);
      router.push(redirect);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-medium text-ink">Create account</h1>
      <p className="mb-6 text-sm text-charcoal/60">Join KING CAKE PLACE to start ordering.</p>
      <GoogleAuthSection redirect={redirect} text="signup_with" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal/80">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-gold-light px-3 py-2 transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
          {fieldErrors.fullName && <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal/80">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gold-light px-3 py-2 transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
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
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal/80">
            Phone number <span className="text-charcoal/40">(optional)</span>
          </label>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-md border border-gold-light px-3 py-2 transition focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gold px-4 py-2 font-semibold text-ink shadow-sm transition hover:bg-gold-light disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-sm text-charcoal/70">
        Already have an account?{" "}
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-medium text-plum hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
