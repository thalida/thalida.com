import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import astroExpressiveCode from "astro-expressive-code";
import pagefind from "astro-pagefind";
import remarkR2Media from "./src/plugins/remark-r2-media.mjs";
import rehypeR2Media from "./src/plugins/rehype-r2-media.mjs";
import remarkExtractRecipe from "./src/plugins/remark-extract-recipe.mjs";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkToc from "remark-toc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeWrap from "rehype-wrap";

const env = loadEnv(process.env.NODE_ENV || "", process.cwd(), "PUBLIC_");
const r2BaseUrl = (env.PUBLIC_R2_BASE_URL || "").replace(/\/$/, "");
const mediaBranch = process.env.CF_PAGES_BRANCH || "main";
const mediaBaseUrl = r2BaseUrl ? `${r2BaseUrl}/${mediaBranch}` : "";

export default defineConfig({
  site: "https://thalida.com",
  integrations: [
    astroExpressiveCode({
      themes: ["houston"],
      styleOverrides: {
        codeBackground: "#0d1f2d",
        borderColor: "#152535",
        borderRadius: "0.375rem",
        codeFontFamily: "'IBM Plex Mono', monospace",
        frames: {
          editorActiveTabBackground: "#0d1f2d",
          editorActiveTabForeground: "#e8f0f8",
          editorTabBarBackground: "#030a12",
          editorTabBarBorderBottom: "#152535",
          terminalBackground: "#0d1f2d",
          terminalTitlebarBackground: "#030a12",
          terminalTitlebarBorderBottom: "#152535",
        },
      },
    }),
    pagefind(),
  ],
  markdown: {
    remarkPlugins: [
      remarkAlert,
      [remarkToc, { heading: "toc" }],
      [remarkR2Media, { baseUrl: mediaBaseUrl }],
      remarkExtractRecipe,
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          properties: { ariaHidden: "true", tabIndex: -1, class: "heading-anchor" },
          content: { type: "text", value: "#" },
        },
      ],
      [rehypeWrap, { selector: "table", wrapper: "div.overflow-auto", fallback: false }],
      [rehypeR2Media, { baseUrl: mediaBaseUrl }],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
