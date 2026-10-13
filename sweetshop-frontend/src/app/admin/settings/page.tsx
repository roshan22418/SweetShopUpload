"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ShopSettings } from "@/types";
import { loadShopSettings, setShopSettings } from "@/lib/shopSettings";

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
    loadShopSettings()
      .then((settings) =>
        settings &&
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
      const saved = await apiFetch<ShopSettings>("/api/shop-settings", {
        method: "PUT",
        body: JSON.stringify({
          shopName: form.shopName,
          description: form.description || undefined,
          contactPhone: form.contactPhone || undefined,
          address: form.address || undefined,
          email: form.email || undefined,
        }),
      });
      setShopSettings(saved);
      setSuccess("Shop settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save shop settings.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="card h-64 max-w-lg animate-pulse bg-gold-light/20" aria-busy="true" />;

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <h2 className="section-title">Shop settings</h2>
        {error && <p className="alert-error">{error}</p>}
        {success && <p className="alert-success">{success}</p>}

        <div>
          <label htmlFor="s-shopName" className="field-label">Shop name</label>
          <input id="s-shopName"
            required
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="s-description" className="field-label">
            Description <span className="text-charcoal/40">(optional)</span>
          </label>
          <textarea id="s-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="s-contactPhone" className="field-label">
            Contact phone <span className="text-charcoal/40">(optional)</span>
          </label>
          <input id="s-contactPhone"
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="s-address" className="field-label">
            Address <span className="text-charcoal/40">(optional)</span>
          </label>
          <textarea id="s-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="s-email" className="field-label">
            Contact email <span className="text-charcoal/40">(optional)</span>
          </label>
          <input id="s-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="hello@yourshop.com"
            className="field"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary self-start"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
