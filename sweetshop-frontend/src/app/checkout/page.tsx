"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Order, FulfillmentType, PaymentMethod, RazorpayOrderResponse, ShopSettings, UserProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { loadRazorpayScript, RazorpaySuccessResponse } from "@/lib/razorpay";

const FULFILLMENT_OPTIONS: { value: FulfillmentType; label: string; description: string }[] = [
  { value: "DINE_IN", label: "Dine In", description: "Eat at the shop" },
  { value: "TAKEAWAY", label: "Takeaway", description: "Pick up at the counter" },
  { value: "DELIVERY", label: "Delivery", description: "Delivered to your address" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "COD", label: "Pay at counter / on delivery", description: "Cash or UPI when you receive your order" },
  { value: "RAZORPAY", label: "Pay online now", description: "Cards, UPI, netbanking & wallets via Razorpay" },
];

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { cart, refreshCart } = useCart();
  const router = useRouter();

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/checkout");
    }
  }, [loading, user, router]);

  // Pre-fill from whatever phone number was used most recently (saved to the profile after
  // each order below) — still fully editable, for a one-off order to a different number.
  useEffect(() => {
    if (!user) return;
    apiFetch<UserProfile>("/api/users/me")
      .then((profile) => {
        if (profile.phoneNumber) setContactPhone((current) => current || profile.phoneNumber!);
      })
      .catch(() => {});
  }, [user]);

  // Best-effort: remember whatever number was actually used for next time. Never blocks
  // or fails checkout if this secondary write doesn't go through.
  function rememberPhoneNumber() {
    if (!user) return;
    apiFetch("/api/users/me", {
      method: "PUT",
      body: JSON.stringify({ fullName: user.fullName, phoneNumber: contactPhone }),
    }).catch(() => {});
  }

  async function placeOrder(paymentFields?: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const order = await apiFetch<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        fulfillmentType,
        contactPhone,
        deliveryAddress: fulfillmentType === "DELIVERY" ? deliveryAddress : undefined,
        paymentMethod: paymentFields ? "RAZORPAY" : "COD",
        ...paymentFields,
      }),
    });
    rememberPhoneNumber();
    await refreshCart();
    router.push(`/orders/${order.id}`);
  }

  async function handlePayOnline() {
    const razorpayOrder = await apiFetch<RazorpayOrderResponse>("/api/payments/razorpay/order", {
      method: "POST",
    });

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      throw new Error("Could not load the payment gateway. Check your connection and try again.");
    }

    const shopName = await apiFetch<ShopSettings>("/api/shop-settings")
      .then((s) => s.shopName)
      .catch(() => "KING CAKE PLACE");

    return new Promise<void>((resolve, reject) => {
      const razorpay = new window.Razorpay!({
        key: razorpayOrder.keyId,
        amount: Math.round(razorpayOrder.amount * 100),
        currency: razorpayOrder.currency,
        name: shopName,
        description: "Order payment",
        order_id: razorpayOrder.razorpayOrderId,
        theme: { color: "#d97706" },
        handler: (response: RazorpaySuccessResponse) => {
          placeOrder({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(resolve)
            .catch(reject);
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled.")),
        },
      });
      razorpay.open();
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (paymentMethod === "RAZORPAY") {
        await handlePayOnline();
      } else {
        await placeOrder();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  if (!cart || cart.items.length === 0) {
    return <p className="text-gray-500">Your cart is empty. Add some items before checking out.</p>;
  }

  const submitLabel = submitting
    ? paymentMethod === "RAZORPAY"
      ? "Waiting for payment..."
      : "Placing order..."
    : paymentMethod === "RAZORPAY"
      ? `Pay ₹${cart.totalAmount} & Place Order`
      : "Place Order";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="mb-3 block text-sm font-semibold text-gray-800">Fulfillment</label>
            <div className="grid grid-cols-3 gap-2">
              {FULFILLMENT_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setFulfillmentType(opt.value)}
                  className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                    fulfillmentType === opt.value
                      ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <p className="font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </button>
              ))}
            </div>

            {fulfillmentType === "DELIVERY" && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Delivery address</label>
                <textarea
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact phone</label>
              <input
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="For order updates / delivery"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">Saved for next time — you can still change it per order.</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="mb-3 block text-sm font-semibold text-gray-800">Payment</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                    paymentMethod === opt.value
                      ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <p className="font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-20 lg:col-span-1 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-800">Order summary</p>
            <div className="flex flex-col gap-1.5">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm text-gray-600">
                  <span className="truncate pr-2">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="flex-shrink-0">₹{item.subtotal}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>₹{cart.totalAmount}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-md bg-amber-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
