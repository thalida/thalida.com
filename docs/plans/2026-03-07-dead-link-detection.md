# Dead Link Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Detect dead links during build, mark them with a `dead-links` virtual category, exclude them from all views except the `/links/dead-links` category page, and mark them in global search results.

**Architecture:** During the existing metadata fetch in `link-metadata.ts`, track whether each URL returned a failure (non-2xx, timeout, DNS error). Store `dead: boolean` in the metadata cache. In `nav-data.ts`, override the category to `"dead-links"` for dead entries (preserving the original). Filter dead links out of main listing and homepage. In search results, add a visual dead indicator.

**Tech Stack:** Astro, TypeScript, Vitest

---

## Task 1: Add dead flag and re-validation to link-metadata.ts

**Files:**

- Modify: `app/src/lib/link-metadata.ts`
- Test: `app/src/lib/__tests__/link-metadata.test.ts`

**Step 1: Write the failing tests**

Create `app/src/lib/__tests__/link-metadata.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test fetchMetadata indirectly through getLinkMetadataMap
// since fetchMetadata is not exported. Mock global fetch.

describe("link-metadata", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("fetchMetadata dead detection", () => {
    it("marks a link as dead: false when fetch succeeds with 200", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");
      vi.spyOn(mockFs.promises, "readFile").mockRejectedValue(new Error("no cache"));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: async () => "<html><title>Test</title></html>",
        }),
      );

      const result = await getLinkMetadataMap(["https://example.com"]);
      expect(result["https://example.com"].dead).toBe(false);
    });

    it("marks a link as dead: true when fetch returns 404", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");
      vi.spyOn(mockFs.promises, "readFile").mockRejectedValue(new Error("no cache"));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404 }),
      );

      const result = await getLinkMetadataMap(["https://dead.example.com"]);
      expect(result["https://dead.example.com"].dead).toBe(true);
    });

    it("marks a link as dead: true when fetch throws (network error)", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");
      vi.spyOn(mockFs.promises, "readFile").mockRejectedValue(new Error("no cache"));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      );

      const result = await getLinkMetadataMap(["https://unreachable.example.com"]);
      expect(result["https://unreachable.example.com"].dead).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/lib/__tests__/link-metadata.test.ts`
Expected: FAIL — `dead` property doesn't exist on `LinkMetadata`

**Step 3: Add `dead` flag to `LinkMetadata` type and `REVALIDATE_AFTER_MS` constant**

In `app/src/lib/link-metadata.ts`, modify the type and add constant:

```typescript
// line 4-6: add REVALIDATE_AFTER_MS after existing constants
const CACHE_PATH = ".generated/link-metadata.json";
const FETCH_TIMEOUT_MS = 3000;
const CONCURRENCY = 10;
const REVALIDATE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// line 8-13: add dead field to LinkMetadata
export type LinkMetadata = {
  metaTitle?: string;
  metaDescription?: string;
  faviconUrl?: string;
  dead?: boolean;
  fetchedAt: number;
};
```

**Step 4: Update `fetchMetadata` to set `dead` flag**

In `app/src/lib/link-metadata.ts`, modify `fetchMetadata` (lines 68-89):

```typescript
async function fetchMetadata(url: string): Promise<LinkMetadata> {
  try {
    const [pageResult, faviconUrl] = await Promise.all([
      (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; thalida.com-bot/1.0)" },
        });
        clearTimeout(timer);
        if (!res.ok) return { dead: true as const };
        const html = await res.text();
        return { ...parseMetadata(html), dead: false as const };
      })(),
      validateFavicon(url),
    ]);
    return { ...pageResult, faviconUrl, fetchedAt: Date.now() };
  } catch {
    return { dead: true, fetchedAt: Date.now() };
  }
}
```

Key changes:
- `!res.ok` now returns `{ dead: true }` instead of `{}`
- Success returns `{ ...parseMetadata(html), dead: false }`
- Catch block sets `dead: true`

**Step 5: Add re-validation to `getLinkMetadataMap`**

In `app/src/lib/link-metadata.ts`, modify `getLinkMetadataMap` (lines 91-125).
Add `toRevalidate` after `toRevalidateFavicon` (line 101):

