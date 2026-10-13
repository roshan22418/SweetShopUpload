import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("shows whole rupees without paise", () => {
    expect(formatPrice(650)).toBe("₹650");
    expect(formatPrice(0)).toBe("₹0");
  });
  it("always shows two paise digits when there are paise (never ₹549.5)", () => {
    expect(formatPrice(549.5)).toBe("₹549.50");
    expect(formatPrice(18.05)).toBe("₹18.05");
  });
  it("uses Indian digit grouping", () => {
    expect(formatPrice(1250)).toBe("₹1,250");
    expect(formatPrice(125000)).toBe("₹1,25,000");
    expect(formatPrice(1234567.8)).toBe("₹12,34,567.80");
  });
  it("treats float noise from arithmetic as whole rupees", () => {
    expect(formatPrice(0.1 * 3 * 1000)).toBe("₹300");
  });
});
