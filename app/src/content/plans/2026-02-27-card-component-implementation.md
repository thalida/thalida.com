---
title: Card Component System Implementation Plan
description: >-
  Extract all card variants from CollectionGrid and the home page into a shared
  Card component system.
publishedOn: 2026-02-28T04:25:48.000Z
planType: implementation
topic: card-component
category: styling
---

# Card Component System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract all card variants from CollectionGrid and the home page into a shared Card component system.

**Architecture:** Dispatcher pattern — `Card.astro` accepts a `variant` prop and delegates to one of four sub-components (`StackedCard`, `LinkCard`, `FlagCard`, `GalleryCard`). Shared helpers live in `card-utils.ts`. CollectionGrid and the home page both import the single `Card` component.

**Tech Stack:** Astro components, TypeScript, Tailwind CSS v4

---

### Task 1: Create card-utils.ts

**Files:**
- Create: `app/src/components/Card/card-utils.ts`

**Step 1: Create the shared utility module**

Extract `PLACEHOLDER_COLORS`, `pickColor`, and `tileSvg` from `CollectionGrid.astro` (lines 22-52) into a new module. Also re-export `categoryDisplay` from nav-data for convenience.

```ts
import { categoryDisplay } from "@lib/nav-data";

export { categoryDisplay };

export const PLACEHOLDER_COLORS = [
  "#39FF14" /* neon green */,
  "#00E5A0" /* teal */,
  "#00D4AA" /* mint */,
  "#0A8F6F" /* deep teal */,
  "#2B9F4B" /* forest green */,
  "#1CB5A0" /* sea green */,
];

export function pickColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export function tileSvg(title: string): string {
  const label = title.toUpperCase() + " ";
  const escaped = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const charW = 6.8;
  const w = Math.ceil(label.length * charW);
  const h = 34;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<text x="0" y="12" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="0.6" fill="rgba(3,10,18,0.18)">${escaped}</text>` +
    `<text x="${Math.round(w / 2)}" y="29" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="0.6" fill="rgba(3,10,18,0.18)">${escaped}</text>` +
    `<text x="${Math.round(-w / 2)}" y="29" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="0.6" fill="rgba(3,10,18,0.18)">${escaped}</text>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
```

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds (new file is valid TS but not yet imported anywhere)

**Step 3: Commit**

```bash
git add app/src/components/Card/card-utils.ts
git commit -m "feat(Card): add card-utils with shared placeholder helpers"
```

---

### Task 2: Create StackedCard.astro

**Files:**
- Create: `app/src/components/Card/StackedCard.astro`

**Step 1: Create the stacked card component**

Extract the stacked card markup from `CollectionGrid.astro` lines 227-275 into its own component. The `item-card` class must remain on the outer `<a>` for the masonry script to work.

```astro
---
import type { NavItem } from "@lib/nav-data";
import { categoryDisplay, pickColor, tileSvg } from "./card-utils";

interface Props {
  item: NavItem;
}

const { item } = Astro.props;

const href = `/${item.collection}/${item.id}`;

const eyebrow = [
  item.category ? categoryDisplay(item.category) : null,
  item.publishedOn ? new Date(item.publishedOn).getFullYear() : null,
]
  .filter(Boolean)
  .join(" · ");

const placeholderColor = pickColor(item.title);
---

<a
  href={href}
  class="group item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover flex flex-col overflow-hidden"
>
  {item.coverImageSrc ? (
    <div class="overflow-hidden bg-midnight border-b border-border h-24 rounded-t-sm">
      <img
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        src={item.coverImageSrc}
        alt={item.coverImageAlt ?? item.title}
        loading="lazy"
      />
    </div>
  ) : (
    <div
      class="overflow-hidden bg-midnight border-b border-border h-24 rounded-t-sm relative"
      style={`background-color: ${placeholderColor}; background-image: ${tileSvg(item.title)}; background-repeat: repeat;`}
    />
  )}
  <div class="flex flex-col gap-1 p-3">
    {eyebrow && (
      <p class="m-0 font-body uppercase text-neon font-semibold text-2xs tracking-widest">{eyebrow}</p>
    )}
    <h3 class="m-0 font-heading font-bold text-text leading-snug text-base">{item.title}</h3>
    {item.description && (
      <p class="m-0 font-body text-muted leading-relaxed text-xs line-clamp-2">{item.description}</p>
    )}
    {item.tags && item.tags.length > 0 && (
      <div class="flex flex-wrap gap-1 mt-3">
        {item.tags.slice(0, 3).map((tag) => (
          <span class="bg-transparent border border-teal text-teal capitalize text-2xs rounded-sm py-0.5 px-2 tracking-wide">
            {tag}
          </span>
        ))}
      </div>
    )}
  </div>
</a>
```

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/src/components/Card/StackedCard.astro
git commit -m "feat(Card): add StackedCard variant component"
```

---

### Task 3: Create LinkCard.astro

**Files:**
- Create: `app/src/components/Card/LinkCard.astro`

**Step 1: Create the link card component**

Extract link card markup from `CollectionGrid.astro` lines 102-161.

```astro
---
import type { NavItem } from "@lib/nav-data";

