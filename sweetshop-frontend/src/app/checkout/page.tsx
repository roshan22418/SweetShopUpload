"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { apiFetch, ApiError } from "@/lib/api";
import { Order, FulfillmentType, PaymentMethod, RazorpayOrderResponse, UserProfile } from "@/types";
import { DEFAULT_SHOP_NAME, loadShopSettings, useShopSettings } from "@/lib/shopSettings";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { loadRazorpayScript, RazorpaySuccessResponse } from "@/lib/razorpay";

const FULFILLMENT_OPTIONS: { value: FulfillmentType; label: string; description: string; icon: string }[] = [
  { value: "DINE_IN", label: "Dine in", description: "Eat at the shop", icon: "🍽️" },
  { value: "TAKEAWAY", label: "Takeaway", description: "Pick up at the counter", icon: "🛍️" },
  { value: "DELIVERY", label: "Delivery", description: "Delivered to your door", icon: "🚚" },
];

// Same rule the backend enforces on CheckoutRequest.contactPhone.
// Escaped for the `v` flag browsers compile pattern attributes with (bare parentheses there are an error).
const PHONE_PATTERN = "\\+?[0-9][0-9 \\(\\)\\-]{6,}";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "COD", label: "Pay at counter / on delivery", description: "Cash or UPI when you receive your order" },
  { value: "RAZORPAY", label: "Pay online now", description: "Cards, UPI, netbanking & wallets via Razorpay" },
];

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { cart, cartLoading, refreshCart } = useCart();
  const router = useRouter();
  // Only offered when the shop has Razorpay keys configured; otherwise it would just fail after the click.
  const onlinePaymentEnabled = useShopSettings()?.onlinePaymentEnabled ?? false;

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

    const shopName = (await loadShopSettings())?.shopName ?? DEFAULT_SHOP_NAME;

    return new Promise<void>((resolve, reject) => {
      const razorpay = new window.Razorpay!({
        key: razorpayOrder.keyId,
        amount: Math.round(razorpayOrder.amount * 100),
        currency: razorpayOrder.currency,
        name: shopName,
        description: "Order payment",
        order_id: razorpayOrder.razorpayOrderId,
        theme: { color: "#b8863b" },
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
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (paymentMethod === "RAZORPAY") {
        await handlePayOnline();
      } else {
        await placeOrder();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Checkout failed. Please try again.");
      if (err instanceof ApiError && err.fieldErrors) setFieldErrors(err.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  if (cartLoading) {
    return (
      <div className="mx-auto max-w-5xl" aria-busy="true">
        <h1 className="page-title mb-6">Checkout</h1>
        <div className="card h-48 animate-pulse bg-gold-light/20" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-4xl">🛒</p>
        <h1 className="page-title mt-3">Your cart is empty</h1>
        <p className="mt-2 text-charcoal/60">Add a few treats before checking out.</p>
        <Link href="/" className="btn-primary mt-6">
          Browse the menu
        </Link>
      </div>
    );
  }

  const submitLabel = submitting
    ? paymentMethod === "RAZORPAY"
      ? "Waiting for payment..."
      : "Placing order..."
    : paymentMethod === "RAZORPAY"
      ? `Pay ${formatPrice(cart.totalAmount)} & place order`
      : "Place order";

  const optionClass = (selected: boolean) =>
    `rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
      selected ? "border-gold bg-gold-light/25 ring-1 ring-gold" : "border-gold-light/70 bg-white hover:border-gold"
    }`;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="page-title mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {error && (
            <p className="alert-error" role="alert">
              {error}
            </p>
          )}

          <fieldset className="card">
            <legend className="section-title float-left mb-4 w-full">1. How would you like it?</legend>
            <div className="clear-both grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FULFILLMENT_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  aria-pressed={fulfillmentType === opt.value}
                  onClick={() => setFulfillmentType(opt.value)}
                  className={optionClass(fulfillmentType === opt.value)}
                >
                  <span className="text-xl" aria-hidden="true">
                    {opt.icon}
                  </span>
                  <p className="mt-1 font-semibold text-ink">{opt.label}</p>
                  <p className="text-xs text-charcoal/60">{opt.description}</p>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="card">
            <legend className="section-title float-left mb-4 w-full">2. Your details</legend>
            <div className="clear-both flex flex-col gap-4">
              {fulfillmentType === "DELIVERY" && (
                <div>
                  <label htmlFor="deliveryAddress" className="field-label">
                    Delivery address
                  </label>
                  <textarea
                    id="deliveryAddress"
                    required
                    minLength={10}
                    maxLength={500}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                    placeholder="House / flat, street, area, city"
                    className="field"
                  />
                  {fieldErrors.deliveryAddress && <p className="mt-1 text-xs text-red-700">{fieldErrors.deliveryAddress}</p>}
                </div>
              )}

              <div>
                <label htmlFor="contactPhone" className="field-label">
                  Contact phone
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  maxLength={20}
                  pattern={PHONE_PATTERN}
                  title="A phone number, e.g. 9876543210 or +91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="For order updates / delivery"
                  className="field"
                />
                {fieldErrors.contactPhone ? (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.contactPhone}</p>
                ) : (
                  <p className="mt-1 text-xs text-charcoal/50">Saved for next time — you can still change it per order.</p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="card">
            <legend className="section-title float-left mb-4 w-full">3. Payment</legend>
            <div className="clear-both grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const unavailable = opt.value === "RAZORPAY" && !onlinePaymentEnabled;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    disabled={unavailable}
                    aria-pressed={paymentMethod === opt.value}
                    onClick={() => setPaymentMethod(opt.value)}
                    className={optionClass(paymentMethod === opt.value)}
                  >
                    <p className="font-semibold text-ink">{opt.label}</p>
                    <p className="text-xs text-charcoal/60">{unavailable ? "Not available right now" : opt.description}</p>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <aside className="lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <div className="card">
            <h2 className="section-title mb-3">Order summary</h2>
            <ul className="flex flex-col gap-2">
              {cart.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3 text-sm text-charcoal/75">
                  <span className="min-w-0 truncate">
                    {item.productName} <span className="text-charcoal/50">× {item.quantity}</span>
                  </span>
                  <span className="flex-none">{formatPrice(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-gold-light/60 pt-3 text-lg font-semibold text-ink">
              <span>Total</span>
              <span>{formatPrice(cart.totalAmount)}</span>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full py-3">
              {submitLabel}
            </button>
            <Link href="/cart" className="mt-3 block text-center text-sm font-medium text-plum hover:underline">
              Edit cart
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
