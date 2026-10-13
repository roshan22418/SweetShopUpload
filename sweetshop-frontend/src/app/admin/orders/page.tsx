"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Order, OrderStatus } from "@/types";
import {
  FULFILLMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  formatDate,
  formatPrice,
} from "@/lib/format";
import { playPopSound } from "@/lib/sound";
import OrderMessages from "@/components/OrderMessages";

type View = "pending" | "verified" | "history";
type HistoryFilter = "all" | "completed" | "cancelled";

// Mirrors OrderStatus.canTransitionTo on the backend: fulfilment only moves forward, and
// COMPLETED / CANCELLED are final (cancelling puts the stock back).
const NEXT_STEPS: Record<OrderStatus, { status: OrderStatus; label: string; confirm?: string; style: string }[]> = {
  PENDING: [
    { status: "CONFIRMED", label: "Confirm order", style: "btn-primary" },
    { status: "COMPLETED", label: "Mark completed", confirm: "Mark this order completed? This can't be undone.", style: "btn-secondary" },
    { status: "CANCELLED", label: "Cancel", confirm: "Cancel this order? Its stock goes back on sale and this can't be undone.", style: "btn-danger" },
  ],
  CONFIRMED: [
    { status: "COMPLETED", label: "Mark completed", confirm: "Mark this order completed? This can't be undone.", style: "btn-primary" },
    { status: "CANCELLED", label: "Cancel", confirm: "Cancel this order? Its stock goes back on sale and this can't be undone.", style: "btn-danger" },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

const REFRESH_MS = 30_000;

function AdminOrdersList() {
  const searchParams = useSearchParams();
  const view: View = (["pending", "verified", "history"] as View[]).includes(searchParams.get("view") as View)
    ? (searchParams.get("view") as View)
    : "pending";
  const historyFilter: HistoryFilter = (["completed", "cancelled"] as HistoryFilter[]).includes(
    searchParams.get("status") as HistoryFilter
  )
    ? (searchParams.get("status") as HistoryFilter)
    : "all";

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [openMessagesId, setOpenMessagesId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [newOrders, setNewOrders] = useState(0);
  const seenIds = useRef<Set<number> | null>(null);

  // Polls so a new order shows up (with a chime) without the owner having to reload the page.
  const load = useCallback(() => {
    apiFetch<Order[]>("/api/orders/all")
      .then((list) => {
        if (seenIds.current) {
          const fresh = list.filter((o) => !seenIds.current!.has(o.id)).length;
          if (fresh > 0) {
            setNewOrders((n) => n + fresh);
            playPopSound();
          }
        }
        seenIds.current = new Set(list.map((o) => o.id));
        setOrders(list);
      })
      .catch(() => setOrders((current) => current ?? []));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function updateStatus(order: Order, step: (typeof NEXT_STEPS)[OrderStatus][number]) {
    if (step.confirm && !confirm(`Order #${order.id}: ${step.confirm}`)) return;
    setError(null);
    setUpdatingId(order.id);
    try {
      const updated = await apiFetch<Order>(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: step.status }),
      });
      setOrders((list) => list?.map((o) => (o.id === updated.id ? updated : o)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update order status.");
      load();
    } finally {
      setUpdatingId(null);
    }
  }

  if (!orders) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="card h-40 animate-pulse bg-gold-light/20" />
        ))}
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const verifiedCount = orders.filter((o) => o.status === "CONFIRMED").length;
  const historyCount = orders.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED").length;

  let filtered: Order[];
  if (view === "pending") {
    filtered = orders.filter((o) => o.status === "PENDING");
  } else if (view === "verified") {
    filtered = orders.filter((o) => o.status === "CONFIRMED");
  } else {
    filtered = orders.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");
    if (historyFilter === "completed") filtered = filtered.filter((o) => o.status === "COMPLETED");
    if (historyFilter === "cancelled") filtered = filtered.filter((o) => o.status === "CANCELLED");
  }
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (q) {
    filtered = filtered.filter(
      (o) =>
        String(o.id) === q ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.contactPhone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\u0000")
    );
  }

  const emptyMessage = q
    ? "No orders match your search."
    : view === "pending"
      ? "No new orders — all caught up."
      : view === "verified"
        ? "Nothing being prepared right now."
        : "No orders in history yet.";

  const tab = (key: View, label: string, count: number) => (
    <Link
      href={`/admin/orders?view=${key}`}
      aria-current={view === key ? "page" : undefined}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
        view === key ? "bg-ink text-cream" : "bg-gold-light/30 text-ink hover:bg-gold-light/50"
      }`}
    >
      {label}
      {count > 0 && <span className="ml-1.5 text-xs opacity-80">{count}</span>}
    </Link>
  );

  return (
    <div>
      {newOrders > 0 && (
        <div className="alert-success mb-4 flex items-center justify-between gap-3" role="status">
          <span>
            🛎️ {newOrders} new order{newOrders === 1 ? "" : "s"} just came in.
          </span>
          <button onClick={() => setNewOrders(0)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tab("pending", "New", pendingCount)}
          {tab("verified", "Preparing", verifiedCount)}
          {tab("history", "History", historyCount)}
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order #, customer or phone"
            className="field"
          />
        </div>
      </div>

      {view === "history" && (
        <div className="mb-4 flex gap-2">
          {(["all", "completed", "cancelled"] as HistoryFilter[]).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/admin/orders?view=history" : `/admin/orders?view=history&status=${f}`}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                historyFilter === f ? "bg-plum text-cream" : "bg-gold-light/30 text-ink hover:bg-gold-light/50"
              }`}
            >
              {f}
            </Link>
          ))}
        </div>
      )}

      {error && <p className="alert-error mb-4">{error}</p>}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold-light py-12 text-center text-charcoal/60">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((o) => (
            <li key={o.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    Order #{o.id} · {o.customerName}
                  </p>
                  <p className="text-sm text-charcoal/60">
                    {formatDate(o.createdAt)} · {FULFILLMENT_LABELS[o.fulfillmentType]} ·{" "}
                    <a href={`tel:${o.contactPhone.replace(/[^\d+]/g, "")}`} className="text-plum hover:underline">
                      {o.contactPhone}
                    </a>{" "}
                    · {PAYMENT_METHOD_LABELS[o.paymentMethod]}
                  </p>
                  {o.deliveryAddress && <p className="text-sm text-charcoal/70">Deliver to: {o.deliveryAddress}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>

              <ul className="mt-3 border-t border-gold-light/50 pt-2 text-sm text-charcoal/80">
                {o.items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-3">
                    <span>
                      {item.productName} <span className="text-charcoal/50">× {item.quantity}</span>
                    </span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </li>
                ))}
                <li className="mt-1 flex justify-between font-semibold text-ink">
                  <span>Total</span>
                  <span>{formatPrice(o.totalAmount)}</span>
                </li>
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {NEXT_STEPS[o.status].map((step) => (
                    <button
                      key={step.status}
                      disabled={updatingId === o.id}
                      onClick={() => updateStatus(o, step)}
                      className={`${step.style} px-3 py-1.5`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMessagesId(openMessagesId === o.id ? null : o.id)}
                  className="text-sm font-medium text-plum hover:underline"
                >
                  {openMessagesId === o.id ? "Hide messages" : "Messages"}
                </button>
              </div>

              {openMessagesId === o.id && (
                <div className="mt-3">
                  <OrderMessages orderId={o.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={null}>
      <AdminOrdersList />
    </Suspense>
  );
}
