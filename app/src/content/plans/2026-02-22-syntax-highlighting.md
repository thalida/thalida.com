---
title: Syntax Highlighting Implementation Plan
description: >-
  Replace default Shiki `github-dark` code blocks with `astro-expressive-code`
  using the `houston` theme, copy buttons, and language labels — styled to match
  the site's neon/midnight aesthetic.
publishedOn: 2026-02-22T22:44:28.000Z
planType: implementation
topic: syntax-highlighting
status: completed
category: styling
---

# Syntax Highlighting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace default Shiki `github-dark` code blocks with `astro-expressive-code` using the `houston` theme, copy buttons, and language labels — styled to match the site's neon/midnight aesthetic.

**Architecture:** Add `astro-expressive-code` as an Astro integration which replaces the built-in Shiki pipeline. Configure it with the `houston` theme and `styleOverrides` to align with existing design tokens. Update post page CSS to target expressive-code's HTML structure.

**Tech Stack:** astro-expressive-code, Shiki houston theme, Tailwind CSS

---

### Task 1: Install astro-expressive-code

**Files:**
- Modify: `app/package.json`

**Step 1: Install the package**

Run (from repo root):
```bash
cd app && npm install astro-expressive-code
```

**Step 2: Verify installation**

Run:
```bash
cd app && npm ls astro-expressive-code
```
Expected: Package listed with version.

**Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "deps: add astro-expressive-code for syntax highlighting"
```

---

### Task 2: Configure expressive-code integration in Astro config

**Files:**
- Modify: `app/astro.config.mjs`

**Step 1: Add the integration**

Replace the current contents of `app/astro.config.mjs` with:

```js
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import astroExpressiveCode from "astro-expressive-code";
import remarkR2Media from "./src/plugins/remark-r2-media.mjs";
import rehypeR2Media from "./src/plugins/rehype-r2-media.mjs";

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
  ],
  markdown: {
    remarkPlugins: [[remarkR2Media, { baseUrl: mediaBaseUrl }]],
    rehypePlugins: [[rehypeR2Media, { baseUrl: mediaBaseUrl }]],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Key decisions:
- `codeBackground: "#0d1f2d"` — matches `--color-surface`
- `borderColor: "#152535"` — matches `--color-border`
- Tab bar background `#030a12` — matches `--color-midnight` for contrast
- Tab foreground `#e8f0f8` — matches `--color-text`
- Font set to `IBM Plex Mono` — matches `--font-body`
- Copy button is enabled by default (Frames plugin)
- Language label shown as tab (Frames plugin)

**Step 2: Verify build succeeds**

Run:
```bash
just app::build
```
Expected: Build completes without errors.

**Step 3: Commit**

```bash
git add app/astro.config.mjs
git commit -m "feat: configure astro-expressive-code with houston theme"
```

---

### Task 3: Update post page CSS for expressive-code HTML structure

**Files:**
- Modify: `app/src/pages/[collection]/[...id].astro` (lines 139-149)

**Step 1: Update the code block styles**

Expressive-code wraps code blocks in `.expressive-code` > `figure` > `pre` elements instead of bare `pre` elements. The old `.astro-code` class is no longer used. Update the `<style>` block.

Replace these CSS rules (lines 139-149):
```css
  .post-content :global(pre) {
    @apply bg-surface border border-border;
  }

  .post-content :global(pre) :global(code) {
    @apply border-none bg-transparent p-0;
  }

  .post-content :global(code) {
    @apply font-body bg-surface border border-border;
  }
```

With:
```css
  .post-content :global(.expressive-code) {
    @apply my-6;
  }

  .post-content :global(code:not(pre code)) {
    @apply font-body bg-surface border border-border text-teal px-1.5 py-0.5 rounded text-xs;
  }
```

Key decisions:
- `.expressive-code` wrapper gets vertical margin to match prose spacing
- Old `pre` and `pre code` rules removed — expressive-code handles its own pre/code styling via `styleOverrides`
- Inline `code` (not inside `pre`) keeps the site's surface/border styling and gets teal color to match link accent
- Inline code gets small padding and rounded corners for polish

**Step 2: Verify build succeeds**

Run:
```bash
just app::build
```
Expected: Build completes without errors.

**Step 3: Visual check**

Run:
```bash
just app::serve
```

Open a post with code blocks (e.g. `/guides/how-to-astro-glob-file`) and verify:
- [ ] Code block background matches site surface color (`#0d1f2d`)
- [ ] Houston theme token colors are visible (mint, cyan, blue, yellow)
- [ ] Language label appears as a tab above code blocks
- [ ] Copy button appears on hover/focus
- [ ] Border matches site border color (`#152535`)
- [ ] Font is IBM Plex Mono
- [ ] Inline `code` elements (not in code blocks) have surface background + border

**Step 4: Commit**

```bash
git add app/src/pages/\[collection\]/\[...id\].astro
git commit -m "style: update post CSS for expressive-code structure"
```

---

### Task 4: Fine-tune and finalize

**Step 1: Review copy button styling**

If the copy button looks out of place against the dark surface, add targeted overrides. Expressive-code uses `.copy button` inside the `.expressive-code` wrapper. Potential tweaks:

```css
  .post-content :global(.expressive-code) :global(.copy button) {
    @apply text-muted hover:text-neon;
  }
```

Only add this if the default copy button styling clashes with the theme.

**Step 2: Run full test suite**

Run:
```bash
just app::test
```
Expected: All tests pass.

**Step 3: Final build**

Run:
```bash
just app::build
```
Expected: Build succeeds.

**Step 4: Commit any final tweaks**

```bash
git add -u
git commit -m "style: fine-tune expressive-code copy button and spacing"
```
