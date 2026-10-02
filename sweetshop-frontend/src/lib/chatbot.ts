// Pure helpers behind the ordering chatbot (components/ChatBot.tsx). No React, no network — so the
// parsing rules can be tested on their own.
import { Product } from "@/types";
import { matchesSearch } from "@/lib/search";

export const MAX_QUANTITY = 99;

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12,
};

// Words that carry no product meaning in "I want to order 2 chocolate cakes please"
const FILLER_WORDS = new Set([
  "i", "want", "wanna", "to", "order", "add", "get", "buy", "need", "give", "me", "please", "pls", "some",
  "a", "an", "the", "of", "and", "for", "like", "would", "can", "you", "have", "x",
]);

/** "3" -> 3, "three" -> 3. Returns null unless it's a whole number from 1 to MAX_QUANTITY. */
export function parseQuantity(text: string): number | null {
  const t = text.trim().toLowerCase();
  const n = /^\d+$/.test(t) ? Number(t) : NUMBER_WORDS[t];
  return n !== undefined && Number.isInteger(n) && n >= 1 && n <= MAX_QUANTITY ? n : null;
}

/** Cleans a typed phone number; accepts an optional leading + and 10-15 digits. Null when invalid. */
export function normalizePhone(text: string): string | null {
  const cleaned = text.replace(/[\s\-()]/g, "");
  return /^\+?\d{10,15}$/.test(cleaned) ? cleaned : null;
}

/** A delivery address needs to be more than a word or two. */
export function isValidAddress(text: string): boolean {
  return text.trim().length >= 10 && text.trim().length <= 500;
}

export interface ParsedOrderText {
  quantity: number | null;
  query: string;
}

/** "2 chocolate cakes please" -> { quantity: 2, query: "chocolate cakes" }; "samosa" -> { quantity: null, query: "samosa" } */
export function parseOrderText(text: string): ParsedOrderText {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let quantity: number | null = null;
  const rest: string[] = [];

  for (const word of words) {
    if (FILLER_WORDS.has(word)) continue;
    const q = parseQuantity(word);
    if (q !== null && quantity === null) {
      quantity = q;
      continue;
    }
    rest.push(word);
  }
  return { quantity, query: rest.join(" ") };
}

// "cakes" should find "Cake", "sandwiches" should find "Sandwich"
function singularForms(word: string): string[] {
  const forms = [word];
  if (word.length > 3 && word.endsWith("es")) forms.push(word.slice(0, -2));
  if (word.length > 2 && word.endsWith("s")) forms.push(word.slice(0, -1));
  return forms;
}

/** Every word of the query must prefix-match a word in the product's name/description. */
export function searchProducts(products: Product[], query: string, limit = 8): Product[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return [];
  return products
    .filter((p) => words.every((w) => singularForms(w).some((form) => matchesSearch(p, form))))
    .slice(0, limit);
}

/** Sellable right now: shown to customers and in stock. */
export function isOrderable(product: Product): boolean {
  return product.isAvailable && product.stockQuantity > 0;
}

export type Intent = "menu" | "cart" | "checkout" | "orders" | "help" | "cancel" | "greeting" | "none";

/** Whole-message keyword intents, so typing "cart" or "hi" works anywhere in the conversation. */
export function detectIntent(text: string): Intent {
  const t = text.trim().toLowerCase().replace(/[^a-z\s?]/g, "").replace(/\s+/g, " ");
  if (/^(hi|hello|hey|hii|namaste|hola)( there)?$/.test(t)) return "greeting";
  if (/^(menu|start|main menu|home|order|order food|start over|restart)$/.test(t)) return "menu";
  if (/^(cart|my cart|view cart|show cart|basket)$/.test(t)) return "cart";
  if (/^(checkout|check out|place order|place my order|pay|confirm order)$/.test(t)) return "checkout";
  if (/^(orders|my orders|order status|track|track order|track my order)$/.test(t)) return "orders";
  if (/^(help|support|options)\??$|^\?+$/.test(t)) return "help";
  if (/^(cancel|stop|nevermind|never mind|no|back)$/.test(t)) return "cancel";
  return "none";
}

export function formatRupees(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
