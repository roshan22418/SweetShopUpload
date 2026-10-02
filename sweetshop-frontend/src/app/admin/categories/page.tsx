"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Category } from "@/types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {});
  }

  useEffect(load, []);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? "");
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
      if (editingId) {
        await apiFetch(`/api/categories/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ name, description }),
        });
      } else {
        await apiFetch("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name, description }),
        });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this category? Products in it may be affected.")) return;
    try {
      await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete category.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2">Description</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="py-2 font-medium text-gray-900">{c.name}</td>
                <td className="py-2 text-gray-600">{c.description}</td>
                <td className="py-2 text-right">
                  <button onClick={() => startEdit(c)} className="mr-3 text-amber-700 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-gray-900">
          {editingId ? "Edit Category" : "New Category"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {editingId ? "Save" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
