"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ShopSettings } from "@/types";

const emptyForm = {
  shopName: "",
  description: "",
  contactPhone: "",
  address: "",
  email: "",
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ShopSettings>("/api/shop-settings")
      .then((settings) =>
        setForm({
          shopName: settings.shopName,
          description: settings.description ?? "",
          contactPhone: settings.contactPhone ?? "",
          address: settings.address ?? "",
          email: settings.email ?? "",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/shop-settings", {
        method: "PUT",
        body: JSON.stringify({
          shopName: form.shopName,
          description: form.description || undefined,
          contactPhone: form.contactPhone || undefined,
          address: form.address || undefined,
          email: form.email || undefined,
        }),
      });
      setSuccess("Shop settings saved. Refresh the page to see the new name everywhere.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save shop settings.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900">Shop Settings</h2>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Shop name</label>
          <input
            required
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Contact phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Address <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Contact email <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="hello@yourshop.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
