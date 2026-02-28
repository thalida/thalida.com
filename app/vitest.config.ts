import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
      "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
      "@layouts": fileURLToPath(new URL("./src/layouts", import.meta.url)),
      "@lib": fileURLToPath(new URL("./src/lib", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
      "@plugins": fileURLToPath(new URL("./src/plugins", import.meta.url)),
      "@scripts": fileURLToPath(new URL("./src/scripts", import.meta.url)),
      "@styles": fileURLToPath(new URL("./src/styles", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.{ts,mjs}"],
  },
});
