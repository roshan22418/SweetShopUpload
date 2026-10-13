"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError, resolveImageUrl } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { Order, Product, Review, ReviewSummary } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { playPopSound } from "@/lib/sound";
import QuantityStepper from "@/components/QuantityStepper";

function Stars({ value, className = "text-gold" }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={className} aria-label={`${value} out of 5 stars`}>
      {"★".repeat(rounded)}
      <span className="text-gold-light">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

function StockLabel({ product }: { product: Product }) {
  if (!product.isAvailable) return <p className="text-sm font-medium text-red-700">Currently unavailable</p>;
  if (product.stockQuantity <= 0) return <p className="text-sm font-medium text-red-700">Out of stock</p>;
  if (product.stockQuantity <= 5)
    return <p className="text-sm font-medium text-plum">Only {product.stockQuantity} left — order soon</p>;
  return (
    <p className="flex items-center gap-1.5 text-sm text-emerald-800">
      <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" /> In stock
    </p>
  );
}

function ReviewForm({
  productId,
  existing,
  onSaved,
}: {
  productId: string;
  existing: Review | undefined;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save your review.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete your review?")) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/products/${productId}/reviews`, { method: "DELETE" });
      setRating(5);
      setComment("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete your review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-gold-light/60 bg-cream/60 p-4">
      <p className="mb-2 text-sm font-semibold text-ink">{existing ? "Your review" : "Leave a review"}</p>
      {error && <p className="alert-error mb-2">{error}</p>}
      <div role="radiogroup" aria-label="Your rating" className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            className={`text-2xl leading-none transition hover:scale-110 ${n <= rating ? "text-gold" : "text-gold-light"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you think? (optional)"
        maxLength={1000}
        className="field"
        rows={3}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : existing ? "Update review" : "Submit review"}
        </button>
        {existing && (
          <button onClick={remove} disabled={saving} className="btn-danger">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { getQuantity, incrementItem, decrementItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const isCustomer = user?.role === "CUSTOMER";
  const isAdmin = user?.role === "ADMIN";

  const loadReviews = useCallback(() => {
    apiFetch<ReviewSummary>(`/api/products/${id}/reviews`).then(setReviews).catch(() => {});
  }, [id]);

  useEffect(() => {
    apiFetch<Product>(`/api/products/${id}`)
      .then(setProduct)
      .catch(() => setNotFound(true));
    loadReviews();
  }, [id, loadReviews]);

  // Reviews are limited to products the customer has ordered (enforced by the backend too), so the form
  // only appears when it can actually be submitted.
  useEffect(() => {
    if (!isCustomer) return;
    apiFetch<Order[]>("/api/orders")
      .then((orders) => setHasOrdered(orders.some((o) => o.items.some((item) => item.productId === Number(id)))))
      .catch(() => {});
  }, [isCustomer, id]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    try {
      await incrementItem(product, quantity);
      playPopSound();
      setQuantity(1);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to add to cart.");
    } finally {
      setAdding(false);
    }
  }

  async function changeCartQuantity(next: number, current: number) {
    if (!product) return;
    try {
      if (next > current) {
        await incrementItem(product);
        playPopSound();
      } else {
        await decrementItem(product.id);
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to update cart.");
    }
  }

  async function removeReviewAsAdmin(review: Review) {
    if (!confirm(`Remove ${review.userName}'s review?`)) return;
    try {
      await apiFetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      loadReviews();
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Failed to remove the review.");
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-5xl">🍰</p>
        <h1 className="page-title mt-4">Product not found</h1>
        <p className="mt-2 text-charcoal/60">This item isn&apos;t available anymore — it may have been removed from sale.</p>
        <Link href="/" className="btn-primary mt-6">
          Browse the menu
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto grid max-w-5xl animate-pulse grid-cols-1 gap-10 md:grid-cols-2" aria-busy="true">
        <div className="aspect-[4/3] rounded-2xl bg-gold-light/30" />
        <div className="space-y-4 pt-4">
          <div className="h-3 w-24 rounded bg-gold-light/40" />
          <div className="h-8 w-2/3 rounded bg-gold-light/40" />
          <div className="h-4 w-full rounded bg-gold-light/30" />
          <div className="h-8 w-32 rounded bg-gold-light/40" />
        </div>
      </div>
    );
  }

  const qtyInCart = getQuantity(product.id);
  const canBuy = product.isAvailable && product.stockQuantity > 0;
  const ownReview = reviews?.reviews.find((r) => r.userId === user?.userId);

  return (
    <div className="mx-auto max-w-5xl">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-charcoal/60">
        <Link href="/" className="hover:text-plum">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>{product.categoryName}</span>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(product.imageUrl)}
            alt={product.name}
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gold-light/25 text-8xl">🍰</div>
        )}

        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plum">{product.categoryName}</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{product.name}</h1>
          {reviews && reviews.reviewCount > 0 && (
            <a href="#reviews" className="mt-2 flex items-center gap-2 text-sm text-charcoal/70 hover:text-plum">
              <Stars value={reviews.averageRating} />
              {reviews.averageRating.toFixed(1)} · {reviews.reviewCount} review{reviews.reviewCount === 1 ? "" : "s"}
            </a>
          )}
          {product.description && <p className="mt-4 leading-relaxed text-charcoal/75">{product.description}</p>}

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-3xl font-medium text-ink">{formatPrice(product.price)}</span>
            <span className="text-sm text-charcoal/60">/ {product.unit}</span>
          </div>
          <div className="mt-1">
            <StockLabel product={product} />
          </div>

          <div className="mt-6 border-t border-gold-light/60 pt-6">
            {message && <p className="alert-error mb-4">{message}</p>}

            {isAdmin ? (
              <Link href="/admin/products" className="btn-secondary">
                Edit in admin
              </Link>
            ) : qtyInCart > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                <QuantityStepper
                  value={qtyInCart}
                  min={0}
                  max={product.stockQuantity}
                  onChange={(next) => changeCartQuantity(next, qtyInCart)}
                  label={`Quantity of ${product.name} in your cart`}
                />
                <span className="text-sm font-medium text-emerald-800">
                  ✓ In your cart · {formatPrice(product.price * qtyInCart)}
                </span>
                <Link href="/cart" className="text-sm font-medium text-plum hover:underline">
                  View cart →
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  max={product.stockQuantity}
                  disabled={!canBuy}
                  label={`Quantity of ${product.name}`}
                />
                <button disabled={!canBuy || adding} onClick={handleAddToCart} className="btn-primary flex-1 py-2.5 sm:flex-none sm:px-8">
                  {!product.isAvailable
                    ? "Unavailable"
                    : product.stockQuantity <= 0
                      ? "Out of stock"
                      : adding
                        ? "Adding..."
                        : `Add to cart · ${formatPrice(product.price * quantity)}`}
                </button>
              </div>
            )}

            <ul className="mt-6 flex flex-wrap gap-2 text-xs text-charcoal/70">
              <li className="rounded-full border border-gold-light/70 px-3 py-1">Dine-in · Takeaway · Delivery</li>
              <li className="rounded-full border border-gold-light/70 px-3 py-1">Pay online or at the counter</li>
            </ul>
          </div>
        </div>
      </div>

      <section id="reviews" className="card mt-12 scroll-mt-24 md:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="section-title text-xl">Reviews</h2>
          {reviews && reviews.reviewCount > 0 && (
            <p className="flex items-center gap-2 text-sm text-charcoal/70">
              <span className="font-display text-2xl text-ink">{reviews.averageRating.toFixed(1)}</span>
              <Stars value={reviews.averageRating} />
              <span>({reviews.reviewCount})</span>
            </p>
          )}
        </div>

        {isCustomer &&
          (hasOrdered || ownReview ? (
            <ReviewForm key={ownReview?.id ?? "new"} productId={id} existing={ownReview} onSaved={loadReviews} />
          ) : (
            <p className="mb-6 rounded-lg bg-gold-light/25 px-4 py-3 text-sm text-charcoal/70">
              Ordered this before? Reviews open up once it&apos;s in one of your orders.
            </p>
          ))}
        {!user && (
          <p className="mb-6 text-sm text-charcoal/60">
            <Link href={`/login?redirect=/products/${id}`} className="font-medium text-plum hover:underline">
              Log in
            </Link>{" "}
            to review products you&apos;ve ordered.
          </p>
        )}

        {reviews && reviews.reviews.length > 0 ? (
          <ul className="divide-y divide-gold-light/50">
            {reviews.reviews.map((r) => (
              <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} />
                  <span className="text-sm font-medium text-ink">
                    {r.userName}
                    {r.userId === user?.userId && <span className="ml-1.5 text-xs font-normal text-plum">(you)</span>}
                  </span>
                  <span className="text-xs text-charcoal/50">{formatDate(r.createdAt)}</span>
                  {isAdmin && (
                    <button onClick={() => removeReviewAsAdmin(r)} className="ml-auto text-xs font-medium text-red-700 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
                {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-charcoal/75">{r.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-charcoal/60">No reviews yet.</p>
        )}
      </section>
    </div>
  );
}
