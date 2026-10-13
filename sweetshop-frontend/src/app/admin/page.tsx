"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Order, Product } from "@/types";
import { FULFILLMENT_LABELS, STATUS_LABELS, STATUS_STYLES, formatDate, formatPrice } from "@/lib/format";

const LOW_STOCK = 5;

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-charcoal/60">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card p-4 transition hover:border-gold">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

// The shop owner's first screen: what needs attention right now, computed from the same endpoints the
// Orders and Products tabs use (no extra backend needed at this scale).
export default function AdminOverviewPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    apiFetch<Order[]>("/api/orders/all").then(setOrders).catch(() => setOrders([]));
    apiFetch<Product[]>("/api/products").then(setProducts).catch(() => setProducts([]));
  }, []);

  if (!orders || !products) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-gold-light/20" />
        ))}
      </div>
    );
  }

  const today = orders.filter((o) => isToday(o.createdAt) && o.status !== "CANCELLED");
  const revenueToday = today.reduce((sum, o) => sum + o.totalAmount, 0);
  const pending = orders.filter((o) => o.status === "PENDING");
  const inProgress = orders.filter((o) => o.status === "CONFIRMED");
  const lowStock = products
    .filter((p) => p.isAvailable && p.stockQuantity <= LOW_STOCK)
    .sort((a, b) => a.stockQuantity - b.stockQuantity);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders today" value={String(today.length)} hint="not counting cancelled" />
        <Stat label="Sales today" value={formatPrice(revenueToday)} />
        <Stat
          label="Waiting to confirm"
          value={String(pending.length)}
          hint={pending.length ? "tap to review" : "all caught up"}
          href="/admin/orders?view=pending"
        />
        <Stat label="Running low" value={String(lowStock.length)} hint={`${LOW_STOCK} or fewer left`} href="/admin/products?filter=low" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="section-title">Latest orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-plum hover:underline">
              All orders →
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-charcoal/60">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-gold-light/50">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      #{o.id} · {o.customerName}
                    </p>
                    <p className="text-xs text-charcoal/55">
                      {formatDate(o.createdAt)} · {FULFILLMENT_LABELS[o.fulfillmentType]}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    <span className="font-medium text-ink">{formatPrice(o.totalAmount)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {inProgress.length > 0 && (
            <p className="mt-3 text-xs text-charcoal/60">
              {inProgress.length} confirmed order{inProgress.length === 1 ? "" : "s"} still being prepared.
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="section-title mb-3">Running low</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-charcoal/60">Everything on sale is well stocked.</p>
          ) : (
            <ul className="divide-y divide-gold-light/50">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/admin/products?edit=${p.id}`} className="min-w-0 truncate text-ink hover:text-plum">
                    {p.name}
                  </Link>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.stockQuantity === 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {p.stockQuantity === 0 ? "Sold out" : `${p.stockQuantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
