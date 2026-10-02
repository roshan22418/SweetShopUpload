"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, resolveImageUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import QuantityStepper from "@/components/QuantityStepper";

export default function CartPage() {
  const { user } = useAuth();
  const { cart, setQuantity, removeItem } = useCart();
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
    setBusyProductId(productId);
    try {
      await removeItem(productId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove item.");
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-medium text-ink">Your Cart</h1>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!cart || cart.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold-light py-16 text-center text-charcoal/60">
          <p className="text-4xl">🛒</p>
          <p className="mt-3">Your cart is empty.</p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-light"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <>
          {!user && (
            <p className="mb-4 rounded-md bg-gold-light/40 px-4 py-2 text-sm text-ink">
              Browsing as a guest — you&apos;ll need to login or register to check out.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 rounded-xl border border-gold-light/50 bg-cream p-4"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(item.imageUrl)}
                    alt={item.productName}
                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gold-light/20 text-2xl">
                    🍰
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{item.productName}</p>
                  <p className="text-sm text-charcoal/60">
                    ₹{item.price} / {item.unit}
                  </p>
                </div>

                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => updateQuantity(item.productId, q)}
                  disabled={busyProductId === item.productId}
                />

                <span className="w-20 flex-shrink-0 text-right font-semibold text-ink">₹{item.subtotal}</span>

                <button
                  disabled={busyProductId === item.productId}
                  onClick={() => handleRemove(item.productId)}
                  className="flex-shrink-0 text-sm text-plum hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-gold-light/50 bg-gold-light/20 p-4">
            <span className="text-lg font-semibold text-ink">Total: ₹{cart.totalAmount}</span>
            <Link
              href="/checkout"
              className="rounded-md bg-gold px-6 py-2.5 font-semibold text-ink shadow-sm transition hover:bg-gold-light"
            >
              {user ? "Proceed to Checkout" : "Login to Checkout"}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
