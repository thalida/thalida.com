import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        singleWorker: true,
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            ADMIN_SECRET: "test-admin-secret",
            OPENAI_API_KEY: "",
            IPREGISTRY_KEY: "",
            OPENWEATHER_KEY: "",
            ALLOWED_ORIGIN: "https://thalida.com",
          },
        },
      },
    },
  },
});
