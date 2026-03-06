import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.{ts,mjs}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,mjs}"],
      exclude: ["src/**/__tests__/**", "src/**/*.d.ts", "src/**/*.astro", "src/env.d.ts"],
    },
  },
});