```typescript
export async function getLinkMetadataMap(urls: string[]): Promise<MetadataCache> {
  let cache: MetadataCache = {};
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    cache = JSON.parse(raw) as MetadataCache;
  } catch {
    // cache missing or corrupt — start fresh
  }

  const now = Date.now();
  const toFetch = urls.filter((url) => !cache[url]);
  const toRevalidateFavicon = urls.filter((url) => cache[url] && !("faviconUrl" in cache[url]));
  const toRevalidate = urls.filter(
    (url) => cache[url] && cache[url].fetchedAt + REVALIDATE_AFTER_MS < now,
  );

  // Fetch new URLs
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, meta: await fetchMetadata(url) })));
    for (const { url, meta } of results) {
      cache[url] = meta;
    }
  }

  // Re-validate stale URLs (updates dead status + metadata)
  for (let i = 0; i < toRevalidate.length; i += CONCURRENCY) {
    const batch = toRevalidate.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, meta: await fetchMetadata(url) })));
    for (const { url, meta } of results) {
      cache[url] = meta;
    }
  }

  // Re-validate missing favicons
  for (let i = 0; i < toRevalidateFavicon.length; i += CONCURRENCY) {
    const batch = toRevalidateFavicon.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, faviconUrl: await validateFavicon(url) })));
    for (const { url, faviconUrl } of results) {
      cache[url] = { ...cache[url], faviconUrl };
    }
  }

  if (toFetch.length > 0 || toRevalidate.length > 0 || toRevalidateFavicon.length > 0) {
    await fs.mkdir(".generated", { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  }

  return cache;
}
```

**Step 6: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/__tests__/link-metadata.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add app/src/lib/link-metadata.ts app/src/lib/__tests__/link-metadata.test.ts
git commit -m "feat: add dead link detection and 7-day re-validation to metadata fetch"
```

---

## Task 2: Add `originalCategory` to NavItem and override category for dead links

**Files:**

- Modify: `app/src/lib/nav-data.ts`

**Step 1: Add `originalCategory` to `NavItem` type**

In `app/src/lib/nav-data.ts` line 8-21, add `originalCategory`:

```typescript
export type NavItem = {
  id: string;
  collection: string;
  title: string;
  href?: string;
  description?: string;
  tags?: string[];
  category?: string;
  originalCategory?: string;
  publishedOn: string;
  coverImageSrc?: string;
  coverImageAlt?: string;
  faviconUrl?: string;
  metaDescription?: string;
};
```

**Step 2: Override category for dead links in `getNavData()`**

In `app/src/lib/nav-data.ts`, modify the link item building logic (lines 74-90).
Replace:

```typescript
      const isLink = name === "links";
      const linkMeta = isLink ? linkMetadataMap[entry.id] : undefined;

      items.push({
        id: entry.id,
        collection: name,
        title: (isLink && linkMeta?.metaTitle) || entry.data.title,
        href: entry.data.link,
        description: entry.data.description,
        tags: entry.data.tags,
        category: entry.data.category,
        publishedOn: entry.data.publishedOn.toISOString(),
        coverImageSrc,
        coverImageAlt: entry.data.coverImageAlt,
        faviconUrl: isLink ? linkMeta?.faviconUrl : undefined,
        metaDescription: (isLink && linkMeta?.metaDescription) || entry.data.description,
      });
```

With:

```typescript
      const isLink = name === "links";
      const linkMeta = isLink ? linkMetadataMap[entry.id] : undefined;
      const isDead = isLink && linkMeta?.dead === true;

      const category = isDead ? "dead-links" : entry.data.category;
      if (category) categoriesSet.add(category);

      items.push({
        id: entry.id,
        collection: name,
        title: (isLink && linkMeta?.metaTitle) || entry.data.title,
        href: entry.data.link,
        description: entry.data.description,
        tags: entry.data.tags,
        category,
        originalCategory: isDead ? entry.data.category : undefined,
        publishedOn: entry.data.publishedOn.toISOString(),
        coverImageSrc,
        coverImageAlt: entry.data.coverImageAlt,
        faviconUrl: isLink ? linkMeta?.faviconUrl : undefined,
        metaDescription: (isLink && linkMeta?.metaDescription) || entry.data.description,
      });
```

Also remove the existing `categoriesSet.add` on line 72 since it's now handled inside the block:

```typescript
      // DELETE this line (line 72):
      // if (entry.data.category) categoriesSet.add(entry.data.category);
