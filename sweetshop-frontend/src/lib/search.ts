import { Product } from "@/types";

const WORD_SPLIT = /[^a-z0-9]+/;

// "cakes" should find "Cake", "sandwiches" should find "Sandwich"
function singularForms(word: string): string[] {
  const forms = [word];
  if (word.length > 3 && word.endsWith("es")) forms.push(word.slice(0, -2));
  if (word.length > 2 && word.endsWith("s")) forms.push(word.slice(0, -1));
  return forms;
}

/**
 * Every word of the query must be the start of some word in the product's name or description
 * ("sa" finds "Samosa", "dark cake" finds "Chocolate Cake — rich dark ganache"), plurals tolerated.
 * Shared by the home page search and the chatbot.
 */
export function matchesSearch(product: Product, query: string): boolean {
  const queryWords = query.toLowerCase().split(WORD_SPLIT).filter(Boolean);
  if (queryWords.length === 0) return true;

  const words = `${product.name} ${product.description ?? ""}`.toLowerCase().split(WORD_SPLIT);
  return queryWords.every((q) => singularForms(q).some((form) => words.some((word) => word.startsWith(form))));
}
