# Astro v6 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use
> superpowers:subagent-driven-development (if subagents available)
> or superpowers:executing-plans to implement this plan. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the app from Astro v5 to v6 and migrate font
loading to the Fonts API.

**Architecture:** Bump all Astro-related packages to
v6-compatible versions, then migrate Google Fonts CDN links to
the built-in Fonts API for self-hosted font delivery with
automatic fallbacks and preloading.

**Tech Stack:** Astro 6, Tailwind CSS 4, pnpm, Vite 7
(transitive via Astro)

**Spec:**
`docs/superpowers/specs/2026-03-12-astro-v6-upgrade-design.md`

**Project conventions:**

- Use `just` commands for build/test/serve (never raw `pnpm`
  for those). See `justfile` and `just/app.just`.
- Raw `pnpm add` is acceptable for one-time package upgrades
  since no `just` recipe covers `pnpm add`.
- Git push as background task after final commit.

---


## Chunk 1: Package Upgrades and Verification


### Task 1: Upgrade Astro and related packages

**Files:**

- Modify: `app/package.json`
- Modify: `package.json` (root -- prettier-plugin-astro)
- Regenerate: `pnpm-lock.yaml` (root-level lockfile for the
  pnpm workspace)

Note: this project uses pnpm workspaces. There is a single
`pnpm-lock.yaml` at the repo root that covers all workspaces
(`app/`, `api/`). Package upgrades in `app/` update this root
lockfile.

- [ ] **Step 1: Upgrade astro to v6 in app workspace**

```bash
cd app && pnpm add astro@latest
```

This upgrades `astro` from `^5.10.1` to v6 and pulls in
Vite 7 + Zod 4 as transitive dependencies.

- [ ] **Step 2: Upgrade @astrojs/sitemap to v6-compatible**

```bash
cd app && pnpm add @astrojs/sitemap@latest
```

- [ ] **Step 3: Upgrade astro-expressive-code**

```bash
cd app && pnpm add astro-expressive-code@latest
```

- [ ] **Step 4: Upgrade astro-pagefind**

```bash
cd app && pnpm add astro-pagefind@latest
```

- [ ] **Step 5: Upgrade eslint-plugin-astro**

```bash
cd app && pnpm add -D eslint-plugin-astro@latest
```

- [ ] **Step 6: Upgrade prettier-plugin-astro in root**

```bash
pnpm add -D prettier-plugin-astro@latest
```

- [ ] **Step 7: Install all deps from root**

```bash
just install
```

Expected: clean install, no peer dependency errors.


### Task 2: Verify build and tests pass after upgrade

**Files:** None modified -- verification only.

- [ ] **Step 1: Run typecheck**

```bash
just app::typecheck
```

Expected: no type errors. If errors appear, they are likely
from Zod 4 or Vite 7 type changes -- fix before proceeding.

Also confirms that `loadEnv` from `"vite"` (used on line 2
of `app/astro.config.mjs`) still works with Vite 7. If
`loadEnv` signature changed, update the import or usage.

- [ ] **Step 2: Run tests**

```bash
just test
```

Expected: all tests pass. The tests in
`app/src/lib/__tests__/` are unit tests that don't import
Astro internals, so they should be unaffected.

- [ ] **Step 3: Run build**

```bash
just app::build
```

Expected: clean build. Watch for:

- Zod 4 schema warnings (the `schema: () => z.object({})`
  factory pattern in `app/src/content.config.ts` -- search
  for `schema:` in that file if the build fails)
- Vite 7 plugin compatibility warnings
- Any deprecation notices from integrations

If the build fails due to the schema factory pattern, search
for `schema: () =>` in `app/src/content.config.ts` and
change it to `schema:` (remove the arrow function wrapper).

- [ ] **Step 4: Commit**

```bash
git add app/package.json package.json pnpm-lock.yaml
git commit -m "chore: upgrade astro to v6 and related deps"
```

---


## Chunk 2: Fonts API Migration


### Task 3: Add fonts config to astro.config.mjs

**Files:**

- Modify: `app/astro.config.mjs:1,24`

- [ ] **Step 1: Update the import on line 1**

Change line 1 of `app/astro.config.mjs` from:

```javascript
import { defineConfig } from "astro/config";
```

to:

```javascript
import { defineConfig, fontProviders } from "astro/config";
```

Note: confirm `fontProviders` is exported from
`"astro/config"` in v6. If not, check the Astro v6 fonts
docs for the correct import path -- it may be
`import { fontProviders } from "astro/fonts"` or similar.
Docs: `https://docs.astro.build/en/guides/fonts/`

- [ ] **Step 2: Add fonts array to the defineConfig call**

In `app/astro.config.mjs`, add a `fonts` property after the
`site` property (after line 25, before `integrations`):

```javascript
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
```

Note: the exact config shape (e.g. `weights` vs `weight`,
`italics` vs `styles`) should be confirmed against the Astro
v6 fonts docs at the URL above.