```

**Step 3: Verify the build works**

Run: `just app::build`
Expected: Build succeeds. If any links are dead, `dead-links` appears in the categories list.

**Step 4: Commit**

```bash
git add app/src/lib/nav-data.ts
git commit -m "feat: override category to dead-links for dead entries in nav-data"
```

---

## Task 3: Filter dead links from main listing page and homepage

**Files:**

- Modify: `app/src/pages/[collection]/[...page].astro`
- Modify: `app/src/pages/index.astro`

**Step 1: Filter dead links from the collection listing page**

In `app/src/pages/[collection]/[...page].astro`, modify `getStaticPaths` (lines 12-24).
Change `collectionData.items` to filter out dead links for the links collection:

```typescript
export async function getStaticPaths({ paginate }: GetStaticPathsOptions) {
  const navData = await getNavData();
  const pages = COLLECTION_NAMES.flatMap((collection) => {
    const collectionData = navData[collection];
    if (!collectionData) return [];
    const items =
      collection === "links"
        ? collectionData.items.filter((item) => item.category !== "dead-links")
        : collectionData.items;
    return paginate(items, {
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
```

**Step 2: Filter dead links from homepage**

In `app/src/pages/index.astro`, modify the featured collections section (line 49).
Change:

```typescript
const items = collection.items.slice(0, 3);
```

To:

```typescript
const items = collection.items
  .filter((item) => item.category !== "dead-links")
  .slice(0, 3);
```

**Step 3: Verify the build works**

Run: `just app::build`
Expected: Build succeeds. Dead links don't appear on homepage or main `/links` listing.

**Step 4: Commit**

```bash
git add app/src/pages/[collection]/[...page].astro app/src/pages/index.astro
git commit -m "feat: filter dead links from collection listing and homepage"
```

---

## Task 4: Show original category on dead link cards

**Files:**

- Modify: `app/src/components/Card/LinkCard.astro`

**Step 1: Show original category instead of "Dead Links" on card**

In `app/src/components/Card/LinkCard.astro`, modify line 26. Change:

```astro
<CardCategory category={item.category} />
```

To:

```astro
<CardCategory category={item.originalCategory ?? item.category} />
```

This means when viewing the `/links/dead-links` category page, each card shows what category the link originally belonged to (e.g., "Apps", "Dev Toolkit") rather than "Dead Links".

**Step 2: Verify with a dev build**

Run: `just app::build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/src/components/Card/LinkCard.astro
git commit -m "feat: show original category on dead link cards"
```

---

## Task 5: Mark dead links in global search results

**Files:**

- Modify: `app/src/components/CommandPalette/command-palette-render.ts`
- Modify: `app/src/components/CommandPalette/CommandPalette.astro`

**Step 1: Add dead-link CSS class in render logic**

In `app/src/components/CommandPalette/command-palette-render.ts`, modify `renderItem` (around line 29-30).
After `root.dataset.index = String(idx);`, add:

```typescript
  if (item.category === "dead-links") {
    root.classList.add("cp-row--dead");
  }
```

Also, for dead links show the original category in the meta section instead of "Dead Links".
Modify line 33. Change:

```typescript
  const catDisplay = item.category ? categoryDisplay(item.category) : "";
```

To:

```typescript
  const catDisplay = item.originalCategory
    ? categoryDisplay(item.originalCategory)
    : item.category
      ? categoryDisplay(item.category)
      : "";
```

This requires `originalCategory` to be available on `SearchItem`. Since `SearchItem` extends `NavItem`, and `NavItem` now has `originalCategory`, this works automatically.

**Step 2: Add dead-link styling to CommandPalette.astro**

In `app/src/components/CommandPalette/CommandPalette.astro`, add to the global `<style is:global>` block (after line 94):

```css
  .cp-results .cp-row--dead {
    @apply opacity-50;
  }
  .cp-results .cp-row--dead .cp-row__title::after {
    content: " (dead link)";
    @apply text-error text-2xs font-normal;
  }
```

**Step 3: Verify the build works**

Run: `just app::build`
Expected: Build succeeds. Dead links appear dimmed in search with "(dead link)" label.

**Step 4: Commit**

```bash
git add app/src/components/CommandPalette/command-palette-render.ts app/src/components/CommandPalette/CommandPalette.astro
git commit -m "feat: mark dead links visually in global search results"
```

---

## Task 6: Run full test suite and final build verification

**Step 1: Run all tests**

Run: `just test`
Expected: All tests pass.

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: No type errors.

**Step 3: Run full build**

Run: `just app::build`
Expected: Build succeeds cleanly.

**Step 4: Commit any remaining fixes**

If any fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: address test/typecheck issues from dead link detection"
```
