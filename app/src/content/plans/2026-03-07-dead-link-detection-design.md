---
title: "Dead Link Detection — Design"
description: "When external links in the links collection go dead (404, timeout, DNS failure, etc.), they continue to appear across the site. There's no way to detect or surface broken links."
publishedOn: 2026-03-07
planType: "design"
topic: "dead-link-detection"
status: "completed"
---

# Dead Link Detection — Design

## Problem

When external links in the links collection go dead (404, timeout, DNS failure, etc.), they continue to appear across the site. There's no way to detect or surface broken links.

## Solution

Detect dead links during the existing metadata fetch at build time. Track dead status in the metadata cache (`.generated/link-metadata.json`). Dead links get a virtual `"dead-links"` category at render time — excluded from all views except the `/links/dead-links` category page. YAML source files are never modified.

## Decisions

| Question | Answer |
|----------|--------|
| What counts as dead? | Any failure: non-2xx HTTP status, timeout, DNS failure, connection refused |
| When does validation run? | Every build, during metadata fetch |
| Where is dead status stored? | `.generated/link-metadata.json` (existing cache) |
| Is the original category preserved? | Yes — stored as `originalCategory` on `NavItem` |
| Re-validation? | Links older than 7 days are re-fetched to detect newly-dead links and auto-heal revived ones |
| How are dead links displayed? | Only on `/links/dead-links` category page; card shows original category |

## Approach: Cache Flag + Category Override

### link-metadata.ts

- Add `dead?: boolean` to `LinkMetadata` type
- Add `REVALIDATE_AFTER_MS = 7 * 24 * 60 * 60 * 1000`
- In `fetchMetadata()`: set `dead: true` on any failure, `dead: false` on success
- In `getLinkMetadataMap()`: add `toRevalidate` list for URLs where `fetchedAt` is stale (>7 days); re-fetch them alongside new URLs

### nav-data.ts

- Add `originalCategory?: string` to `NavItem` type
- When building link items: if `linkMeta?.dead === true`, set `category` to `"dead-links"` and `originalCategory` to the YAML category
- Add `"dead-links"` to `allCategories` when dead links exist
- Keep dead links in the items list (needed for category page generation)

### Collection listing page ([...page].astro)

- Filter out items with `category === "dead-links"` before paginating (links collection only)

### Homepage (index.astro)

- Filter out `category === "dead-links"` items before slicing first 3

### Category page ([category]/[...page].astro)

- No changes needed — already filters by category, so `/links/dead-links` works automatically

### LinkCard.astro

- When `item.category === "dead-links"` and `item.originalCategory` exists, display the original category on the card

## Data Flow

```
Build starts
  → combineYamlFiles() merges YAML → .generated/links.yaml
  → getNavData() loads links collection (filters draft)
  → getLinkMetadataMap() called with all link URLs
    → New URLs: fetch + set dead flag based on result
    → Stale URLs (>7 days): re-fetch + update dead flag
    → Fresh cached URLs: skip
    → Write updated cache to .generated/link-metadata.json
  → For each link entry:
    → If linkMeta.dead: category="dead-links", originalCategory=yaml.category
    → Else: category=yaml.category as normal
  → Dead links included in items (for category page) but filtered from main listing + homepage
```

### Global search (CommandPalette)

Dead links remain searchable in the command palette but are visually marked as dead:
- The category badge will show "Dead Links" (via `categoryDisplay("dead-links")`)
- The search result row gets dimmed/muted styling to signal the link is broken
- The `command-palette-render.ts` `renderItem()` function adds a CSS class when `item.category === "dead-links"`

## Files Changed

1. `app/src/lib/link-metadata.ts` — dead flag, re-validation logic
2. `app/src/lib/nav-data.ts` — NavItem type, category override, allCategories
3. `app/src/pages/[collection]/[...page].astro` — filter dead links from listing
4. `app/src/pages/index.astro` — filter dead links from homepage
5. `app/src/components/Card/LinkCard.astro` — display original category on dead link cards
6. `app/src/components/CommandPalette/command-palette-render.ts` — mark dead links in search results
7. `app/src/components/CommandPalette/CommandPalette.astro` — add dead-link styling to template CSS
