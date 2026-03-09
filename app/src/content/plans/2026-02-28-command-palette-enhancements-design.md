---
title: Command Palette Enhancements Design
description: 'Four enhancements to the command palette (Cmd+K):'
publishedOn: 2026-02-28T07:36:35.000Z
planType: design
topic: command-palette-enhancements
status: completed
category: layout
---

# Command Palette Enhancements Design

## Summary

Four enhancements to the command palette (Cmd+K):
1. Search post body content via Pagefind
2. Replace tag pills with category labels
3. Show per-row collection + category labels in All mode (remove group headers)
4. Give links a unique style with favicon + domain

## 1. Pagefind Content Search (Hybrid Approach)

### Build Time
- Install `astro-pagefind` integration
- Add `data-pagefind-body` to content detail page layouts so Pagefind indexes post bodies
- Add `data-pagefind-meta` attributes for `collection`, `category`, `id` to map results back to SearchItem

### Runtime (CommandPalette.ts)
- **Empty query:** Current behavior — show recent items from `allItems`, respecting collection filter
- **With query:**
  - Call Pagefind JS API (`await pagefind.search(query)`) for full-text results
  - Simultaneously run current string matching on links (Pagefind can't index them — no detail pages)
  - Merge results: Pagefind results first (ranked by relevance), then link matches
  - If collection filter is active, filter results to that collection
  - Map Pagefind results to existing SearchItem shape using embedded metadata
- **Result limit:** Keep MAX_PALETTE_RESULTS = 15

### Why Hybrid
- Links collection has no individual HTML pages (they link externally), so Pagefind can't index them
- Empty query browse mode is a nice UX that Pagefind doesn't provide
- Hybrid gives full-text search for content + retains link searchability and browse mode

## 2. Replace Tags with Category

Current: Each result row shows up to 2 tag pills below the title.
New: Show category label styled like CardCategory — neon color, uppercase, text-2xs, tracking-widest.

## 3. Per-Row Collection + Category Labels (All Mode)

Current: Results grouped by collection with section headers.
New:
- Remove collection group headers
- Each row shows `Collection · Category` as inline label (muted/neon, text-2xs)
- When a specific collection is selected, only show category (collection is implicit)

## 4. Link-Specific Result Style

When a result is from the `links` collection:
- **Thumbnail area:** Show favicon (16x16) or gradient letter initial (not cover image)
- **Below title:** Show domain hostname + external link icon (inspired by LinkCard)
- **No date** (current behavior)
- Opens in new tab (current behavior)

### Data Requirements
- `faviconUrl` must be included in SearchItem (already available in NavItem)
- Domain is derived from `item.id` (which is the URL for links)

## Result Row Layouts

### Standard result (projects, guides, gallery, recipes, versions):
```
[cover img]  Collection · Category  (All mode)
             Title
                                              Feb 2024
```

### Standard result (specific collection selected):
```
[cover img]  Category
             Title
                                              Feb 2024
```

### Link result:
```
[favicon]    Links · Apps            (All mode)
             Title
             example.com ↗
```

## Files to Modify

- `app/src/components/CommandPalette/CommandPalette.ts` — search logic, result rendering
- `app/src/components/CommandPalette/CommandPalette.astro` — inject faviconUrl data, styles
- `app/src/lib/nav-data.ts` — add faviconUrl to SearchItem data passed to command palette
- `app/src/pages/[collection]/[...slug].astro` (or equivalent detail layout) — add pagefind data attributes
- `astro.config.mjs` — add pagefind integration
- `package.json` — add astro-pagefind dependency
