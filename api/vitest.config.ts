import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// The Workers Vitest integration moved from `defineWorkersConfig` +
// `poolOptions.workers` to a `cloudflareTest()` Vite plugin taking the same
// options. Outbound fetches are mocked with MSW (see src/__tests__/setup.ts).
export default defineConfig({
  plugins: [
    cloudflareTest({
      isolatedStorage: false,
      singleWorker: true,
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        bindings: {
          ADMIN_PASSWORD: "test-admin-password",
          SIGNING_SECRET: "test-signing-secret",
          OPENAI_API_KEY: "",
          IPREGISTRY_KEY: "",
          OPENWEATHER_KEY: "",
          ALLOWED_ORIGIN: "https://thalida.com",
        },
      },
    }),
  ],
  test: {
    setupFiles: ["src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**"],
    },
  },
});
