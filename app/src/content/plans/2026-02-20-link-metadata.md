---
title: Link Metadata Enhancement — Implementation Plan
description: >-
  Enrich link cards with build-time-fetched metadata (favicon, meta title,
  description) and
publishedOn: 2026-02-21T04:44:02.000Z
subcategory: link-metadata
category: content
tags: [implementation]
---

# Link Metadata Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich link cards with build-time-fetched metadata (favicon, meta title, description) and
show the URL; replace the letter-placeholder with a compact text-focused link card.

**Architecture:** Build-time metadata fetching with a `.generated/link-metadata.json` cache.
Favicons are constructed URLs (Google favicon CDN, no fetch). Meta title/description fetched from
page HTML, parsed with regex. `SidebarItem` extended with `faviconUrl`, `metaTitle`,
`metaDescription`.

**Tech Stack:** TypeScript, Astro (SSG), Node.js `fetch`, regex HTML parsing, Cloudflare Pages (deployment).

---


## Task 1: Create `link-metadata.ts` — fetch and cache logic

**Files:**

- Create: `app/src/lib/link-metadata.ts`


### Step 1: Create the file with the `LinkMetadata` type and cache path

```typescript
// app/src/lib/link-metadata.ts
import { promises as fs } from "node:fs";

const CACHE_PATH = ".generated/link-metadata.json";
const FETCH_TIMEOUT_MS = 3000;
const CONCURRENCY = 10;

export type LinkMetadata = {
  metaTitle?: string;
  metaDescription?: string;
  fetchedAt: number;
};

type MetadataCache = Record<string, LinkMetadata>;
```


### Step 2: Add `faviconUrl` constructor (no fetch needed)

```typescript
export function getFaviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}
```


### Step 3: Add HTML metadata parser

```typescript
function parseMetadata(html: string): Pick<LinkMetadata, "metaTitle" | "metaDescription"> {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];

  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];

  return {
    metaTitle: ogTitle ?? titleTag,
    metaDescription: ogDesc ?? metaDesc,
  };
}
```


### Step 4: Add URL fetcher with timeout

```typescript
async function fetchMetadata(url: string): Promise<LinkMetadata> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; thalida.com-bot/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return { fetchedAt: Date.now() };
    const html = await res.text();
    return { ...parseMetadata(html), fetchedAt: Date.now() };
  } catch {
    return { fetchedAt: Date.now() };
  }
}
```


### Step 5: Add the main exported function with cache + concurrency

```typescript
export async function getLinkMetadataMap(urls: string[]): Promise<MetadataCache> {
  // Load existing cache
  let cache: MetadataCache = {};
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    cache = JSON.parse(raw) as MetadataCache;
  } catch {
    // cache missing or corrupt — start fresh
  }

  // Determine which URLs need fetching
  const toFetch = urls.filter((url) => !cache[url]);

  // Fetch in batches of CONCURRENCY
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, meta: await fetchMetadata(url) })));
    for (const { url, meta } of results) {
      cache[url] = meta;
    }
  }

  // Write updated cache
  if (toFetch.length > 0) {
    await fs.mkdir(".generated", { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  }

  return cache;
}
```


### Step 6: Verify no TypeScript errors

```bash
cd app && npx tsc --noEmit
```

Expected: no errors related to `link-metadata.ts`.


### Step 7: Commit

```bash
git add app/src/lib/link-metadata.ts
git commit -m "feat: add build-time link metadata fetcher with file cache"
```

---


## Task 2: Extend `SidebarItem` and enrich links in `getSidebarData()`

**Files:**

- Modify: `app/src/lib/sidebar-data.ts`


### Step 1: Add new fields to `SidebarItem` type

In `sidebar-data.ts`, update the `SidebarItem` interface:

```typescript
export type SidebarItem = {
  id: string;
  collection: string;
  title: string;
  href?: string;
  description?: string;
  tags?: string[];
  category?: string;
  publishedOn: string;
  coverImageSrc?: string;
  coverImageAlt?: string;
  // New fields for links collection:
  faviconUrl?: string;
  metaDescription?: string;
};
```


### Step 2: Import the new utilities at the top of `sidebar-data.ts`

```typescript
import { getLinkMetadataMap, getFaviconUrl } from "./link-metadata";
```


### Step 3: Pre-fetch all link metadata before the main loop

Inside `getSidebarData()`, before the `for (const name of COLLECTION_NAMES)` loop, add:

```typescript
// Pre-fetch metadata for all links
const linkEntries = await getCollection("links", ({ data }) => !data.draft);
const linkUrls = linkEntries.map((e) => e.id);
const linkMetadataMap = await getLinkMetadataMap(linkUrls);
```


### Step 4: Enrich link items inside the loop

