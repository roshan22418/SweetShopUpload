"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Order, OrderStatus } from "@/types";
import { STATUS_STYLES, PAYMENT_METHOD_LABELS, formatDate } from "@/lib/format";
import OrderMessages from "@/components/OrderMessages";

const STATUS_OPTIONS: OrderStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

type View = "pending" | "verified" | "history";
type HistoryFilter = "all" | "completed" | "cancelled";

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

  function load() {
    apiFetch<Order[]>("/api/orders/all").then(setOrders).catch(() => setOrders([]));
  }

  useEffect(load, []);

  async function updateStatus(orderId: number, status: OrderStatus) {
    setError(null);
    setUpdatingId(orderId);
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update order status.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (!orders) return <p className="text-gray-500">Loading...</p>;

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

  const emptyMessage =
    view === "pending"
      ? "No pending orders."
      : view === "verified"
        ? "No verified orders in progress."
        : "No orders in history yet.";

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <Link
          href="/admin/orders?view=pending"
          className={`px-4 py-2 text-sm font-medium ${
            view === "pending" ? "border-b-2 border-amber-600 text-amber-800" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Order Pending {pendingCount > 0 && <span className="ml-1 text-xs">({pendingCount})</span>}
        </Link>
        <Link
          href="/admin/orders?view=verified"
          className={`px-4 py-2 text-sm font-medium ${
            view === "verified" ? "border-b-2 border-amber-600 text-amber-800" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Order Verified {verifiedCount > 0 && <span className="ml-1 text-xs">({verifiedCount})</span>}
        </Link>
        <Link
          href="/admin/orders?view=history"
          className={`px-4 py-2 text-sm font-medium ${
            view === "history" ? "border-b-2 border-amber-600 text-amber-800" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Order History {historyCount > 0 && <span className="ml-1 text-xs">({historyCount})</span>}
        </Link>
      </div>

      {view === "history" && (
        <div className="mb-4 flex gap-2">
          {(["all", "completed", "cancelled"] as HistoryFilter[]).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/admin/orders?view=history" : `/admin/orders?view=history&status=${f}`}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                historyFilter === f
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
              }`}
            >
              {f}
            </Link>
          ))}
        </div>
      )}

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <div key={o.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Order #{o.id} — {o.customerName} ({o.customerEmail})
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(o.createdAt)} · {o.fulfillmentType.replace("_", " ")} · {o.contactPhone} ·{" "}
                    {PAYMENT_METHOD_LABELS[o.paymentMethod]}
                  </p>
                  {o.deliveryAddress && (
                    <p className="text-sm text-gray-500">Deliver to: {o.deliveryAddress}</p>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[o.status]}`}>
                  {o.status}
                </span>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-2 text-sm text-gray-600">
                {o.items.map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <span>
                      {item.productName} × {item.quantity}
                    </span>
                    <span>₹{item.subtotal}</span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>₹{o.totalAmount}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Update status:</label>
                  <select
                    value={o.status}
                    disabled={updatingId === o.id}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMessagesId(openMessagesId === o.id ? null : o.id)}
                  className="text-sm text-amber-700 hover:underline"
                >
                  {openMessagesId === o.id ? "Hide messages" : "Messages"}
                </button>
              </div>

              {openMessagesId === o.id && (
                <div className="mt-3">
                  <OrderMessages orderId={o.id} />
                </div>
              )}
            </div>
          ))}
        </div>
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
