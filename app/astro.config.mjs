import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import remarkR2Media from "./src/plugins/remark-r2-media.mjs";
import rehypeR2Media from "./src/plugins/rehype-r2-media.mjs";

const env = loadEnv(process.env.NODE_ENV || "", process.cwd(), "PUBLIC_");
const r2BaseUrl = (env.PUBLIC_R2_BASE_URL || "").replace(/\/$/, "");
const mediaBranch = process.env.CF_PAGES_BRANCH || "main";
const mediaBaseUrl = r2BaseUrl ? `${r2BaseUrl}/${mediaBranch}` : "";

export default defineConfig({
  site: "https://thalida.com",
  markdown: {
    remarkPlugins: [[remarkR2Media, { baseUrl: mediaBaseUrl }]],
    rehypePlugins: [[rehypeR2Media, { baseUrl: mediaBaseUrl }]],
  },
});
