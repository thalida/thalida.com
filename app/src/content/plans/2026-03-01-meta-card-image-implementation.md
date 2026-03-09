---
title: Meta Card Image Implementation Plan
description: >-
  Replace the outdated OG/social card image with a neon-glow `<3` mark on
  midnight background, matching the site's current design.
publishedOn: 2026-03-01T23:51:14.000Z
planType: implementation
topic: meta-seo
status: completed
category: content
---

# Meta Card Image Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the outdated OG/social card image with a neon-glow `<3` mark on midnight background, matching the site's current design.

**Architecture:** Create SVG source files with artistic `<3` strokes and neon glow SVG filters. Use `@resvg/resvg-js` (Rust-based SVG renderer for Node) to convert to PNG at both 1200x630 and 512x512. Update the SEO component to use the wide image as default.

**Tech Stack:** SVG, `@resvg/resvg-js`, Node.js script

---

### Task 1: Create the 1200x630 SVG source file

**Files:**
- Create: `app/public/card-1200x630.svg`

**Step 1: Create the SVG with artistic `<3` mark and neon glow**

The SVG has three layers:
1. Midnight background
2. The `<3` mark with neon glow filter
3. "thalida.com" text

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <!-- Neon glow filter: tight inner + wide outer bloom -->
    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
      <!-- Wide outer bloom -->
      <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur-wide"/>
      <feColorMatrix in="blur-wide" type="matrix"
        values="0 0 0 0 0.106
                0 0 0 0 0.894
                0 0 0 0 0.549
                0 0 0 0.5 0" result="glow-wide"/>
      <!-- Tight inner glow -->
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur-tight"/>
      <feColorMatrix in="blur-tight" type="matrix"
        values="0 0 0 0 0.106
                0 0 0 0 0.894
                0 0 0 0 0.549
                0 0 0 0.8 0" result="glow-tight"/>
      <!-- Compose: wide glow + tight glow + sharp original -->
      <feMerge>
        <feMergeNode in="glow-wide"/>
        <feMergeNode in="glow-tight"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Subtle glow for text -->
    <filter id="text-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.91
                0 0 0 0 0.94
                0 0 0 0 0.97
                0 0 0 0.3 0" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#030a12"/>

  <!-- Artistic <3 mark with neon glow -->
  <g filter="url(#neon-glow)">
    <!-- < chevron: expressive, sweeping strokes -->
    <polyline
      points="560,140 430,280 560,420"
      fill="none" stroke="#1be48c" stroke-width="18"
      stroke-linecap="round" stroke-linejoin="round"/>
    <!-- 3 numeral: flowing curves -->
    <path
      d="M620 140 L720 140 Q760 140 760 180 L760 240 Q760 280 720 280 L670 280
         M720 280 Q760 280 760 320 L760 380 Q760 420 720 420 L620 420"
      fill="none" stroke="#1be48c" stroke-width="18"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Site name -->
  <text
    x="600" y="530"
    text-anchor="middle"
    font-family="'Space Grotesk', 'SF Pro Display', 'Helvetica Neue', sans-serif"
    font-weight="500"
    font-size="36"
    fill="#e8f0f8"
    filter="url(#text-glow)"
    letter-spacing="4">thalida.com</text>
</svg>
```

**Notes on the `<3` design:**
- The `<` chevron is a simple polyline — sweeping 280px tall, centered at x=495, y=280
- The `3` is an open-stroked path with rounded joins (Q curves), matching the favicon's approach but at card scale
- Both use `stroke-linecap="round"` and `stroke-linejoin="round"` for the soft, artistic feel
- Stroke width 18px gives thick but not overpowering strokes at 1200px
- The glow filter doubles the visual weight, so 18px renders as ~30px effective

**Step 2: Open the SVG in a browser to preview**

```bash
open app/public/card-1200x630.svg
```

Verify: Dark background, neon teal `<3` with glow, "thalida.com" text below. Iterate on stroke positions if needed — adjust the polyline points and path commands until the composition feels balanced.

**Step 3: Commit the SVG source**

```bash
git add app/public/card-1200x630.svg
git commit -m "feat: add 1200x630 SVG source for meta card image"
```

---

### Task 2: Create the 512x512 SVG source file

**Files:**
- Create: `app/public/card-512x512.svg`

**Step 1: Create the square SVG with recomposed layout**

Same elements as the 1200x630 but recomposed for square aspect ratio:
- `<3` mark is proportionally larger relative to canvas
- Text sits tighter below the mark
- Glow filter stdDeviation values scaled down slightly for the smaller canvas

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur-wide"/>
      <feColorMatrix in="blur-wide" type="matrix"
        values="0 0 0 0 0.106
                0 0 0 0 0.894
                0 0 0 0 0.549
                0 0 0 0.5 0" result="glow-wide"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur-tight"/>
      <feColorMatrix in="blur-tight" type="matrix"
        values="0 0 0 0 0.106
                0 0 0 0 0.894
                0 0 0 0 0.549
                0 0 0 0.8 0" result="glow-tight"/>
      <feMerge>
        <feMergeNode in="glow-wide"/>
        <feMergeNode in="glow-tight"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="text-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.91
                0 0 0 0 0.94
                0 0 0 0 0.97
                0 0 0 0.3 0" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="512" height="512" fill="#030a12"/>

  <g filter="url(#neon-glow)">
    <polyline
      points="220,100 140,230 220,360"
      fill="none" stroke="#1be48c" stroke-width="16"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path
      d="M270 100 L340 100 Q370 100 370 130 L370 190 Q370 230 340 230 L300 230
         M340 230 Q370 230 370 260 L370 330 Q370 360 340 360 L270 360"
      fill="none" stroke="#1be48c" stroke-width="16"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <text
    x="256" y="440"
    text-anchor="middle"
    font-family="'Space Grotesk', 'SF Pro Display', 'Helvetica Neue', sans-serif"
    font-weight="500"
    font-size="28"
    fill="#e8f0f8"
    filter="url(#text-glow)"
    letter-spacing="3">thalida.com</text>
</svg>
```