interface Props {
  item: NavItem;
}

const { item } = Astro.props;

const href = item.id;

const displayUrl = (() => {
  try {
    return new URL(item.id).hostname.replace(/^www\./, "");
  } catch {
    return item.id;
  }
})();
---

<a
  href={href}
  class="item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover flex flex-col gap-1 p-3"
  target="_blank"
  rel="noopener"
>
  <p class="m-0 text-muted flex items-center gap-1 text-2xs normal-case">
    {displayUrl}
    <svg
      class="text-muted opacity-60"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  </p>
  <h3 class="m-0 font-heading font-bold text-text leading-snug flex items-center gap-2 text-base">
    {item.faviconUrl ? (
      <img
        class="shrink-0 inline-block rounded-sm align-middle"
        src={item.faviconUrl}
        alt=""
        width="16"
        height="16"
        loading="lazy"
      />
    ) : (
      <span class="shrink-0 font-display font-bold uppercase text-xs w-4 text-center gradient-text">
        {item.title.charAt(0)}
      </span>
    )}
    {item.title}
  </h3>
  {(item.description || item.metaDescription) && (
    <p class="m-0 font-body text-muted leading-relaxed text-xs">
      {item.description || item.metaDescription}
    </p>
  )}
</a>
```

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/src/components/Card/LinkCard.astro
git commit -m "feat(Card): add LinkCard variant component"
```

---

### Task 4: Create FlagCard.astro

**Files:**
- Create: `app/src/components/Card/FlagCard.astro`

**Step 1: Create the flag card component**

Extract flag card markup from `CollectionGrid.astro` lines 163-188.

```astro
---
import type { NavItem } from "@lib/nav-data";

interface Props {
  item: NavItem;
}

const { item } = Astro.props;

const href = `/${item.collection}/${item.id}`;
---

<a
  href={href}
  class="group item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover flex flex-row items-center p-3 gap-4"
>
  <div class="shrink-0 flex items-center justify-center bg-midnight border border-border overflow-hidden w-16 h-16 rounded-sm">
    {item.coverImageSrc ? (
      <img
        class="w-full h-full object-cover"
        src={item.coverImageSrc}
        alt={item.coverImageAlt ?? item.title}
        loading="lazy"
      />
    ) : (
      <span class="font-display font-bold uppercase text-2xl gradient-text">{item.title.charAt(0)}</span>
    )}
  </div>
  <div class="flex-1 min-w-0 flex flex-col gap-1">
    <h3 class="m-0 font-heading font-bold text-text leading-snug text-base">{item.title}</h3>
    {item.description && <p class="m-0 font-body text-muted leading-relaxed text-xs">{item.description}</p>}
  </div>
</a>
```

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/src/components/Card/FlagCard.astro
git commit -m "feat(Card): add FlagCard variant component"
```

---

### Task 5: Create GalleryCard.astro

**Files:**
- Create: `app/src/components/Card/GalleryCard.astro`

**Step 1: Create the gallery card component**

Extract gallery card markup from `CollectionGrid.astro` lines 190-224.

```astro
---
import type { NavItem } from "@lib/nav-data";
import { categoryDisplay, pickColor, tileSvg } from "./card-utils";

interface Props {
  item: NavItem;
}

const { item } = Astro.props;

const href = `/${item.collection}/${item.id}`;
const placeholderColor = pickColor(item.title);
---

<a
  href={href}
  class="group item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover overflow-hidden flex flex-col max-h-80"
