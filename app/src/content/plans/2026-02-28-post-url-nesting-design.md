---
title: Post URL Nesting + Tags on Post Pages
description: >-
  Posts and categories share the same URL segment under `/{collection}/`,
  creating collision risk. Posts also don't display tags on their individual
  pages.
publishedOn: 2026-02-28T08:06:34.000Z
planType: design
topic: post-url-nesting
category: content
---

# Post URL Nesting + Tags on Post Pages

## Problem

Posts and categories share the same URL segment under `/{collection}/`, creating collision risk. Posts also don't display tags on their individual pages.

## Changes

### 1. Nest post routes under `/post/`

Move `[collection]/[...id].astro` to `[collection]/post/[...id].astro`.

- **Before:** `/{collection}/{id}` (e.g. `/projects/advent-of-code`)
- **After:** `/{collection}/post/{id}` (e.g. `/projects/post/advent-of-code`)

Categories stay at `/{collection}/{category}` (unchanged).

### 2. Update all post link generation (4 files)

Insert `/post/` into href construction:

- `StackedCard.astro` — `/${item.collection}/post/${item.id}`
- `FlagCard.astro` — same
- `GalleryCard.astro` — same
- `CommandPalette.ts` — same (non-external links only)

### 3. Redirect bare `/collection/post/`

Add `[collection]/post/index.astro` that redirects to `/{collection}/`.

### 4. Display tags on post pages

Import `CardTags` into the post page template. Render all tags (no max limit) in the metadata area alongside the published date.

### 5. Unchanged

- Breadcrumb links on post pages (point to collection/category pages, not moving)
- Category routes (`/{collection}/{category}`)
- Collection index routes (`/{collection}/`)
