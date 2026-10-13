import { describe, expect, it } from "vitest";
import { Product } from "@/types";
import { matchesSearch } from "./search";

const samosa = { name: "Punjabi Samosa", description: "Crisp pastry with spiced potato" } as Product;

describe("matchesSearch", () => {
  it("matches the start of any word in the name or description, ignoring case", () => {
    expect(matchesSearch(samosa, "sa")).toBe(true);
    expect(matchesSearch(samosa, "PUN")).toBe(true);
    expect(matchesSearch(samosa, "spic")).toBe(true);
  });
  it("does not match the middle of a word", () => {
    expect(matchesSearch(samosa, "mosa")).toBe(false);
  });
  it("matches everything for an empty query", () => {
    expect(matchesSearch(samosa, "  ")).toBe(true);
  });
});