>
  <div class="overflow-hidden flex-1">
    {item.coverImageSrc ? (
      <img
        class="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        src={item.coverImageSrc}
        alt={item.coverImageAlt ?? item.title}
        loading="lazy"
      />
    ) : (
      <div
        class="w-full h-full aspect-4/3"
        style={`background-color: ${placeholderColor}; background-image: ${tileSvg(item.title)}; background-repeat: repeat;`}
      />
    )}
  </div>
  <div class="p-3 flex flex-col gap-0.5">
    <h3 class="m-0 font-heading font-bold text-text text-sm leading-snug">{item.title}</h3>
    {item.category && (
      <span class="font-body uppercase text-neon font-semibold text-2xs tracking-widest">
        {categoryDisplay(item.category)}
      </span>
    )}
  </div>
</a>
```

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/src/components/Card/GalleryCard.astro
git commit -m "feat(Card): add GalleryCard variant component"
```

---

### Task 6: Create Card.astro dispatcher

**Files:**
- Create: `app/src/components/Card/Card.astro`

**Step 1: Create the dispatcher component**

```astro
---
import type { NavItem } from "@lib/nav-data";
import StackedCard from "./StackedCard.astro";
import LinkCard from "./LinkCard.astro";
import FlagCard from "./FlagCard.astro";
import GalleryCard from "./GalleryCard.astro";

export type CardVariant = "stacked" | "link" | "flag" | "gallery";

interface Props {
  variant?: CardVariant;
  item: NavItem;
}

const { variant = "stacked", item } = Astro.props;
---

{variant === "link" && <LinkCard item={item} />}
{variant === "flag" && <FlagCard item={item} />}
{variant === "gallery" && <GalleryCard item={item} />}
{variant === "stacked" && <StackedCard item={item} />}
```

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/src/components/Card/Card.astro
git commit -m "feat(Card): add Card dispatcher component"
```

---

### Task 7: Update CollectionGrid to use Card

**Files:**
- Modify: `app/src/components/CollectionGrid/CollectionGrid.astro`

**Step 1: Update CollectionGrid**

Changes to make:
1. Replace `import { categoryDisplay, type NavItem } from "@lib/nav-data"` with `import type { NavItem } from "@lib/nav-data"` and add `import Card from "@components/Card/Card.astro"`. Also add `import type { CardVariant } from "@components/Card/Card.astro"`.
2. Remove the `PLACEHOLDER_COLORS` array, `pickColor` function, and `tileSvg` function (lines 22-52) — these now live in `card-utils.ts`.
3. Keep the `FLAG_COLLECTIONS`, `GALLERY_COLLECTIONS`, `useFlag`, `useGallery` logic.
4. Replace the entire `items.map()` body (lines 98-276) with variant resolution + `<Card>` rendering:

```astro
{
  items.map((item) => {
    const isExternal = item.collection === "links";
    let variant: CardVariant = "stacked";
    if (isExternal) variant = "link";
    else if (useFlag) variant = "flag";
    else if (useGallery) variant = "gallery";

    return <Card variant={variant} item={item} />;
  })
}
```

5. The `categoryDisplay` import is no longer needed in this file (it was only used inside card markup). Remove it.
6. Leave the masonry `<script>` and `<style>` blocks unchanged.

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Visually verify**

Run: `just app::serve`
Navigate to collection pages (`/projects`, `/recipes`, `/links`, `/gallery`) and confirm cards render identically to before.

**Step 4: Commit**

```bash
git add app/src/components/CollectionGrid/CollectionGrid.astro
git commit -m "refactor(CollectionGrid): use Card component instead of inline markup"
```

---

### Task 8: Update home page to use Card

**Files:**
- Modify: `app/src/pages/index.astro`

**Step 1: Update the home page**

Changes to make:
1. Add import: `import Card from "@components/Card/Card.astro";`
2. Replace the featured projects card markup (lines 51-73) with:

```astro
{
  featuredProjects.map((project) => (
    <Card item={project} />
  ))
}
```

The `variant` defaults to `"stacked"` so no need to pass it explicitly.

**Step 2: Verify build**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Visually verify**

Run: `just app::serve`
Navigate to `/` and confirm:
- Featured project cards now use the stacked card style (96px cover, eyebrow with category + year, tag pills)
- Hover effects work (lift + shadow)
- Links navigate correctly to `/projects/{id}`

**Step 4: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "refactor(home): use Card component for featured projects"
```

---

### Task 9: Final build verification

**Step 1: Full build**

Run: `just app::build`
Expected: Build succeeds with no warnings

**Step 2: Run tests (if any)**

Run: `just test`
Expected: All tests pass

**Step 3: Commit design doc**

```bash
git add docs/plans/2026-02-27-card-component-design.md docs/plans/2026-02-27-card-component-implementation.md
git commit -m "docs: add card component design and implementation plan"
```
