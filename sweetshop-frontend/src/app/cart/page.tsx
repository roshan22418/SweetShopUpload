"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { ApiError, resolveImageUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import QuantityStepper from "@/components/QuantityStepper";

export default function CartPage() {
  const { user } = useAuth();
  const { cart, cartLoading, itemCount, setQuantity, removeItem } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<number | null>(null);

  async function updateQuantity(productId: number, quantity: number) {
    setError(null);
    setBusyProductId(productId);
    try {
      await setQuantity(productId, quantity);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update quantity.");
    } finally {
      setBusyProductId(null);
    }
  }

  async function handleRemove(productId: number) {
    setError(null);
    setBusyProductId(productId);
    try {
      await removeItem(productId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove item.");
    } finally {
      setBusyProductId(null);
    }
  }

  if (cartLoading) {
    return (
      <div className="mx-auto max-w-4xl" aria-busy="true">
        <h1 className="page-title mb-6">Your cart</h1>
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="card flex animate-pulse items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-gold-light/40" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-gold-light/40" />
                <div className="h-3 w-1/4 rounded bg-gold-light/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="page-title mb-6">Your cart</h1>
        <div className="rounded-2xl border border-dashed border-gold-light py-16 text-center text-charcoal/60">
          <p className="text-4xl">🛒</p>
          <p className="mt-3">Your cart is empty.</p>
          <Link href="/" className="btn-primary mt-4">
            Browse the menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h1 className="page-title">Your cart</h1>
        <span className="text-sm text-charcoal/60">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
      </div>

      {error && <p className="alert-error mb-4">{error}</p>}
      {!user && (
        <p className="mb-4 rounded-md bg-gold-light/40 px-4 py-2 text-sm text-ink">
          Browsing as a guest — your cart is kept on this device. You&apos;ll log in or register at checkout.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ul className="flex flex-col gap-3 lg:col-span-2">
          {cart.items.map((item) => {
            const busy = busyProductId === item.productId;
            return (
              <li key={item.productId} className={`card flex gap-4 p-4 transition ${busy ? "opacity-60" : ""}`}>
                <Link href={`/products/${item.productId}`} className="flex-none">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(item.imageUrl)}
                      alt={item.productName}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gold-light/30 text-3xl">🍰</div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.productId}`} className="font-medium text-ink hover:text-plum">
                      {item.productName}
                    </Link>
                    <p className="text-sm text-charcoal/60">
                      {formatPrice(item.price)} / {item.unit}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(q) => updateQuantity(item.productId, q)}
                      disabled={busy}
                      label={`Quantity of ${item.productName}`}
                    />
                    <span className="w-24 text-right font-semibold text-ink">{formatPrice(item.subtotal)}</span>
                    <button
                      disabled={busy}
                      onClick={() => handleRemove(item.productId)}
                      aria-label={`Remove ${item.productName}`}
                      className="rounded-full p-2 text-charcoal/50 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                        <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7M9 7V4.5h6V7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card">
            <h2 className="section-title mb-3">Order summary</h2>
            <div className="flex justify-between text-sm text-charcoal/70">
              <span>
                Items ({itemCount})
              </span>
              <span>{formatPrice(cart.totalAmount)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-gold-light/60 pt-3 text-lg font-semibold text-ink">
              <span>Total</span>
              <span>{formatPrice(cart.totalAmount)}</span>
            </div>
            <Link href="/checkout" className="btn-primary mt-4 w-full py-2.5">
              {user ? "Proceed to checkout" : "Log in to check out"}
            </Link>
            <Link href="/" className="mt-3 block text-center text-sm font-medium text-plum hover:underline">
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
