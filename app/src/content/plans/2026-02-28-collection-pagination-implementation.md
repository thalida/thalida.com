---
title: Collection Pagination Implementation Plan
description: >-
  Add static pagination (50 items/page) to all collection index and category
  pages using Astro's built-in `paginate()`.
publishedOn: 2026-02-28T08:28:57.000Z
planType: implementation
topic: collection-pagination
category: layout
---

# Collection Pagination Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add static pagination (50 items/page) to all collection index and category pages using Astro's built-in `paginate()`.

**Architecture:** Replace current index/category route files with rest-parameter variants (`[...page].astro`) that call Astro's `paginate()` in `getStaticPaths()`. Add a Pagination component for prev/next navigation. CollectionGrid gains pagination props.

**Tech Stack:** Astro 5 `paginate()`, Tailwind CSS

---

### Task 1: Create Pagination Component

**Files:**
- Create: `app/src/components/Pagination/Pagination.astro`

**Step 1: Create the Pagination component**

```astro
---
interface Props {
  prevUrl: string | undefined;
  nextUrl: string | undefined;
  currentPage: number;
  lastPage: number;
}

const { prevUrl, nextUrl, currentPage, lastPage } = Astro.props;
---

{lastPage > 1 && (
  <nav aria-label="Pagination" class="flex items-center justify-center gap-6 mt-10 font-body text-sm">
    {prevUrl ? (
      <a href={prevUrl} class="text-teal no-underline hover:text-neon transition-colors">
        &larr; Previous
      </a>
    ) : (
      <span class="text-muted/40">&larr; Previous</span>
    )}

    <span class="text-muted">Page {currentPage} of {lastPage}</span>

    {nextUrl ? (
      <a href={nextUrl} class="text-teal no-underline hover:text-neon transition-colors">
        Next &rarr;
      </a>
    ) : (
      <span class="text-muted/40">Next &rarr;</span>
    )}
  </nav>
)}
```

**Step 2: Commit**

```bash
git add app/src/components/Pagination/Pagination.astro
git commit -m "feat: add Pagination component with prev/next navigation"
```

---

### Task 2: Update CollectionGrid to Support Pagination

**Files:**
- Modify: `app/src/components/CollectionGrid/CollectionGrid.astro`

**Step 1: Add pagination props and render the Pagination component**

Add to the Props interface:
```typescript
prevUrl?: string;
nextUrl?: string;
currentPage?: number;
lastPage?: number;
```

Destructure the new props alongside existing ones:
```typescript
const { collection, title, subtitle, itemCount, items, allCategories, activeCategory, prevUrl, nextUrl, currentPage, lastPage } = Astro.props;
```

Add the Pagination import at top:
```typescript
import Pagination from "@components/Pagination/Pagination.astro";
```

Add the Pagination component after the closing `</div>` of the `.items-grid` div (before the closing `</div>` of the outer wrapper):
```astro
<Pagination prevUrl={prevUrl} nextUrl={nextUrl} currentPage={currentPage ?? 1} lastPage={lastPage ?? 1} />
```

**Step 2: Commit**

```bash
git add app/src/components/CollectionGrid/CollectionGrid.astro
git commit -m "feat: add pagination props to CollectionGrid"
```

---

### Task 3: Replace Collection Index with Paginated Route

**Files:**
- Delete: `app/src/pages/[collection]/index.astro`
- Create: `app/src/pages/[collection]/[...page].astro`

**Step 1: Create the paginated route file**

The new file uses Astro's `paginate()` function. Key differences from the old `index.astro`:
- `getStaticPaths()` loops over collections, calls `paginate()` for each, and flattens the results
- The `page` prop from Astro provides `.data` (items for current page), `.url.prev`, `.url.next`, `.currentPage`, `.lastPage`, and `.total`
- `itemCount` uses `page.total` (total across all pages, not just current page)

