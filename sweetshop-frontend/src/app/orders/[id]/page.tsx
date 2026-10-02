"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Order } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { STATUS_STYLES, PAYMENT_METHOD_LABELS, formatDate } from "@/lib/format";
import OrderMessages from "@/components/OrderMessages";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      apiFetch<Order>(`/api/orders/${id}`)
        .then(setOrder)
        .catch(() => setNotFound(true));
    }
  }, [user, id]);

  if (loading || !user) return null;

  if (notFound) {
    return <p className="text-gray-500">Order not found.</p>;
  }

  if (!order) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">Order #{order.id}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}>
          {order.status}
        </span>
      </div>

      <p className="mb-6 text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>

      <div className="mb-6 rounded-lg border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-gray-900">Items</h2>
        {order.items.map((item) => (
          <div key={item.productId} className="flex justify-between py-1 text-sm text-gray-600">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>₹{item.subtotal}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
          <span>Total</span>
          <span>₹{order.totalAmount}</span>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-gray-900">Fulfillment</h2>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">Type:</span> {order.fulfillmentType.replace("_", " ")}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">Contact:</span> {order.contactPhone}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">Payment:</span> {PAYMENT_METHOD_LABELS[order.paymentMethod]}
        </p>
        {order.deliveryAddress && (
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-800">Address:</span> {order.deliveryAddress}
          </p>
        )}
      </div>

      <OrderMessages orderId={order.id} />
    </div>
  );
}
