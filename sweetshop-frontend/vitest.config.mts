import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the framework-free helpers in src/lib (no browser, no Next.js runtime needed).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
