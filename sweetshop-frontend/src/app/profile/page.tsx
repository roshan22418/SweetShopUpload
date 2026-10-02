"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { UserProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { user, loading, setUserFullName } = useAuth();
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

  useEffect(() => {
    if (user) {
      apiFetch<UserProfile>("/api/users/me").then((data) => {
        setProfile(data);
        setFullName(data.fullName);
        setPhoneNumber(data.phoneNumber ?? "");
      });
    }
  }, [user]);

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
      setProfileSuccess("Profile updated.");
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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordSuccess("Password changed.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading || !user || !profile) return null;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-amber-900">Your Profile</h1>

      <div className="mb-6 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800">Email:</span> {profile.email}{" "}
          <span className="text-xs text-gray-400">(cannot be changed)</span>
        </p>
        <p>
          <span className="font-medium text-gray-800">Role:</span> {profile.role}
        </p>
        <p>
          <span className="font-medium text-gray-800">Member since:</span> {formatDate(profile.createdAt)}
        </p>
      </div>

      {profile.role === "CUSTOMER" && (
        <div className="mb-8 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold text-gray-900">Orders</h2>
          <div className="flex gap-3">
            <Link
              href="/orders?view=active"
              className="flex-1 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              My Orders
              <span className="mt-0.5 block text-xs font-normal text-amber-700">Still in progress</span>
            </Link>
            <Link
              href="/orders?view=history"
              className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Order History
              <span className="mt-0.5 block text-xs font-normal text-gray-500">Completed &amp; cancelled</span>
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="mb-8 flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900">Edit details</h2>
        {profileError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</p>}
        {profileSuccess && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{profileSuccess}</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Phone number <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="self-start rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {savingProfile ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900">Change password</h2>
        {passwordError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</p>}
        {passwordSuccess && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{passwordSuccess}</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Current password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          className="self-start rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {savingPassword ? "Changing..." : "Change password"}
        </button>
      </form>
    </div>
  );
}
