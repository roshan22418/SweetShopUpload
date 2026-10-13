"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { UserProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { user, loading, setUserFullName, login } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/profile");
    }
  }, [loading, user, router]);

  const userId = user?.userId;
  useEffect(() => {
    if (userId === undefined) return;
    apiFetch<UserProfile>("/api/users/me")
      .then((data) => {
        setProfile(data);
        setFullName(data.fullName);
        setPhoneNumber(data.phoneNumber ?? "");
      })
      .catch(() => {});
  }, [userId]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);
    try {
      const updated = await apiFetch<UserProfile>("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ fullName, phoneNumber: phoneNumber || undefined }),
      });
      setProfile(updated);
      setUserFullName(updated.fullName);
      setProfileSuccess("Your details have been saved.");
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch("/api/users/me/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      // The backend signs out every session on a password change; sign this device straight back in.
      await login(profile!.email, newPassword).catch(() => {});
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess("Password changed. You've been signed out on all other devices.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading || !user) return null;
  if (!profile) return <div className="card mx-auto h-64 max-w-2xl animate-pulse bg-gold-light/20" aria-busy="true" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="page-title">Your account</h1>

      <div className="card flex items-center gap-4">
        <span
          className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-plum font-display text-2xl text-cream"
          aria-hidden="true"
        >
          {profile.fullName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 text-sm">
          <p className="truncate font-display text-lg text-ink">
            {profile.fullName}
            {profile.role === "ADMIN" && (
              <span className="ml-2 rounded-full bg-gold-light/60 px-2 py-0.5 align-middle font-sans text-xs font-semibold text-ink">
                Shop admin
              </span>
            )}
          </p>
          <p className="truncate text-charcoal/70">{profile.email}</p>
          <p className="text-xs text-charcoal/50">Member since {formatDate(profile.createdAt)}</p>
        </div>
      </div>

      {profile.role === "CUSTOMER" && (
        <div className="grid grid-cols-2 gap-3">
          <Link href="/orders?view=active" className="card p-4 text-center transition hover:border-gold">
            <p className="font-semibold text-ink">My orders</p>
            <p className="text-xs text-charcoal/60">In progress</p>
          </Link>
          <Link href="/orders?view=history" className="card p-4 text-center transition hover:border-gold">
            <p className="font-semibold text-ink">Order history</p>
            <p className="text-xs text-charcoal/60">Completed &amp; cancelled</p>
          </Link>
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="card flex flex-col gap-4">
        <h2 className="section-title">Your details</h2>
        {profileError && <p className="alert-error">{profileError}</p>}
        {profileSuccess && <p className="alert-success">{profileSuccess}</p>}

        <div>
          <label htmlFor="fullName" className="field-label">
            Full name
          </label>
          <input id="fullName" required maxLength={150} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="field" />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="field-label">
            Phone number <span className="text-charcoal/40">(optional)</span>
          </label>
          <input
            id="phoneNumber"
            type="tel"
            maxLength={20}
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="field"
          />
          <p className="mt-1 text-xs text-charcoal/50">Used to pre-fill checkout. Your email can&apos;t be changed.</p>
        </div>

        <button type="submit" disabled={savingProfile} className="btn-primary self-start">
          {savingProfile ? "Saving..." : "Save changes"}
        </button>
      </form>

      {profile.passwordSet ? (
        <form onSubmit={handlePasswordSubmit} className="card flex flex-col gap-4">
          <h2 className="section-title">Change password</h2>
          {passwordError && <p className="alert-error">{passwordError}</p>}
          {passwordSuccess && <p className="alert-success">{passwordSuccess}</p>}

          <div>
            <label htmlFor="currentPassword" className="field-label">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="newPassword" className="field-label">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="field-label">
                Confirm new password
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="field"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-charcoal/50">8–72 characters. Other devices will be signed out.</p>

          <button type="submit" disabled={savingPassword} className="btn-primary self-start">
            {savingPassword ? "Changing..." : "Change password"}
          </button>
        </form>
      ) : (
        <div className="card text-sm text-charcoal/70">
          <h2 className="section-title mb-1">Password</h2>
          You sign in with Google, so there&apos;s no password to change here — manage it in your Google account.
        </div>
      )}
    </div>
  );
}
