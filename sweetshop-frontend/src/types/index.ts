export type Role = "CUSTOMER" | "ADMIN";

export type OrderStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type FulfillmentType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export type PaymentMethod = "COD" | "RAZORPAY";

export type PaymentStatus = "PENDING" | "PAID";

export interface AuthResponse {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stockQuantity: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface CartItemLine {
  productId: number;
  productName: string;
  unit: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}

export interface Cart {
  items: CartItemLine[];
  totalAmount: number;
}

export interface OrderItemLine {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  contactPhone: string;
  deliveryAddress: string | null;
  items: OrderItemLine[];
  totalAmount: number;
  createdAt: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export interface Review {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
}

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  description: string | null;
  contactPhone: string | null;
  address: string | null;
  email: string | null;
}

export interface OrderMessage {
  id: number;
  orderId: number;
  senderId: number;
  senderName: string;
  senderRole: Role;
  message: string;
  createdAt: string;
}

export interface ImageUploadResponse {
  url: string;
}

export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}
