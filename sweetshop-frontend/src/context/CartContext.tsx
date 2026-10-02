"use client";

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { Cart, Product } from "@/types";
import { useAuth } from "@/context/AuthContext";

const GUEST_CART_KEY = "sweetshop_guest_cart";

// A guest cart has nowhere server-side to look up product details, so each
// entry keeps a snapshot of the product as it was when added.
interface GuestCartEntry {
  product: Product;
  quantity: number;
}

function readGuestCart(): GuestCartEntry[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(entries: GuestCartEntry[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
}

function guestCartToCart(entries: GuestCartEntry[]): Cart {
  const items = entries.map((e) => ({
    productId: e.product.id,
    productName: e.product.name,
    unit: e.product.unit,
    price: e.product.price,
    quantity: e.quantity,
    subtotal: Number((e.product.price * e.quantity).toFixed(2)),
    imageUrl: e.product.imageUrl,
  }));
  return { items, totalAmount: Number(items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)) };
}

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  refreshCart: () => Promise<Cart | null>;
  getQuantity: (productId: number) => number;
  incrementItem: (product: Product, quantity?: number) => Promise<Cart | null>;
  decrementItem: (productId: number) => Promise<Cart | null>;
  setQuantity: (productId: number, quantity: number) => Promise<Cart | null>;
  removeItem: (productId: number) => Promise<Cart | null>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);

  const refreshCart = useCallback(async () => {
    if (!user) {
      const c = guestCartToCart(readGuestCart());
      setCart(c);
      return c;
    }
    try {
      const data = await apiFetch<Cart>("/api/cart");
      setCart(data);
      return data;
    } catch {
      setCart(null);
      return null;
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // The moment someone logs in, fold whatever they added while browsing as a
  // guest into their real account cart, then clear the local copy — items
  // survive login instead of being silently dropped right before checkout.
  useEffect(() => {
    if (!user) return;
    const entries = readGuestCart();
    if (entries.length === 0) return;
    localStorage.removeItem(GUEST_CART_KEY);
    (async () => {
      for (const entry of entries) {
        await apiFetch("/api/cart/items", {
          method: "POST",
          body: JSON.stringify({ productId: entry.product.id, quantity: entry.quantity }),
        }).catch(() => {});
      }
      refreshCart();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const getQuantity = useCallback(
    (productId: number) => cart?.items.find((i) => i.productId === productId)?.quantity ?? 0,
    [cart]
  );

  // Additive upsert on the backend — safe to call whether or not the item is already in the cart.
  const incrementItem = useCallback(
    async (product: Product, quantity = 1) => {
      if (!user) {
        const entries = readGuestCart();
        const existing = entries.find((e) => e.product.id === product.id);
        const next = existing
          ? entries.map((e) => (e.product.id === product.id ? { ...e, quantity: e.quantity + quantity } : e))
          : [...entries, { product, quantity }];
        writeGuestCart(next);
        const c = guestCartToCart(next);
        setCart(c);
        return c;
      }
      await apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      return refreshCart();
    },
    [user, refreshCart]
  );

  const setQuantity = useCallback(
    async (productId: number, quantity: number) => {
      if (!user) {
        const entries = readGuestCart();
        const next =
          quantity <= 0
            ? entries.filter((e) => e.product.id !== productId)
            : entries.map((e) => (e.product.id === productId ? { ...e, quantity } : e));
        writeGuestCart(next);
        const c = guestCartToCart(next);
        setCart(c);
        return c;
      }
      if (quantity <= 0) {
        await apiFetch(`/api/cart/items/${productId}`, { method: "DELETE" });
      } else {
        await apiFetch(`/api/cart/items/${productId}`, {
          method: "PUT",
          body: JSON.stringify({ quantity }),
        });
      }
      return refreshCart();
    },
    [user, refreshCart]
  );

  const decrementItem = useCallback(
    (productId: number) => setQuantity(productId, getQuantity(productId) - 1),
    [setQuantity, getQuantity]
  );

  const removeItem = useCallback((productId: number) => setQuantity(productId, 0), [setQuantity]);

  return (
    <CartContext.Provider
      value={{ cart, itemCount, refreshCart, getQuantity, incrementItem, decrementItem, setQuantity, removeItem }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
