"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { emojiFor } from "@/lib/categoryDisplay";
import { Category, Product } from "@/types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [productCounts, setProductCounts] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    apiFetch<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => setCategories((current) => current ?? []));
    apiFetch<Product[]>("/api/products")
      .then((products) => {
        const counts: Record<number, number> = {};
        for (const p of products) counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
        setProductCounts(counts);
      })
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? "");
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = JSON.stringify({ name: name.trim(), description: description.trim() });
      if (editingId) {
        await apiFetch(`/api/categories/${editingId}`, { method: "PUT", body });
      } else {
        await apiFetch("/api/categories", { method: "POST", body });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Delete the "${c.name}" category?`)) return;
    setError(null);
    try {
      await apiFetch(`/api/categories/${c.id}`, { method: "DELETE" });
      if (editingId === c.id) resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete category.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <section className="min-w-0 lg:col-span-2">
        {error && <p className="alert-error mb-4">{error}</p>}
        {!categories ? (
          <div className="card h-48 animate-pulse bg-gold-light/20" aria-busy="true" />
        ) : categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gold-light py-12 text-center text-charcoal/60">
            No categories yet — add your first one.
          </p>
        ) : (
          <ul className="card divide-y divide-gold-light/50 p-0">
            {categories.map((c) => {
              const count = productCounts[c.id] ?? 0;
              return (
                <li key={c.id} className={`flex items-center gap-3 px-4 py-3 ${editingId === c.id ? "bg-gold-light/20" : ""}`}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold-light/30 text-xl" aria-hidden="true">
                    {emojiFor(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="truncate text-xs text-charcoal/60">
                      {count} product{count === 1 ? "" : "s"}
                      {c.description ? ` · ${c.description}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-none gap-1">
                    <button onClick={() => startEdit(c)} className="rounded-md px-2 py-1 text-sm font-medium text-plum hover:bg-gold-light/30">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={count > 0}
                      title={count > 0 ? "Move or delete its products first" : undefined}
                      className="rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 lg:self-start">
        <h2 className="section-title">{editingId ? "Edit category" : "New category"}</h2>
        <div>
          <label htmlFor="c-name" className="field-label">
            Name
          </label>
          <input id="c-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="c-description" className="field-label">
            Description <span className="text-charcoal/40">(optional)</span>
          </label>
          <textarea
            id="c-description"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="field"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {editingId ? "Save changes" : "Add category"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
