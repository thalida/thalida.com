# Astro v6 Upgrade Design

**Date:** 2026-03-12
**Scope:** Upgrade Astro from v5 to v6, migrate to Fonts API


## Overview

Upgrade the `app/` workspace from Astro `^5.10.1` to v6.
Adopt the new Fonts API to self-host Google Fonts with automatic
fallback generation and preloading. CSP was considered but is
incompatible with `<ClientRouter />` (View Transitions), so it
is deferred.


## 1. Package Upgrades

| Package | Current | Target |
| ------- | ------- | ------ |
| `astro` | `^5.10.1` | `^6.0.0` |
| `@astrojs/sitemap` | `^3.7.0` | v6-compatible |
| `astro-expressive-code` | `^0.41.6` | v6-compatible |
| `astro-pagefind` | `^1.8.5` | v6-compatible |
| `eslint-plugin-astro` | `^1.6.0` | v6-compatible |
| `prettier-plugin-astro` (root) | `^0.14.1` | v6-compatible |

All upgrades happen via `pnpm update` in the respective workspaces. Lockfile regenerated.


## 2. Breaking Change Assessment


### No action needed

- **Zod 4**: Schemas in `content.config.ts` use `z.string()`,
  `z.boolean()`, `z.coerce.date()`, `z.array()`, `z.object()` —
  all unchanged in Zod 4. No `.email()` or `.url()` string
  methods used. No `{ message: }` error customization. The
  `schema: () => z.object({...})` factory pattern needs
  confirmation during implementation.
- **`import.meta.env` inlining**: Usage in `src/lib/constants.ts`
  is static string access with fallbacks — compatible with
  compile-time inlining. The `vite.define` for `CF_PAGES_BRANCH`
  in `astro.config.mjs` also works fine.
- **Markdown heading IDs**: Project uses `rehype-slug` (external
  plugin) which generates IDs independently of Astro's built-in
  generator.
- **`getStaticPaths` numeric params**: All params across 5 page files are strings.
- **Endpoints with file extensions**: No endpoints with file extensions exist.
- **`getImage()` client-side**: Not used.
- **i18n routing**: Not configured.
- **Image cropping/upscaling/SVG**: `about.astro` uses
  `<Image />` with basic `src`/`alt` props only — no `fit`,
  `position`, or SVG sources affected by v6 defaults.
- **Vitest container API**: Not used for Astro component testing.
- **SSRManifest / integration hooks**: No custom adapters or integrations.
- **Responsive image styles**: Not using responsive image features.


### Verify after upgrade

- **Script/style rendering order**: Now declaration order (was
  reversed). Low risk since styles are scoped CSS + Tailwind
  utilities. Visual verification needed.


## 3. Fonts API Migration


### Current state

- 3 Google Fonts loaded via CDN `<link>` tag in `BaseLayout.astro` (lines 55-60)
- Preconnect hints manually managed (lines 55-56)
- Font families defined as CSS custom properties in `theme.css` (lines 19-21)
- Squada One loaded dynamically at runtime in `LiveWindow.ts`
- Font Awesome loaded via CDN (separate concern, unchanged)


### Target state

**`astro.config.mjs`** — add `fonts` configuration:

```javascript
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  // ...existing config...
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Bricolage Grotesque",
      cssVariable: "--font-display",
      weights: [400, 500, 700],
    },
    {
      provider: fontProviders.google(),
      name: "Space Grotesk",
      cssVariable: "--font-heading",
      weights: [400, 500, 600, 700],
    },
    {
      provider: fontProviders.google(),
      name: "IBM Plex Mono",
      cssVariable: "--font-body",
      weights: [300, 400, 500],
      italics: [400],
    },
  ],
});
```

**`BaseLayout.astro`** — update `<head>`:

```astro
---
import { Font } from "astro:assets"; // confirm import path against v6 docs
---
<head>
  <!-- Remove Google Fonts <link> tags (lines 55-60) -->
  <!-- Add Font components -->
  <Font cssVariable="--font-display" preload />
  <Font cssVariable="--font-heading" preload />
  <Font cssVariable="--font-body" preload />
  <!-- Keep Font Awesome CDN link unchanged -->
</head>
```

**`theme.css`** — remove font family values from CSS variables:

```css
/* REMOVE these lines — Fonts API populates the CSS variables directly */
--font-display: "Bricolage Grotesque", sans-serif;
--font-heading: "Space Grotesk", sans-serif;
--font-body: "IBM Plex Mono", monospace;
```

**Unchanged:**

- Squada One: stays as dynamic runtime injection in `LiveWindow.ts`
- Font Awesome: stays as CDN `<link>` tag
- `astro-expressive-code` config: references
  `'IBM Plex Mono', monospace` as a string literal — works
  because the font is loaded; delivery method changes only
- `live-window.css`: hardcodes `"IBM Plex Mono", monospace` as
  a fallback value in `--info-panel-font` — same pattern


### Benefits

- Fonts self-hosted from your domain (no Google requests, better privacy)
- Automatic size-adjusted fallback fonts (reduces CLS/layout shift)
- Automatic `<link rel="preload">` tags
- Long-term HTTP caching via `_astro/fonts/`


## 4. Verification Plan

1. `pnpm install` — resolve all peer dependency conflicts
2. `just app::typecheck` — no type errors
3. `just app::build` — clean production build
4. `just test` — all tests pass
5. `just app::serve` — visual spot-check:
   - Fonts render correctly (all 3 families + weights)
   - No FOUT/FOIT regression
   - Layout shift acceptable
   - Script/style ordering hasn't broken anything
   - Expressive code blocks still styled correctly
   - About page images render correctly (v6 image defaults)


## 5. Files Changed

| File | Change |
| ---- | ------ |
| `app/package.json` | Bump `astro` and related deps |
| `app/astro.config.mjs` | Add `fonts` config, update imports |
| `app/src/layouts/BaseLayout/BaseLayout.astro` | Replace Google Fonts links with `<Font />` components |
| `app/src/styles/theme.css` | Remove font family values from CSS vars |
| `package.json` (root) | Update `prettier-plugin-astro` if needed |
| `pnpm-lock.yaml` | Regenerated |


## 6. Deferred

- **CSP**: Incompatible with `<ClientRouter />`
  (View Transitions). Revisit when Astro resolves this
  limitation.
- **Experimental Rust compiler / queued rendering**: Stable
  features only for now; can be opted in later with one-line
  config changes.
