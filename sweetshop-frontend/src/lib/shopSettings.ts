import { useEffect, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";
import { ShopSettings } from "@/types";

export const DEFAULT_SHOP_NAME = "KING CAKE PLACE";

// One copy of the shop's settings for the whole page: the navbar, footer, hero, contact and checkout all
// read it, but it is fetched once (concurrent callers share the in-flight request). Saving in the admin
// panel updates it in place, so a renamed shop shows everywhere without a reload.
let current: ShopSettings | null = null;
let inFlight: Promise<ShopSettings | null> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function loadShopSettings(): Promise<ShopSettings | null> {
  if (current) return Promise.resolve(current);
  inFlight ??= apiFetch<ShopSettings>("/api/shop-settings")
    .then((settings) => {
      current = settings;
      emit();
      return settings;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function setShopSettings(settings: ShopSettings) {
  current = settings;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useShopSettings(): ShopSettings | null {
  const settings = useSyncExternalStore(subscribe, () => current, () => null);
  useEffect(() => {
    loadShopSettings();
  }, []);
  return settings;
}
