// Shared Vite config used by both `astro dev` and `vite preview`.
// Astro automatically merges this with its own Vite settings.

import { defineConfig } from "vite";

const allowedHosts = [".thalida.com", ".trycloudflare.com"];

export default defineConfig({
  server: {
    allowedHosts,
  },
  preview: {
    allowedHosts,
  },
});
