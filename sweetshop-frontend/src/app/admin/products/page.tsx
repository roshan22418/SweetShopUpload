"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { apiFetch, apiUpload, ApiError, resolveImageUrl } from "@/lib/api";
import { matchesSearch } from "@/lib/search";
import { Category, ImageUploadResponse, Product } from "@/types";

const LOW_STOCK = 5;

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

type Filter = "all" | "low" | "hidden";

interface PickedImage {
  file: File;
  previewUrl: string;
}

function StockBadge({ product }: { product: Product }) {
  if (!product.isAvailable) return <span className="rounded-full bg-charcoal/10 px-2 py-0.5 text-xs font-semibold text-charcoal/70">Hidden</span>;
  if (product.stockQuantity === 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Sold out</span>;
  if (product.stockQuantity <= LOW_STOCK)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{product.stockQuantity} left</span>;
  return <span className="text-sm text-charcoal/70">{product.stockQuantity}</span>;
}

function AdminProducts() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // The picked file plus its preview URL. The URL is created once when the file is chosen and released when
  // it's replaced or the page closes (creating one on every render would leak memory).
  const [image, setImage] = useState<PickedImage | null>(null);
  const imageRef = useRef<PickedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(searchParams.get("filter") === "low" ? "low" : "all");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickImage = useCallback((file: File | null) => {
    if (imageRef.current) URL.revokeObjectURL(imageRef.current.previewUrl);
    imageRef.current = file ? { file, previewUrl: URL.createObjectURL(file) } : null;
    setImage(imageRef.current);
  }, []);

  useEffect(() => () => pickImage(null), [pickImage]);

  const load = useCallback(() => {
    return apiFetch<Product[]>("/api/products")
      .then((list) => {
        setProducts(list);
        return list;
      })
      .catch(() => {
        setProducts((current) => current ?? []);
        return [] as Product[];
      });
  }, []);

  const startEdit = useCallback((p: Product) => {
    setEditingId(p.id);
    setError(null);
    setSuccess(null);
    pickImage(null);
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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pickImage]);

  // ?edit=<id> (from the dashboard's "Running low" list) opens that product straight in the form.
  const editParam = searchParams.get("edit");
  useEffect(() => {
    load().then((list) => {
      const target = editParam ? list.find((p) => p.id === Number(editParam)) : undefined;
      if (target) startEdit(target);
    });
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {});
  }, [load, editParam, startEdit]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    pickImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    let imageUrl = form.imageUrl || undefined;
    try {
      if (image) {
        setUploading(true);
        const uploaded = await apiUpload<ImageUploadResponse>("/api/products/images", image.file);
        imageUrl = uploaded.url;
      }
    } catch (err) {
      setUploading(false);
      setSubmitting(false);
      setError(err instanceof ApiError ? err.message : "Failed to upload image.");
      return;
    }
    setUploading(false);

    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      unit: form.unit.trim(),
      stockQuantity: Number(form.stockQuantity),
      imageUrl,
      isAvailable: form.isAvailable,
    };
    try {
      if (editingId) {
        await apiFetch(`/api/products/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/products", { method: "POST", body: JSON.stringify(payload) });
      }
      setSuccess(`${payload.name} ${editingId ? "updated" : "added"}.`);
      resetForm();
      load();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setError(Object.values(err.fieldErrors).join(" "));
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to save product.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Delete ${p.name}? If it has past orders it is hidden from the shop instead.`)) return;
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/products/${p.id}`, { method: "DELETE" });
      if (editingId === p.id) resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete product.");
    }
  }

  const visible = (products ?? []).filter((p) => {
    if (filter === "low" && !(p.isAvailable && p.stockQuantity <= LOW_STOCK)) return false;
    if (filter === "hidden" && p.isAvailable) return false;
    return matchesSearch(p, query) || p.categoryName.toLowerCase().includes(query.trim().toLowerCase());
  });
  const shownImage = image?.previewUrl ?? (form.imageUrl ? resolveImageUrl(form.imageUrl) : null);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <section className="min-w-0 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All"],
              ["low", "Running low"],
              ["hidden", "Hidden"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                filter === key ? "bg-ink text-cream" : "bg-gold-light/30 text-ink hover:bg-gold-light/50"
              }`}
            >
              {label}
            </button>
          ))}
          <label htmlFor="product-admin-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-admin-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or category"
            className="field w-full sm:ml-auto sm:w-56"
          />
        </div>

        {!products ? (
          <div className="card h-64 animate-pulse bg-gold-light/20" aria-busy="true" />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gold-light py-12 text-center text-charcoal/60">No products match.</p>
        ) : (
          <ul className="card divide-y divide-gold-light/50 p-0">
            {visible.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 ${editingId === p.id ? "bg-gold-light/20" : ""}`}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveImageUrl(p.imageUrl)} alt="" className="h-11 w-11 flex-none rounded-md object-cover" />
                ) : (
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-gold-light/30" aria-hidden="true">
                    🍰
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{p.name}</p>
                  <p className="truncate text-xs text-charcoal/60">
                    {p.categoryName} · {formatPrice(p.price)} / {p.unit}
                  </p>
                </div>
                <div className="flex-none">
                  <StockBadge product={p} />
                </div>
                <div className="flex flex-none gap-1">
                  <button onClick={() => startEdit(p)} className="rounded-md px-2 py-1 text-sm font-medium text-plum hover:bg-gold-light/30">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p)} className="rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form ref={formRef} onSubmit={handleSubmit} className="card flex scroll-mt-24 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
        <h2 className="section-title">{editingId ? "Edit product" : "New product"}</h2>
        {error && <p className="alert-error">{error}</p>}
        {success && <p className="alert-success">{success}</p>}

        <div>
          <label htmlFor="p-category" className="field-label">
            Category
          </label>
          <select
            id="p-category"
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="field"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="p-name" className="field-label">
            Name
          </label>
          <input id="p-name" required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
        </div>

        <div>
          <label htmlFor="p-description" className="field-label">
            Description
          </label>
          <textarea
            id="p-description"
            maxLength={1000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="field"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="p-price" className="field-label">
              Price (₹)
            </label>
            <input
              id="p-price"
              required
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="p-unit" className="field-label">
              Unit
            </label>
            <input
              id="p-unit"
              required
              maxLength={30}
              placeholder="500g, 1 piece"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="p-stock" className="field-label">
            Stock
          </label>
          <input
            id="p-stock"
            required
            type="number"
            min="0"
            step="1"
            value={form.stockQuantity}
            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="p-image" className="field-label">
            Image
          </label>
          {shownImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownImage} alt="Preview" className="mb-2 h-24 w-24 rounded-md border border-gold-light object-cover" />
          )}
          <input
            id="p-image"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-charcoal/70 file:mr-3 file:rounded-md file:border-0 file:bg-gold-light/50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink"
          />
          <label htmlFor="p-image-url" className="sr-only">
            Image URL
          </label>
          <input
            id="p-image-url"
            placeholder="…or paste an image URL"
            maxLength={500}
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="field mt-2"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-charcoal/80">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
            className="h-4 w-4 accent-gold"
          />
          Available for sale
        </label>

        <div className="flex gap-2">
          <button type="submit" disabled={submitting || uploading} className="btn-primary">
            {uploading ? "Uploading image..." : submitting ? "Saving..." : editingId ? "Save changes" : "Add product"}
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

export default function AdminProductsPage() {
  return (
    <Suspense fallback={null}>
      <AdminProducts />
    </Suspense>
  );
}
