"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { FulfillmentType, Order, OrderStatus, Product } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  FULFILLMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  formatDate,
  formatPrice,
} from "@/lib/format";
import OrderMessages from "@/components/OrderMessages";

const FINAL_STEP: Record<FulfillmentType, string> = {
  DINE_IN: "Served",
  TAKEAWAY: "Picked up",
  DELIVERY: "Delivered",
};

function ProgressTracker({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
        This order was cancelled{order.paymentMethod === "RAZORPAY" ? " — the shop will arrange your refund." : "."}
      </div>
    );
  }
  const steps: { label: string; reached: OrderStatus[] }[] = [
    { label: "Placed", reached: ["PENDING", "CONFIRMED", "COMPLETED"] },
    { label: "Confirmed", reached: ["CONFIRMED", "COMPLETED"] },
    { label: FINAL_STEP[order.fulfillmentType], reached: ["COMPLETED"] },
  ];
  return (
    <ol className="flex items-start" aria-label="Order progress">
      {steps.map((step, i) => {
        const done = step.reached.includes(order.status);
        return (
          <li key={step.label} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : done ? "bg-gold" : "bg-gold-light"}`} />
              <span
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 text-sm font-semibold ${
                  done ? "border-gold bg-gold text-ink" : "border-gold-light bg-cream text-charcoal/40"
                }`}
                aria-hidden="true"
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? "invisible" : steps[i + 1].reached.includes(order.status) ? "bg-gold" : "bg-gold-light"}`} />
            </div>
            <span className={`mt-2 text-xs font-medium ${done ? "text-ink" : "text-charcoal/50"}`}>
              {step.label}
              <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const { incrementItem } = useCart();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<"cancel" | "reorder" | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=/orders/${id}`);
    }
  }, [loading, user, router, id]);

  useEffect(() => {
    if (user) {
      apiFetch<Order>(`/api/orders/${id}`)
        .then(setOrder)
        .catch(() => setNotFound(true));
    }
  }, [user, id]);

  async function cancelOrder() {
    if (!order || !confirm(`Cancel order #${order.id}? This can't be undone.`)) return;
    setNotice(null);
    setBusy("cancel");
    try {
      setOrder(await apiFetch<Order>(`/api/orders/${order.id}/cancel`, { method: "POST" }));
      setNotice({ kind: "success", text: "Your order has been cancelled. The shop has been notified." });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "Couldn't cancel the order." });
    } finally {
      setBusy(null);
    }
  }

  // Adds each line again at today's price; anything sold out or no longer on sale is reported, not silently dropped.
  async function orderAgain() {
    if (!order) return;
    setNotice(null);
    setBusy("reorder");
    const skipped: string[] = [];
    for (const item of order.items) {
      try {
        const product = await apiFetch<Product>(`/api/products/${item.productId}`);
        await incrementItem(product, item.quantity);
      } catch {
        skipped.push(item.productName);
      }
    }
    setBusy(null);
    if (skipped.length === order.items.length) {
      setNotice({ kind: "error", text: "None of these items can be ordered right now." });
    } else if (skipped.length > 0) {
      setNotice({ kind: "error", text: `Added to your cart, except: ${skipped.join(", ")} (not available in that quantity).` });
    } else {
      router.push("/cart");
    }
  }

  if (loading || !user) return null;

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="page-title">Order not found</h1>
        <Link href="/orders" className="btn-primary mt-6">
          Back to my orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return <div className="card mx-auto h-64 max-w-2xl animate-pulse bg-gold-light/20" aria-busy="true" />;
  }

  const canCancel = user.role === "CUSTOMER" && order.status === "PENDING" && order.paymentMethod === "COD";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/orders" className="text-sm font-medium text-plum hover:underline">
        ← My orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Order #{order.id}</h1>
          <p className="mt-1 text-sm text-charcoal/60">Placed {formatDate(order.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="card">
        <ProgressTracker order={order} />
      </div>

      {notice && <p className={notice.kind === "error" ? "alert-error" : "alert-success"}>{notice.text}</p>}

      <div className="card">
        <h2 className="section-title mb-3">Items</h2>
        <ul className="divide-y divide-gold-light/50">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3 py-2 text-sm">
              <Link href={`/products/${item.productId}`} className="text-ink hover:text-plum">
                {item.productName} <span className="text-charcoal/50">× {item.quantity}</span>
              </Link>
              <span className="text-charcoal/80">{formatPrice(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-gold-light/60 pt-3 font-semibold text-ink">
          <span>Total</span>
          <span>{formatPrice(order.totalAmount)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {user.role === "CUSTOMER" && (
            <button onClick={orderAgain} disabled={busy !== null} className="btn-primary">
              {busy === "reorder" ? "Adding to cart..." : "Order again"}
            </button>
          )}
          {canCancel && (
            <button onClick={cancelOrder} disabled={busy !== null} className="btn-danger">
              {busy === "cancel" ? "Cancelling..." : "Cancel order"}
            </button>
          )}
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Fulfilment</p>
          <p className="mt-0.5 text-ink">{FULFILLMENT_LABELS[order.fulfillmentType]}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Payment</p>
          <p className="mt-0.5 text-ink">
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            {order.paymentMethod === "COD" && order.paymentStatus === "PENDING" && (
              <span className="text-charcoal/60"> · due {formatPrice(order.totalAmount)}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Contact</p>
          <p className="mt-0.5 text-ink">{order.contactPhone}</p>
        </div>
        {order.deliveryAddress && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Deliver to</p>
            <p className="mt-0.5 text-ink">{order.deliveryAddress}</p>
          </div>
        )}
      </div>

      <OrderMessages orderId={order.id} />
    </div>
  );
}
