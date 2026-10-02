const CATEGORY_EMOJI: Record<string, string> = {
  cakes: "🎂",
  sweet: "🍬",
  sweets: "🍬",
  snacks: "🥟",
  bakery: "🍞",
  biscuits: "🍪",
  "birthday items": "🎁",
  "south indian": "🍛",
};

const CATEGORY_TAGLINE: Record<string, string> = {
  cakes: "Custom celebration cakes, baked to order.",
  sweet: "Festive mithai boxes, packed fresh for gifting.",
  sweets: "Festive mithai boxes, packed fresh for gifting.",
  snacks: "Everyday favourites, made fresh through the day.",
  bakery: "Bread, cookies & pastries, baked every morning.",
  biscuits: "Crisp, buttery biscuits by the box.",
  "birthday items": "Everything for the big celebration.",
  "south indian": "South Indian classics, made the traditional way.",
};

export function emojiFor(categoryName: string): string {
  return CATEGORY_EMOJI[categoryName.trim().toLowerCase()] ?? "🍽️";
}

export function taglineFor(categoryName: string): string {
  return CATEGORY_TAGLINE[categoryName.trim().toLowerCase()] ?? `Fresh ${categoryName.toLowerCase()}, made to order.`;
}
