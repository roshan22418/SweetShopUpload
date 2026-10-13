"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") return null;

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div>
      <h1 className="page-title mb-4">Shop admin</h1>
      {/* Scrolls sideways on phones instead of pushing the page wider than the screen */}
      <nav aria-label="Admin sections" className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1 border-b border-gold-light/70">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(tab.href) ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
                isActive(tab.href) ? "border-gold text-ink" : "border-transparent text-charcoal/60 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