```astro
---
import type { GetStaticPathsOptions } from "astro";
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
import CollectionGrid from "@components/CollectionGrid/CollectionGrid.astro";
import { getNavData, type NavItem } from "@lib/nav-data";
import { COLLECTION_NAMES, collectionMeta, type CollectionName } from "../../content.config";

const PAGE_SIZE = 50;

export async function getStaticPaths({ paginate }: GetStaticPathsOptions) {
  const navData = await getNavData();
  const pages = COLLECTION_NAMES.flatMap((collection) => {
    const collectionData = navData[collection];
    if (!collectionData) return [];
    return paginate(collectionData.items, {
      pageSize: PAGE_SIZE,
      params: { collection },
      props: {
        title: collectionData.title,
        allCategories: collectionData.allCategories,
      },
    });
  });
  return pages;
}

const { collection } = Astro.params as { collection: CollectionName };
const page = Astro.props.page as {
  data: NavItem[];
  start: number;
  end: number;
  total: number;
  currentPage: number;
  lastPage: number;
  size: number;
  url: { current: string; prev: string | undefined; next: string | undefined };
};
const { title, allCategories } = Astro.props as { title: string; allCategories: string[] };
---

<BaseLayout title={`${title} · thalida`} activeCollection={collection}>
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={collectionMeta[collection].description}
    itemCount={page.total}
    items={page.data}
    allCategories={allCategories}
    prevUrl={page.url.prev}
    nextUrl={page.url.next}
    currentPage={page.currentPage}
    lastPage={page.lastPage}
  />
</BaseLayout>
```

**Step 2: Delete the old index file**

```bash
rm app/src/pages/[collection]/index.astro
```

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds, generates paginated routes for each collection.

**Step 4: Commit**

```bash
git add app/src/pages/[collection]/[...page].astro
git add -u app/src/pages/[collection]/index.astro
git commit -m "feat: replace collection index with paginated route"
```

---

### Task 4: Replace Category Page with Paginated Route

**Files:**
- Delete: `app/src/pages/[collection]/[category].astro`
- Create: `app/src/pages/[collection]/[category]/[...page].astro`

**Step 1: Create the paginated category route file**

Same pattern as Task 3, but filters items by category before paginating. Redirects to the collection page if the category has no items.

```astro
---
import type { GetStaticPathsOptions } from "astro";
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
import CollectionGrid from "@components/CollectionGrid/CollectionGrid.astro";
import { getNavData, categoryDisplay, type NavItem } from "@lib/nav-data";
import { COLLECTION_NAMES, collectionMeta, type CollectionName } from "../../../content.config";

const PAGE_SIZE = 50;

export async function getStaticPaths({ paginate }: GetStaticPathsOptions) {
  const navData = await getNavData();
  const pages = COLLECTION_NAMES.flatMap((collection) => {
    const collectionData = navData[collection];
    if (!collectionData) return [];
    return collectionData.allCategories.flatMap((category) => {
      const filtered = collectionData.items.filter((item) => item.category === category);
      if (filtered.length === 0) return [];
      return paginate(filtered, {
        pageSize: PAGE_SIZE,
        params: { collection, category },
        props: {
          title: collectionData.title,
          allCategories: collectionData.allCategories,
        },
      });
    });
  });
  return pages;
}

const { collection, category } = Astro.params as { collection: CollectionName; category: string };
const page = Astro.props.page as {
  data: NavItem[];
  start: number;
  end: number;
  total: number;
  currentPage: number;
  lastPage: number;
  size: number;
  url: { current: string; prev: string | undefined; next: string | undefined };
};
const { title, allCategories } = Astro.props as { title: string; allCategories: string[] };
---

<BaseLayout title={`${categoryDisplay(category)} · ${title} · thalida`} activeCollection={collection}>
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={collectionMeta[collection].description}
    itemCount={page.total}
    items={page.data}
    allCategories={allCategories}
    activeCategory={category}
    prevUrl={page.url.prev}
    nextUrl={page.url.next}
    currentPage={page.currentPage}
    lastPage={page.lastPage}
  />
</BaseLayout>
```

**Step 2: Delete the old category file**

```bash
rm app/src/pages/[collection]/[category].astro
```

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds, generates paginated category routes.

**Step 4: Commit**

```bash
git add app/src/pages/[collection]/[category]/[...page].astro
git add -u app/src/pages/[collection]/[category].astro
git commit -m "feat: replace category page with paginated route"
```

---

### Task 5: Run Tests and Final Verification

**Step 1: Run existing tests**

Run: `just app::test`
Expected: All 40 existing tests pass (no regressions).

**Step 2: Build the full site**

Run: `just app::build`
Expected: Clean build with no warnings or errors.

**Step 3: Spot-check generated output**

Run: `ls app/dist/projects/ | head -20`
Expected: See `index.html` (page 1) and numbered directories (`2/`, `3/`, etc.) if the collection has >50 items, plus category subdirectories and post subdirectories.

**Step 4: Commit any remaining changes**

If any fixes were needed, commit them.
