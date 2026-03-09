---
title: "Link Metadata Enhancement — Design"
description: "Enrich the links collection cards with build-time-fetched metadata (favicon, meta title, meta"
publishedOn: 2026-02-20
planType: "design"
topic: "link-metadata"
status: "completed"
---

# Link Metadata Enhancement — Design

**Date:** 2026-02-20


## Goal

Enrich the links collection cards with build-time-fetched metadata (favicon, meta title, meta
description) and display the link URL, replacing the generic letter-placeholder card with a compact
link card.


## Current State

- 134 links across 9 YAML files (`app/src/content/links/*.yaml`)
- Each link has: `id` (URL), `title`, `category`, `tags`, `publishedOn`
- No `description` or `coverImage` fields
- Cards show a large 16:10 letter-avatar placeholder with the manual YAML title


## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| When to fetch metadata | Build-time | Static output, no client JS, fast page loads |
| Favicon source | Google favicon service URL (no fetch needed) | Reliable CDN, zero build overhead |
| Card image area for links | Remove entirely | Compact text-focused layout fits a link list better |
| Favicon display | Small inline (16–32px) next to title | Favicon size appropriate |
| Meta title | Fetched replaces YAML title (YAML is fallback) | Fetched title is canonical |
| URL display | Show below title in muted text | Gives context without cluttering |


## Architecture


### Data Flow

```text
Build time:
  getSidebarData()
    └─ for each link URL:
         ├─ check .generated/link-metadata.json cache
         ├─ if cached: use cached data
         └─ if not cached: fetch URL → parse HTML → extract title/description
              └─ write back to cache

SidebarItem (links):
  + faviconUrl: string   (Google favicon CDN, constructed — no fetch)
  + metaTitle: string    (fetched og:title → <title> → YAML title)
  + metaDescription: string | undefined  (fetched og:description → description meta)
```


### Favicon URL Construction

No fetch needed — built from the link URL's hostname:

```text
https://www.google.com/s2/favicons?domain=<hostname>&sz=32
```


### HTML Metadata Parsing

Fetch page HTML, regex-extract:

1. `og:title` meta property
2. `<title>` tag
3. `og:description` meta property
4. `description` meta name

Timeout: 3 seconds per URL. Graceful fallback to YAML data on error.


### Cache Strategy

- Cache file: `app/.generated/link-metadata.json` (gitignored, persists locally)
- Structure: `Record<url, { metaTitle, metaDescription, fetchedAt }>`
- CI builds: re-fetch all URLs (cache starts empty); ~134 concurrent fetches with 10-at-a-time concurrency cap
- Local builds: incremental (only fetch URLs missing from cache)


## New Card Layout (links only)

```text
┌─────────────────────────────────┐
│ [favicon] Title                 │
│ example.com                     │  ← muted, truncated URL
│ Description text if available,  │  ← 2-line clamp
│ otherwise nothing shown.        │
└─────────────────────────────────┘
```


## Files Changed

| File | Change |
|---|---|
| `app/src/lib/link-metadata.ts` | New — fetch + cache logic |
| `app/src/lib/sidebar-data.ts` | Add `faviconUrl`, `metaTitle`, `metaDescription` to `SidebarItem`; enrich links |
| `app/src/pages/[collection]/index.astro` | Separate link card layout |
| `app/src/pages/[collection]/[category].astro` | Same separate link card layout |
