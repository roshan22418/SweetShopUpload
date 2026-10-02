import { Product } from "@/types";

export function matchesSearch(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = `${product.name} ${product.description ?? ""}`.toLowerCase();
  return haystack.split(/[^a-z0-9]+/).some((word) => word.startsWith(q));
}
