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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
