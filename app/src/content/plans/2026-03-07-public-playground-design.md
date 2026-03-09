---
title: Public Live Window Playground
description: >-
  Make the live window playground public, merge it with the dev test page, add a
  city search via Nominatim geocoding, and link to it from the home page.
publishedOn: 2026-03-07T17:42:57.000Z
planType: design
topic: live-window-playground
status: completed
category: live-window
---

# Public Live Window Playground

## Summary

Make the live window playground public, merge it with the dev test page, add a city search via Nominatim geocoding, and link to it from the home page.

## Changes

### 1. New page: `/playground/live-window`

- Move `app/src/pages/dev/live-window-playground.astro` to `app/src/pages/playground/live-window.astro`
- Remove the `import.meta.env.PROD` redirect guard
- Wrap in `BaseLayout` for consistent nav/SEO
- Merge city presets from both dev pages into one unified list (10 cities):
  - New York, London, Tokyo, Sydney, Cairo, São Paulo, Reykjavik, Mumbai, Singapore, Rio de Janeiro

### 2. City search with Nominatim geocoding

- Add a search input above the preset dropdown
- Debounced (300ms) client-side search against `https://nominatim.openstreetmap.org/search?q=...&format=json&limit=5`
- Show dropdown with results (city, country) — selecting one auto-fills lat/lng/timezone
- Keep manual lat/lng inputs as collapsed fallback for power users
- User-Agent: `thalida.com-playground`

### 3. Home page link

- Below the `<live-window>` on the home page hero section, add a subtle link: "Experiment with Live Window →"
- Points to `/playground/live-window`

### 4. Remove old dev pages

- Delete `app/src/pages/dev/live-window-playground.astro`
- Delete `app/src/pages/dev/live-window-test.astro`
- Remove `/dev/` directory if empty
