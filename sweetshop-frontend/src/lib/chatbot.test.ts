import { describe, expect, it } from "vitest";
import { Product } from "@/types";
import { detectIntent, isOrderable, isValidAddress, normalizePhone, parseOrderText, parseQuantity, searchProducts } from "./chatbot";

const product = (id: number, name: string, extra: Partial<Product> = {}): Product => ({
  id,
  categoryId: 1,
  categoryName: "Snacks",
  name,
  description: null,
  price: 18,
  unit: "1 piece",
  stockQuantity: 10,
  imageUrl: null,
  isAvailable: true,
  ...extra,
});

const menu = [
  product(1, "Samosa"),
  product(2, "Chocolate Truffle Cake", { description: "Rich dark chocolate" }),
  product(3, "Black Forest Cake"),
  product(4, "Veg Sandwich"),
];

describe("parseQuantity", () => {
  it("reads digits and number words", () => {
    expect(parseQuantity("3")).toBe(3);
    expect(parseQuantity(" Three ")).toBe(3);
    expect(parseQuantity("dozen")).toBe(12);
  });
  it("rejects zero, too many, fractions and words it doesn't know", () => {
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("100")).toBeNull();
    expect(parseQuantity("2.5")).toBeNull();
    expect(parseQuantity("lots")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("strips spaces, dashes and brackets", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("(987) 654 3210")).toBe("9876543210");
  });
  it("rejects too short and non-numeric input", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("call me")).toBeNull();
  });
});

describe("isValidAddress", () => {
  it("needs more than a word or two", () => {
    expect(isValidAddress("Home")).toBe(false);
    expect(isValidAddress("Flat 4B, Lotus Apartments, Baner, Pune")).toBe(true);
    expect(isValidAddress("x".repeat(501))).toBe(false);
  });
});

describe("parseOrderText", () => {
  it("separates the quantity from the product words and drops filler", () => {
    expect(parseOrderText("I want 2 chocolate cakes please")).toEqual({ quantity: 2, query: "chocolate cakes" });
    expect(parseOrderText("samosa")).toEqual({ quantity: null, query: "samosa" });
    expect(parseOrderText("three samosas")).toEqual({ quantity: 3, query: "samosas" });
  });
});

describe("searchProducts", () => {
  it("matches word prefixes, tolerating plurals", () => {
    expect(searchProducts(menu, "samosas").map((p) => p.name)).toEqual(["Samosa"]);
    expect(searchProducts(menu, "sandwiches").map((p) => p.name)).toEqual(["Veg Sandwich"]);
    expect(searchProducts(menu, "cakes").map((p) => p.id)).toEqual([2, 3]);
  });
  it("requires every word to match, searching descriptions too", () => {
    expect(searchProducts(menu, "dark cake").map((p) => p.id)).toEqual([2]);
    expect(searchProducts(menu, "forest chocolate")).toEqual([]);
    expect(searchProducts(menu, "   ")).toEqual([]);
  });
});

describe("isOrderable", () => {
  it("needs the product on sale and in stock", () => {
    expect(isOrderable(product(1, "A"))).toBe(true);
    expect(isOrderable(product(1, "A", { stockQuantity: 0 }))).toBe(false);
    expect(isOrderable(product(1, "A", { isAvailable: false }))).toBe(false);
  });
});

describe("detectIntent", () => {
  it("recognises whole-message keywords", () => {
    expect(detectIntent("Hi!")).toBe("greeting");
    expect(detectIntent("my cart")).toBe("cart");
    expect(detectIntent("Place order")).toBe("checkout");
    expect(detectIntent("track my order")).toBe("orders");
    expect(detectIntent("?")).toBe("help");
    expect(detectIntent("never mind")).toBe("cancel");
  });
  it("leaves product requests alone", () => {
    expect(detectIntent("2 samosas")).toBe("none");
    expect(detectIntent("cart cake")).toBe("none");
  });
});
