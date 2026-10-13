import { OrderStatus, PaymentMethod } from "@/types";

export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
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