Inside the `for (const entry of sorted)` loop, after the `coverImageSrc` block, add:

```typescript
let faviconUrl: string | undefined;
let metaDescription: string | undefined;

if (name === "links") {
  faviconUrl = getFaviconUrl(entry.id);
  const meta = linkMetadataMap[entry.id];
  if (meta) {
    metaDescription = meta.metaDescription;
    // Override title with fetched meta title if available
    if (meta.metaTitle) {
      // title is used below — we'll store the override here
    }
  }
}
```

Then in the `items.push({...})` call, add:

```typescript
title: (name === "links" && linkMetadataMap[entry.id]?.metaTitle) || entry.data.title,
// ...existing fields...
faviconUrl,
metaDescription: metaDescription ?? entry.data.description,
```

> **Note:** The full items.push should look like this after the change:
>
> ```typescript
> items.push({
>   id: entry.id,
>   collection: name,
>   title: (name === "links" && linkMetadataMap[entry.id]?.metaTitle) || entry.data.title,
>   href: entry.data.link,
>   description: entry.data.description,
>   tags: entry.data.tags,
>   category: entry.data.category,
>   publishedOn: entry.data.publishedOn.toISOString(),
>   coverImageSrc,
>   coverImageAlt: entry.data.coverImageAlt,
>   faviconUrl,
>   metaDescription: (name === "links" && linkMetadataMap[entry.id]?.metaDescription) || entry.data.description,
> });
> ```


### Step 5: Check for TypeScript errors

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.


### Step 6: Commit

```bash
git add app/src/lib/sidebar-data.ts
git commit -m "feat: enrich link SidebarItems with favicon URL and fetched metadata"
```

---


## Task 3: Update link card layout in `index.astro`

**Files:**

- Modify: `app/src/pages/[collection]/index.astro`


### Step 1: Extract URL hostname for display

In the items.map render block, for external links, add a `displayUrl` helper:

```typescript
const displayUrl = isExternal ? (() => {
  try { return new URL(item.id).hostname.replace(/^www\./, ""); } catch { return item.id; }
})() : null;
```


### Step 2: Replace link card JSX

Replace the current card JSX for links (the `isExternal` branch) with the compact card:

```jsx
{isExternal ? (
  <a
    href={href}
    class="item-card item-card--link"
    target="_blank"
    rel="noopener"
  >
    <div class="item-card__body">
      <div class="item-card__link-title">
        {item.faviconUrl && (
          <img
            class="item-card__favicon"
            src={item.faviconUrl}
            alt=""
            width="16"
            height="16"
            loading="lazy"
          />
        )}
        <h3 class="item-card__title">{item.title}</h3>
      </div>
      {displayUrl && <p class="item-card__url">{displayUrl}</p>}
      {item.metaDescription && (
        <p class="item-card__description">{item.metaDescription}</p>
      )}
    </div>
  </a>
) : (
  // ...existing non-link card unchanged...
)}
```


### Step 3: Add new CSS for link card

Add to the `<style>` block:

```css
.item-card--link {
  /* no image area — override aspect ratio */
}

.item-card__link-title {
  display: flex;
  align-items: center;
  gap: 0.4em;
}

.item-card__favicon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.item-card__url {
  margin: 0;
  font-size: 0.78em;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```


### Step 4: Verify page renders at localhost:4321/links

Open `http://localhost:4321/links` and confirm:

- Link cards have no image area
- Favicon appears next to title
- URL shown below title
- Description shown if available


### Step 5: Commit

```bash
git add app/src/pages/[collection]/index.astro
git commit -m "feat: compact link card with favicon, URL, and description"
```

---


## Task 4: Apply same link card to `[category].astro`

**Files:**

- Modify: `app/src/pages/[collection]/[category].astro`


### Step 1: Apply the identical changes from Task 3

Copy the same `displayUrl` helper, new link card JSX, and CSS additions into `[category].astro`.

The two files share the same card rendering code so the changes are a direct copy-paste of the diff from Task 3.


### Step 2: Verify at a category URL

Open `http://localhost:4321/links/apps` and confirm the same compact card layout appears.


### Step 3: Commit

```bash
git add app/src/pages/[collection]/[category].astro
git commit -m "feat: apply compact link card layout to category page"
```

---


## Task 5: Final check and cleanup


### Step 1: Full TypeScript check

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.


### Step 2: Lint

```bash
cd /path/to/repo && just lint
```

Expected: no new lint errors.


### Step 3: Check both link pages look correct in browser

- `http://localhost:4321/links` — all links, compact cards
- `http://localhost:4321/links/apps` — filtered by category
- Other collections (e.g. `/projects`) — cards unchanged (still show image area)


### Step 4: Push

```bash
git push
```
