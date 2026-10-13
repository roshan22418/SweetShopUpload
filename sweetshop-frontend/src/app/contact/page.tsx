"use client";

import Link from "next/link";
import { DEFAULT_SHOP_NAME, useShopSettings } from "@/lib/shopSettings";

export default function ContactPage() {
  const settings = useShopSettings();
  const phoneDigits = settings?.contactPhone?.replace(/[^\d+]/g, "");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title mb-6">Contact us</h1>

      <div className="card md:p-8">
        <p className="font-display text-xl text-ink">{settings?.shopName ?? DEFAULT_SHOP_NAME}</p>
        {settings?.description && <p className="mt-1 text-sm text-charcoal/70">{settings.description}</p>}

        <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Visit</dt>
            <dd className="mt-1 text-ink">{settings?.address ?? <span className="text-charcoal/40">Address coming soon</span>}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Call</dt>
            <dd className="mt-1 text-ink">{settings?.contactPhone ?? <span className="text-charcoal/40">Phone coming soon</span>}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Email</dt>
            <dd className="mt-1 break-words text-ink">{settings?.email ?? <span className="text-charcoal/40">Email coming soon</span>}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {phoneDigits && (
            <a href={`tel:${phoneDigits}`} className="btn-primary">
              Call the shop
            </a>
          )}
          {settings?.email && (
            <a href={`mailto:${settings.email}`} className="btn-secondary">
              Send an email
            </a>
          )}
          {settings?.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Open in Maps
            </a>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-charcoal/70">
        Already placed an order? The fastest way to reach us about it is the message thread on your{" "}
        <Link href="/orders" className="font-medium text-plum hover:underline">
          order&apos;s page
        </Link>{" "}
        — we&apos;ll see it right away.
      </p>
    </div>
  );
}
