---
title: Collection Pagination Design
description: >-
  Add pagination to collection index pages, displaying 50 items at a time using
  Astro's built-in `paginate()` function.
publishedOn: 2026-02-28T08:28:57.000Z
subcategory: collection-pagination
category: layout
tags: [design]
---

# Collection Pagination Design

## Goal

Add pagination to collection index pages, displaying 50 items at a time using Astro's built-in `paginate()` function.

## Scope

- All collection index pages (e.g. `/projects`, `/guides`, `/links`)
- All category-filtered pages (e.g. `/projects/web-apps`, `/links/tools`)
- 50 items per page
- Simple prev/next button UI

## Route Structure Changes

| Current | New | URLs Generated |
|---------|-----|----------------|
| `[collection]/index.astro` | `[collection]/[...page].astro` | `/projects`, `/projects/2`, `/projects/3` |
| `[collection]/[category].astro` | `[collection]/[category]/[...page].astro` | `/projects/web`, `/projects/web/2` |

The `[...page]` rest parameter gives clean URLs: page 1 has no number suffix.

## Approach

Use Astro's native `paginate()` in `getStaticPaths()`. This generates static pages at build time — one per 50-item chunk — with a `page` prop containing:

- `page.data` — items for the current page
- `page.url.prev` / `page.url.next` — navigation URLs
- `page.total` — total item count across all pages
- `page.currentPage` / `page.lastPage` — page position
- `page.size` — page size (50)

## Component Changes

### Route Pages

- `[collection]/[...page].astro`: Call `paginate(items, { pageSize: 50, params: { collection } })` in `getStaticPaths()`
- `[collection]/[category]/[...page].astro`: Same pattern, filtering items by category first

### CollectionGrid

- Receives paginated items (current page slice) plus pagination metadata
- New props: `prevUrl`, `nextUrl`, `currentPage`, `lastPage`
- `itemCount` still shows total count (not per-page count)
- Renders Pagination component below the grid

### Pagination Component (New)

- Simple prev/next buttons
- Shows "Page X of Y"
- Only renders when `lastPage > 1`
- Styled consistently with existing UI (tailwind, font-body, teal accent)

## What Doesn't Change

- `nav-data.ts` — still returns all items
- Card components — no changes
- Masonry layout — works the same on fewer items
- Post pages (`[collection]/post/[...id].astro`) — no changes
- CategoryFilter — links stay as `/${collection}/${category}` (always page 1)
