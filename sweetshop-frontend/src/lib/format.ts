import { FulfillmentType, OrderStatus, PaymentMethod } from "@/types";

export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-sky-100 text-sky-900",
  COMPLETED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-red-100 text-red-800",
};

/** What a customer reads instead of the raw enum. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Received",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  DINE_IN: "Dine in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "💵 Pay at counter",
  RAZORPAY: "💳 Paid online",
};

const RUPEES = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const RUPEES_AND_PAISE = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/**
 * The one way to show money: Indian digit grouping, paise only when there are any —
 * 650 -> "₹650", 549.5 -> "₹549.50", 125000 -> "₹1,25,000".
 */
export function formatPrice(amount: number): string {
  return Number.isInteger(Math.round(amount * 100) / 100) ? RUPEES.format(amount) : RUPEES_AND_PAISE.format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
