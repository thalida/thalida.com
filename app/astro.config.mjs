import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import astroExpressiveCode from "astro-expressive-code";
import pagefind from "astro-pagefind";
import rehypeR2Media from "./src/plugins/rehype-r2-media.mjs";
import remarkExtractRecipe from "./src/plugins/remark-extract-recipe.mjs";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkToc from "remark-toc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeWrap from "rehype-wrap";

const env = loadEnv(process.env.NODE_ENV || "", process.cwd(), "PUBLIC_");
const r2BaseUrl = (env.PUBLIC_R2_BASE_URL || "").replace(/\/$/, "");
const mediaBranch = process.env.CF_PAGES_BRANCH || "main";
const mediaBaseUrl = r2BaseUrl ? `${r2BaseUrl}/${mediaBranch}` : "";

// Use Cloudflare Pages deploy URL on preview branches so OG images resolve correctly
const site = mediaBranch === "main" || !process.env.CF_PAGES_URL ? "https://thalida.com" : process.env.CF_PAGES_URL;

export default defineConfig({
  site,
  integrations: [
    sitemap(),
    astroExpressiveCode({
      themes: ["houston"],
      // Colors match theme.css tokens (CSS vars can't be used in JS config)
      styleOverrides: {
        codeBackground: "#0d1f2d", // --color-surface
        borderColor: "#152535", // between --color-surface and --color-border
        borderRadius: "0.375rem",
        codeFontFamily: "'IBM Plex Mono', monospace",
        frames: {
          editorActiveTabBackground: "#0d1f2d", // --color-surface
          editorActiveTabForeground: "#e8f0f8", // --color-text
          editorTabBarBackground: "#030a12", // --color-midnight
          editorTabBarBorderBottom: "#152535",
          terminalBackground: "#0d1f2d", // --color-surface
          terminalTitlebarBackground: "#030a12", // --color-midnight
          terminalTitlebarBorderBottom: "#152535",
        },
      },
    }),
    pagefind(),
  ],
  markdown: {
    // Astro 7 defaults to Sätteri; keep the unified/remark/rehype pipeline so the
    // custom plugins below (R2 media rewriting, recipe extraction) keep working.
    processor: unified({
      remarkPlugins: [remarkAlert, [remarkToc, { heading: "toc" }], remarkExtractRecipe],
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
        [rehypeExternalLinks, { target: "_blank", rel: ["noopener"] }],
        [rehypeWrap, { selector: "table", wrapper: "div.overflow-auto", fallback: false }],
        [rehypeR2Media, { baseUrl: mediaBaseUrl }],
      ],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.CF_PAGES_BRANCH": JSON.stringify(process.env.CF_PAGES_BRANCH || "main"),
    },
  },
});
