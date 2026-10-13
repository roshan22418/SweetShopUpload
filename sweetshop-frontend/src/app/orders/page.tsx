"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Order, OrderStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { FULFILLMENT_LABELS, STATUS_LABELS, STATUS_STYLES, formatDate, formatPrice } from "@/lib/format";

const ACTIVE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];
const HISTORY_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

function itemSummary(order: Order): string {
  const names = order.items.map((i) => `${i.quantity} × ${i.productName}`);
  return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

function OrdersList() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "history" ? "history" : "active";

  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/orders");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      apiFetch<Order[]>("/api/orders").then(setOrders).catch(() => setOrders([]));
    }
  }, [user]);

  if (loading || !user) return null;

  const statuses = view === "history" ? HISTORY_STATUSES : ACTIVE_STATUSES;
  const filtered = (orders ?? []).filter((o) => statuses.includes(o.status));
  const count = (list: OrderStatus[]) => (orders ?? []).filter((o) => list.includes(o.status)).length;

  const tab = (key: "active" | "history", label: string, n: number) => (
    <Link
      href={`/orders?view=${key}`}
      aria-current={view === key ? "page" : undefined}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        view === key ? "border-gold text-ink" : "border-transparent text-charcoal/60 hover:text-ink"
      }`}
    >
      {label}
      {orders && n > 0 && <span className="ml-1.5 rounded-full bg-gold-light/50 px-1.5 text-xs">{n}</span>}
    </Link>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-4">My orders</h1>

      <div className="mb-6 flex gap-2 border-b border-gold-light/70">
        {tab("active", "In progress", count(ACTIVE_STATUSES))}
        {tab("history", "History", count(HISTORY_STATUSES))}
      </div>

      {!orders ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gold-light/20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold-light py-14 text-center text-charcoal/60">
          <p>{view === "history" ? "No completed or cancelled orders yet." : "You don't have any orders in progress."}</p>
          <Link href="/" className="btn-primary mt-4">
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="card flex flex-col gap-2 p-4 transition hover:border-gold sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    Order #{o.id}
                    <span className="ml-2 text-sm font-normal text-charcoal/50">{formatDate(o.createdAt)}</span>
                  </p>
                  <p className="truncate text-sm text-charcoal/70">{itemSummary(o)}</p>
                  <p className="text-xs text-charcoal/50">
                    {FULFILLMENT_LABELS[o.fulfillmentType]} · {o.paymentMethod === "RAZORPAY" ? "Paid online" : "Pay at counter"}
                  </p>
                </div>
                <div className="flex flex-none items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                  <span className="font-semibold text-ink">{formatPrice(o.totalAmount)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersList />
    </Suspense>
  );
}
