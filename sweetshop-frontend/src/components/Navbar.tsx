"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_SHOP_NAME, useShopSettings } from "@/lib/shopSettings";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import CrownMark from "@/components/CrownMark";

function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
      <circle cx="9.5" cy="19.5" r="1.2" />
      <circle cx="17" cy="19.5" r="1.2" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const shopName = useShopSettings()?.shopName ?? DEFAULT_SHOP_NAME;
  const [scrolled, setScrolled] = useState(false);
  // The mobile menu remembers the page it was opened on, so navigating anywhere closes it by itself.
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null);
  const menuOpen = menuOpenedOn === pathname;

  // Keep the browser tab in sync with the live shop name (the static <title> is just the first paint).
  useEffect(() => {
    document.title = shopName;
  }, [shopName]);

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

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpenedOn(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpenedOn(null);
    logout();
    router.push("/");
  }

  const isAdmin = user?.role === "ADMIN";
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Admin is a shop-owner account, not a shopper — no personal cart/order history to show them.
  const links = [
    { href: "/", label: "Home", show: true },
    { href: "/orders", label: "My Orders", show: !!user && !isAdmin },
    { href: "/admin", label: "Admin", show: isAdmin },
  ].filter((l) => l.show);

  const cartLink = (
    <Link
      href="/cart"
      aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
      className={`relative flex items-center gap-1.5 rounded-full p-2 transition hover:bg-gold-light/30 md:px-3 ${
        isActive("/cart") ? "text-plum" : "text-ink"
      }`}
    >
      <CartIcon />
      <span className="hidden md:inline">Cart</span>
      {itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-plum px-1 text-[11px] font-semibold text-cream md:static md:ml-0.5 md:bg-gold md:text-ink">
          {itemCount}
        </span>
      )}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md transition-all duration-300 ${
        scrolled || menuOpen
          ? "border-b border-gold-light/60 bg-cream/90 shadow-[0_1px_16px_rgba(36,21,18,0.08)]"
          : "border-b border-transparent bg-cream/40"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3" aria-label="Main">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-[family-name:var(--font-display)] text-lg font-medium text-ink"
        >
          <CrownMark className="h-5 w-5 flex-none text-gold" />
          <span className="truncate">{shopName}</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 text-sm font-medium md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-full px-3 py-2 transition hover:bg-gold-light/30 ${
                isActive(l.href) ? "text-plum" : "text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {/* Cart works for guests too (a local cart) — only checkout requires an account. */}
          {!isAdmin && cartLink}

          {user ? (
            <div className="ml-2 flex items-center gap-2 border-l border-gold-light/60 pl-3">
              <Link
                href="/profile"
                className={`rounded-full px-3 py-2 transition hover:bg-gold-light/30 ${isActive("/profile") ? "text-plum" : "text-plum/90"}`}
              >
                Hi, {user.fullName.split(" ")[0]}
              </Link>
              <button onClick={handleLogout} className="btn-secondary px-3 py-1.5">
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2 border-l border-gold-light/60 pl-3">
              <Link href="/login" className="rounded-full px-3 py-2 text-ink transition hover:bg-gold-light/30">
                Login
              </Link>
              <Link href="/register" className="btn-primary px-3 py-1.5">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: cart stays one tap away; everything else lives in the menu */}
        <div className="flex flex-none items-center gap-1 md:hidden">
          {!isAdmin && cartLink}
          <button
            type="button"
            onClick={() => setMenuOpenedOn(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-full p-2 text-ink transition hover:bg-gold-light/30"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="animate-fade-in border-t border-gold-light/50 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col text-base font-medium">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-3 transition hover:bg-gold-light/30 ${isActive(l.href) ? "text-plum" : "text-ink"}`}
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/profile" className="rounded-lg px-3 py-3 text-ink transition hover:bg-gold-light/30">
                  Profile <span className="text-sm font-normal text-charcoal/60">· {user.fullName}</span>
                </Link>
                <button onClick={handleLogout} className="btn-secondary mt-2 py-2.5">
                  Logout
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/login" className="btn-secondary py-2.5">
                  Login
                </Link>
                <Link href="/register" className="btn-primary py-2.5">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
