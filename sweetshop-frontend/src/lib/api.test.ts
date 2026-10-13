import { describe, expect, it } from "vitest";
import { resolveImageUrl } from "./api";

describe("resolveImageUrl", () => {
  it("leaves absolute URLs (Cloudinary, pasted links) untouched", () => {
    expect(resolveImageUrl("https://res.cloudinary.com/demo/cake.jpg")).toBe("https://res.cloudinary.com/demo/cake.jpg");
    expect(resolveImageUrl("HTTP://example.com/a.png")).toBe("HTTP://example.com/a.png");
  });
  it("prefixes backend-relative upload paths with the API host", () => {
    expect(resolveImageUrl("/uploads/products/abc.jpg")).toBe("http://localhost:8080/uploads/products/abc.jpg");
  });
});
