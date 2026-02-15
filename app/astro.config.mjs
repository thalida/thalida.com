import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://thalida.com",
  vite: {
    server: {
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
  },
});
