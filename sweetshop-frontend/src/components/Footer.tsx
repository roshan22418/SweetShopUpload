"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ShopSettings } from "@/types";
import CrownMark from "@/components/CrownMark";

export default function Footer() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  useEffect(() => {
    apiFetch<ShopSettings>("/api/shop-settings").then(setSettings).catch(() => {});
  }, []);

  return (
    <footer className="mt-12 bg-ink">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-medium text-cream">
            <CrownMark className="h-4 w-4 text-gold" />
            {settings?.shopName ?? "KING CAKE PLACE"}
          </p>
          {settings?.description && <p className="mt-2 text-sm text-cream/60">{settings.description}</p>}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-gold-light">Visit or contact us</p>
          <div className="flex flex-col gap-1 text-sm text-cream/60">
            {settings?.address && <p>📍 {settings.address}</p>}
            {settings?.contactPhone && <p>📞 {settings.contactPhone}</p>}
            {settings?.email && <p>✉️ {settings.email}</p>}
            {!settings?.address && !settings?.contactPhone && !settings?.email && (
              <p className="text-cream/40">Contact details coming soon.</p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-gold-light">Legal</p>
          <div className="flex flex-col gap-1 text-sm text-cream/60">
            <Link href="/contact" className="hover:text-gold hover:underline">
              Contact Us
            </Link>
            <Link href="/terms" className="hover:text-gold hover:underline">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="hover:text-gold hover:underline">
              Privacy Policy
            </Link>
            <Link href="/refund-policy" className="hover:text-gold hover:underline">
              Refund &amp; Cancellation Policy
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-cream/10 py-4 text-center text-xs text-cream/40">
        © {new Date().getFullYear()} {settings?.shopName ?? "KING CAKE PLACE"}. All rights reserved.
      </div>
    </footer>
  );
}
