"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ShopSettings } from "@/types";

export default function ContactPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  useEffect(() => {
    apiFetch<ShopSettings>("/api/shop-settings").then(setSettings).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-900">Contact Us</h1>

      <div className="rounded-lg border border-gray-200 p-5">
        <p className="text-lg font-semibold text-gray-900">{settings?.shopName ?? "KING CAKE PLACE"}</p>
        {settings?.description && <p className="mt-1 text-sm text-gray-600">{settings.description}</p>}

        <div className="mt-4 flex flex-col gap-2 text-sm text-gray-700">
          {settings?.address ? (
            <p>📍 {settings.address}</p>
          ) : (
            <p className="text-gray-400">Shop address not added yet.</p>
          )}
          {settings?.contactPhone ? (
            <p>
              📞 <a href={`tel:${settings.contactPhone}`} className="text-amber-700 hover:underline">{settings.contactPhone}</a>
            </p>
          ) : (
            <p className="text-gray-400">Phone number not added yet.</p>
          )}
          {settings?.email ? (
            <p>
              ✉️ <a href={`mailto:${settings.email}`} className="text-amber-700 hover:underline">{settings.email}</a>
            </p>
          ) : (
            <p className="text-gray-400">Email not added yet.</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Already placed an order? The fastest way to reach us about it is the message thread on your{" "}
        <a href="/orders" className="text-amber-700 hover:underline">order&apos;s page</a> — we&apos;ll see it right away.
      </p>
    </div>
  );
}
