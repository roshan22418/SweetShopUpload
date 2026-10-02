"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError, resolveImageUrl } from "@/lib/api";
import { Product, ReviewSummary } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { playPopSound } from "@/lib/sound";
import QuantityStepper from "@/components/QuantityStepper";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { getQuantity, incrementItem, decrementItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  function loadReviews() {
    apiFetch<ReviewSummary>(`/api/products/${id}/reviews`).then(setReviews).catch(() => {});
  }

  useEffect(() => {
    apiFetch<Product>(`/api/products/${id}`)
      .then(setProduct)
      .catch(() => setNotFound(true));
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    try {
      await incrementItem(product, quantity);
      playPopSound();
      setQuantity(1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add to cart.");
      setTimeout(() => setMessage(null), 2500);
    } finally {
      setAdding(false);
    }
  }

  async function handleIncrementInCart() {
    if (!product) return;
    try {
      await incrementItem(product);
      playPopSound();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update cart.");
      setTimeout(() => setMessage(null), 2500);
    }
  }

  async function handleDecrementInCart() {
    try {
      await decrementItem(Number(id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update cart.");
      setTimeout(() => setMessage(null), 2500);
    }
  }

  async function handleSubmitReview() {
    setReviewError(null);
    setSubmittingReview(true);
    try {
      await apiFetch(`/api/products/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      setComment("");
      loadReviews();
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-5xl">🍰</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Product not found</h1>
        <p className="mt-2 text-gray-500">
          This item isn&apos;t available anymore — it may have been removed from sale.
        </p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
          Browse products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center py-20 text-gray-400">
        <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  const subtotal = (product.price * quantity).toFixed(2);
  const qtyInCart = getQuantity(product.id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid grid-cols-1 gap-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(product.imageUrl)}
            alt={product.name}
            className="h-72 w-full rounded-xl object-cover shadow-md md:h-80"
          />
        ) : (
          <div className="flex h-72 items-center justify-center rounded-xl bg-amber-50 text-7xl md:h-80">
            🍰
          </div>
        )}

        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{product.categoryName}</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{product.name}</h1>
          {reviews && reviews.reviewCount > 0 && (
            <p className="mt-2 text-sm text-amber-700">
              ★ {reviews.averageRating} ({reviews.reviewCount} review{reviews.reviewCount === 1 ? "" : "s"})
            </p>
          )}
          <p className="mt-3 leading-relaxed text-gray-600">{product.description}</p>

          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-900">₹{product.price}</span>
            <span className="text-sm text-gray-500">/ {product.unit}</span>
          </div>

          {!product.isAvailable ? (
            <p className="mt-1 text-sm font-medium text-red-600">Currently unavailable</p>
          ) : product.stockQuantity <= 0 ? (
            <p className="mt-1 text-sm font-medium text-red-600">Out of stock</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">{product.stockQuantity} in stock</p>
          )}

          <div className="mt-auto pt-6">
            {message && (
              <div className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                {message}
              </div>
            )}

            {qtyInCart > 0 ? (
              <div className="flex items-center gap-4">
                <QuantityStepper
                  value={qtyInCart}
                  min={0}
                  max={product.stockQuantity}
                  onChange={(next) =>
                    next > qtyInCart ? handleIncrementInCart() : handleDecrementInCart()
                  }
                />
                <span className="text-sm font-medium text-green-700">
                  ✓ In your cart · ₹{(product.price * qtyInCart).toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  max={product.stockQuantity}
                  disabled={!product.isAvailable || product.stockQuantity <= 0}
                />
                <button
                  disabled={!product.isAvailable || product.stockQuantity <= 0 || adding}
                  onClick={handleAddToCart}
                  className="flex-1 rounded-md bg-amber-600 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {!product.isAvailable
                    ? "Unavailable"
                    : product.stockQuantity <= 0
                      ? "Out of Stock"
                      : adding
                        ? "Adding..."
                        : `Add to Cart · ₹${subtotal}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Reviews</h2>

        {user && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-amber-50/40 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Leave a review</p>
            {reviewError && <p className="mb-2 text-sm text-red-600">{reviewError}</p>}
            <div className="mb-2 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-2xl transition hover:scale-110 ${n <= rating ? "text-amber-500" : "text-gray-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              rows={2}
            />
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="mt-2 rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
            <p className="mt-1 text-xs text-gray-400">
              You can only review products you&apos;ve ordered.
            </p>
          </div>
        )}

        {reviews && reviews.reviews.length > 0 ? (
          <div className="flex flex-col gap-4">
            {reviews.reviews.map((r) => (
              <div key={r.id} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="text-sm font-medium text-gray-800">{r.userName}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        )}
      </section>
    </div>
  );
}
