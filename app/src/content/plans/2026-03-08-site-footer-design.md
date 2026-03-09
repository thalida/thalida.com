---
title: Site Footer Design
description: >-
  Add a minimal sitewide footer inside the center content area of BaseLayout.
  The footer displays "created by thalida" and a last-updated date sourced from
  the latest git commit at build time.
publishedOn: 2026-03-08T23:48:44.000Z
planType: design
topic: site-footer
category: layout
---

# Site Footer Design

## Summary

Add a minimal sitewide footer inside the center content area of BaseLayout. The footer displays "created by thalida" and a last-updated date sourced from the latest git commit at build time.

## Placement

- Inside the center content `<div>` in `BaseLayout.astro` (lines 133-137), after the `<slot />`
- Not in the sidebars — only in the scrollable main content area
- Uses `mt-auto` so it pushes to the bottom when content is short

## Component

- New file: `app/src/components/Footer/Footer.astro`
- Imported into `BaseLayout.astro`

## Content

Single centered line:

```
created by thalida · last updated Mar 8, 2026
```

## Date Source

- At build time, run `git log -1 --format=%cI` via `child_process.execSync`
- Parse the ISO date string and format as `Mon DD, YYYY` (e.g., "Mar 8, 2026")
- Automatically updates with each deploy since builds happen on push to main

## Styling

- `font-body` (IBM Plex Mono), `text-xs`
- `text-muted` color
- Top border with `border-border` to separate from content
- `mt-auto pt-4 pb-2` for spacing
- Centered text

## Files Changed

1. `app/src/components/Footer/Footer.astro` (new)
2. `app/src/layouts/BaseLayout/BaseLayout.astro` (import + add Footer after slot)