**Step 2: Open the SVG in a browser to preview**

```bash
open app/public/card-512x512.svg
```

Verify: Same aesthetic as the wide version, well-composed for square format.

**Step 3: Commit**

```bash
git add app/public/card-512x512.svg
git commit -m "feat: add 512x512 SVG source for meta card image"
```

---

### Task 3: Install resvg and write the PNG conversion script

**Files:**
- Modify: `app/package.json` (add dev dependency)
- Create: `app/scripts/convert-card-svgs.mjs`

**Step 1: Install `@resvg/resvg-js` as a dev dependency**

```bash
cd app && npm install --save-dev @resvg/resvg-js
```

**Step 2: Create the conversion script**

```js
// app/scripts/convert-card-svgs.mjs
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

const conversions = [
  { input: "card-1200x630.svg", output: "card-1200x630.png", width: 1200 },
  { input: "card-512x512.svg", output: "card-512x512.png", width: 512 },
];

for (const { input, output, width } of conversions) {
  const svg = readFileSync(resolve(publicDir, input), "utf-8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: true,
    },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  writeFileSync(resolve(publicDir, output), png);
  console.log(`✓ ${input} → ${output} (${png.length} bytes)`);
}
```

**Step 3: Add an npm script for convenience**

Add to `app/package.json` scripts:
```json
"convert-cards": "node scripts/convert-card-svgs.mjs"
```

**Step 4: Commit**

```bash
git add app/scripts/convert-card-svgs.mjs app/package.json app/package-lock.json
git commit -m "feat: add SVG-to-PNG card conversion script with resvg"
```

---

### Task 4: Generate the PNG files

**Files:**
- Replace: `app/public/card-512x512.png`
- Create: `app/public/card-1200x630.png`

**Step 1: Run the conversion script**

```bash
cd app && npm run convert-cards
```

Expected output:
```
✓ card-1200x630.svg → card-1200x630.png (XXXXX bytes)
✓ card-512x512.svg → card-512x512.png (XXXXX bytes)
```

**Step 2: Verify the PNGs visually**

```bash
open app/public/card-1200x630.png
open app/public/card-512x512.png
```

Verify: Both PNGs render the neon `<3` with glow on midnight background. Text is readable. Colors match.

**Step 3: Commit the generated PNGs**

```bash
git add app/public/card-1200x630.png app/public/card-512x512.png
git commit -m "feat: generate new meta card images with neon <3 design"
```

---

### Task 5: Update SEO component to use 1200x630 as default

**Files:**
- Modify: `app/src/components/SEO/SEO.astro:32`

**Step 1: Update the default OG image path**

In `app/src/components/SEO/SEO.astro`, change line 32 from:
```typescript
const ogImage = image ?? `${siteUrl}/card-512x512.png`;
```
to:
```typescript
const ogImage = image ?? `${siteUrl}/card-1200x630.png`;
```

**Step 2: Verify the build works**

```bash
just app::build
```

Expected: Build succeeds with no errors.

**Step 3: Spot-check the built HTML**

```bash
grep -r "card-1200x630" app/dist/ | head -5
```

Expected: OG image meta tags reference `card-1200x630.png`.

**Step 4: Commit**

```bash
git add app/src/components/SEO/SEO.astro
git commit -m "feat: use 1200x630 card image as default OG image"
```

---

### Task 6: Visual QA and cleanup

**Step 1: Preview the site locally and inspect meta tags**

```bash
just app::serve
```

Open the site in browser, inspect `<head>` → verify `og:image` and `twitter:image` point to the 1200x630 PNG.

**Step 2: Test with an OG debugger**

Paste a preview URL into:
- Twitter Card Validator
- Facebook Sharing Debugger
- LinkedIn Post Inspector

(This can be done after deploy — note for post-merge verification.)

**Step 3: Final commit if any adjustments were needed**

If stroke positions, glow intensity, or text sizing needed adjustment in Steps 1-2, commit those changes.
