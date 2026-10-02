"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Order, OrderStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { STATUS_STYLES, PAYMENT_METHOD_LABELS, formatDate } from "@/lib/format";

const ACTIVE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];
const HISTORY_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

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

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-amber-900">
        {view === "history" ? "Order History" : "My Orders"}
      </h1>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <Link
          href="/orders?view=active"
          className={`px-4 py-2 text-sm font-medium ${
            view === "active" ? "border-b-2 border-amber-600 text-amber-800" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          My Orders
        </Link>
        <Link
          href="/orders?view=history"
          className={`px-4 py-2 text-sm font-medium ${
            view === "history" ? "border-b-2 border-amber-600 text-amber-800" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Order History
        </Link>
      </div>

      {!orders ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500">
          <p>
            {view === "history"
              ? "No completed or cancelled orders yet."
              : "You don't have any orders in progress."}
          </p>
          <Link href="/" className="mt-2 inline-block text-amber-700 hover:underline">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-amber-300"
            >
              <div>
                <p className="font-medium text-gray-900">Order #{o.id}</p>
                <p className="text-sm text-gray-500">
                  {formatDate(o.createdAt)} · {o.fulfillmentType.replace("_", " ")} · {o.items.length} item
                  {o.items.length === 1 ? "" : "s"} · {PAYMENT_METHOD_LABELS[o.paymentMethod]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">₹{o.totalAmount}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[o.status]}`}>
                  {o.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
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
