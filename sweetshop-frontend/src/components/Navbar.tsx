"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ShopSettings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import CrownMark from "@/components/CrownMark";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [shopName, setShopName] = useState("KING CAKE PLACE");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    apiFetch<ShopSettings>("/api/shop-settings")
      .then((settings) => {
        setShopName(settings.shopName);
        document.title = settings.shopName;
      })
      .catch(() => {});
  }, []);

  // Sits flush with the page at rest; scrolling brings up the frosted-glass
  // look (deeper blur, a visible edge) so the bar reads as "now floating
  // above the content" rather than looking identical the whole time.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    logout();
    router.push("/");
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md transition-all duration-300 ${
        scrolled
          ? "border-b border-gold-light/60 bg-cream/75 shadow-[0_1px_16px_rgba(36,21,18,0.08)]"
          : "border-b border-transparent bg-cream/40"
      }`}
    >

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-medium text-ink">
          <CrownMark className="h-5 w-5 text-gold" />
          {shopName}
        </Link>

        <div className="flex items-center gap-5 text-sm font-medium text-ink">
          <Link href="/" className="hover:text-plum">
            Home
          </Link>

          {/* Admin is a shop-owner account, not a shopper — no personal cart/order history to show them. */}
          {user && !isAdmin && (
            <Link href="/orders" className="hover:text-plum">
              My Orders
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin" className="hover:text-plum">
              Admin
            </Link>
          )}

          {/* Cart works for guests too (a local cart) — only checkout requires an account. */}
          {!isAdmin && (
            <Link href="/cart" className="relative hover:text-plum">
              Cart
              {itemCount > 0 && (
                <span className="absolute -right-3 -top-2 rounded-full bg-gold px-1.5 text-xs text-ink">
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-plum hover:underline">
                Hi, {user.fullName.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md border border-gold-light px-3 py-1 hover:bg-gold-light/30"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="hover:text-plum">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-gold px-3 py-1.5 font-semibold text-ink hover:bg-gold-light"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
