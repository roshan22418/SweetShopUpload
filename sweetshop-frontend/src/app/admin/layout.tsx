"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
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

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-amber-900">Admin</h1>
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium ${
              pathname === tab.href
                ? "border-b-2 border-amber-600 text-amber-800"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
