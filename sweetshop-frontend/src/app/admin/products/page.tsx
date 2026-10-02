"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, apiUpload, ApiError, resolveImageUrl } from "@/lib/api";
import { Category, ImageUploadResponse, Product } from "@/types";

const emptyForm = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  unit: "",
  stockQuantity: "",
  imageUrl: "",
  isAvailable: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    apiFetch<Product[]>("/api/products").then(setProducts).catch(() => {});
  }

  useEffect(() => {
    load();
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {});
  }, []);

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      categoryId: String(p.categoryId),
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      unit: p.unit,
      stockQuantity: String(p.stockQuantity),
      imageUrl: p.imageUrl ?? "",
      isAvailable: p.isAvailable,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let imageUrl = form.imageUrl || undefined;
    try {
      if (imageFile) {
        setUploading(true);
        const uploaded = await apiUpload<ImageUploadResponse>("/api/products/images", imageFile);
        imageUrl = uploaded.url;
        setUploading(false);
      }
    } catch (err) {
      setUploading(false);
      setSubmitting(false);
      setError(err instanceof ApiError ? err.message : "Failed to upload image.");
      return;
    }

    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name,
      description: form.description,
      price: Number(form.price),
      unit: form.unit,
      stockQuantity: Number(form.stockQuantity),
      imageUrl,
      isAvailable: form.isAvailable,
    };
    try {
      if (editingId) {
        await apiFetch(`/api/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete product.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2">Category</th>
              <th className="py-2">Price</th>
              <th className="py-2">Stock</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="py-2 font-medium text-gray-900">
                  {p.name}
                  {!p.isAvailable && <span className="ml-2 text-xs text-red-500">(hidden)</span>}
                </td>
                <td className="py-2 text-gray-600">{p.categoryName}</td>
                <td className="py-2 text-gray-600">
                  ₹{p.price}/{p.unit}
                </td>
                <td className="py-2 text-gray-600">{p.stockQuantity}</td>
                <td className="py-2 text-right">
                  <button onClick={() => startEdit(p)} className="mr-3 text-amber-700 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-gray-900">{editingId ? "Edit Product" : "New Product"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            <input
              required
              type="number"
              step="0.01"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Unit (e.g. 500g)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <input
            required
            type="number"
            placeholder="Stock quantity"
            value={form.stockQuantity}
            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Product image</label>
            {(imageFile || form.imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageFile ? URL.createObjectURL(imageFile) : resolveImageUrl(form.imageUrl)}
                alt="Preview"
                className="mb-2 h-20 w-20 rounded-md border border-gray-200 object-cover"
              />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600"
            />
          </div>

          <input
            placeholder="Image URL (optional, overridden by an uploaded file above)"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
            />
            Available for sale
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {uploading ? "Uploading image..." : submitting ? "Saving..." : editingId ? "Save" : "Create"}
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