- [ ] **Step 3: Verify the config is valid**

```bash
just app::typecheck
```

This runs `astro sync && tsc --noEmit`, which validates the
config and generates types. Expected: no errors. If there are
config validation errors, adjust the fonts config shape per
the error messages.

- [ ] **Step 4: Commit**

```bash
git add app/astro.config.mjs
git commit -m "feat: add Astro Fonts API config for self-hosted fonts"
```


### Task 4: Replace Google Fonts links with Font components

**Files:**

- Modify:
  `app/src/layouts/BaseLayout/BaseLayout.astro:2,55-60`

- [ ] **Step 1: Add Font import to frontmatter**

In `app/src/layouts/BaseLayout/BaseLayout.astro`, add this
import after line 2 (after the `ClientRouter` import):

```typescript
import { Font } from "astro:assets";
```

Note: confirm this import path against Astro v6 docs. It may
be `astro:fonts` instead of `astro:assets`.

- [ ] **Step 2: Remove Google Fonts link tags**

Delete lines 55-60 of `BaseLayout.astro` (the preconnect
hints and the Google Fonts stylesheet link):

```html
<!-- DELETE these 6 lines -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect"
  href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=..."
  rel="stylesheet"
/>
```

- [ ] **Step 3: Add Font components**

In the same location where the Google Fonts links were (after
the `<SEO>` component, before the Font Awesome link), add:

```astro
<Font cssVariable="--font-display" preload />
<Font cssVariable="--font-heading" preload />
<Font cssVariable="--font-body" preload />
```

- [ ] **Step 4: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro
git commit -m "feat: replace Google Fonts CDN with Astro Font components"
```


### Task 5: Remove font families from theme.css

**Files:**

- Modify: `app/src/styles/theme.css:19-21`

- [ ] **Step 1: Remove font family values**

In `app/src/styles/theme.css`, delete lines 19-21:

```css
--font-display: "Bricolage Grotesque", sans-serif;
--font-heading: "Space Grotesk", sans-serif;
--font-body: "IBM Plex Mono", monospace;
```

The Fonts API populates these CSS variables
(`--font-display`, `--font-heading`, `--font-body`)
automatically at build time with the font families and
generated fallbacks.

Important: Tailwind's `@theme` block uses these variables for
utility classes like `font-display`, `font-heading`,
`font-body`. After removing the explicit values, the build
(Task 6 Step 3) will confirm whether Tailwind still picks up
the Fonts API variables. If Tailwind utilities break because
the `@theme` block no longer declares font variables, the fix
is to keep the `@theme` declarations but set them to the
font names without fallbacks (the Fonts API handles fallbacks
separately):

```css
--font-display: "Bricolage Grotesque", sans-serif;
--font-heading: "Space Grotesk", sans-serif;
--font-body: "IBM Plex Mono", monospace;
```

In that case, revert this deletion. The Fonts API will still
self-host the fonts and add preloading/fallbacks even if
`@theme` also declares the variable values.

- [ ] **Step 2: Commit**

```bash
git add app/src/styles/theme.css
git commit -m "refactor: remove font family values, now managed by Fonts API"
```


### Task 6: Full verification

**Files:** None modified -- verification only.

- [ ] **Step 1: Run typecheck**

```bash
just app::typecheck
```

Expected: no type errors.

- [ ] **Step 2: Run tests**

```bash
just test
```

Expected: all tests pass.

- [ ] **Step 3: Run production build**

```bash
just app::build
```

Expected: clean build. Check the build output for:

- Font files in `dist/_astro/fonts/` directory
- No warnings about missing fonts or CSS variables
- Tailwind font utilities (`font-display`, `font-heading`,
  `font-body`) still generating correctly

- [ ] **Step 4: Start preview server and visually verify**

```bash
just app::serve
```

Check the following pages:

- **Home page** (`/`): Display font (Bricolage Grotesque)
  renders in the site title. Body font (IBM Plex Mono)
  renders in navigation and content.
- **About page** (`/about`): Images render correctly (v6
  image defaults changed cropping/upscaling). Heading font
  (Space Grotesk) renders.
- **Any post page** (e.g. `/guides/post/<any-post>`):
  Expressive code blocks use IBM Plex Mono. Markdown
  content renders with correct fonts.
- **View source / network tab**: Confirm no requests to
  `fonts.googleapis.com`. Font files should be served from
  `/_astro/fonts/`.
- **FOUT/FOIT**: Page loads should not show a flash of
  unstyled or invisible text. Layout shift should be
  minimal.
- **Script/style ordering**: Verify no visual regressions
  from the v6 change to declaration-order rendering
  (previously reversed). Check that scoped styles and
  Tailwind utilities still apply correctly.

- [ ] **Step 5: Commit any fixes if needed**

If any adjustments were required during verification, commit
them:

```bash
git add -A
git commit -m "fix: address astro v6 upgrade issues"
```

- [ ] **Step 6: Push**

```bash
git push
```

Run this as a background task.
