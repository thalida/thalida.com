---
title: 'Meta Tags, SEO & Social Sharing Design'
description: >-
  Add comprehensive meta tags, OpenGraph, Twitter Cards, structured data, and
  SEO infrastructure so thalida.com shows up well in search results and looks
  great when links are shared on social media.
publishedOn: 2026-03-01T22:54:11.000Z
planType: design
topic: meta-seo
status: completed
category: content
---

# Meta Tags, SEO & Social Sharing Design

**Date:** 2026-03-01
**Branch:** feature-meta

## Goal

Add comprehensive meta tags, OpenGraph, Twitter Cards, structured data, and SEO infrastructure so thalida.com shows up well in search results and looks great when links are shared on social media.

## Approach

Port the v-2025 branch's meta/SEO setup into the current codebase with improvements:
- Dedicated `<SEO>` component (not inline in BaseLayout)
- Per-page dynamic OG images (cover images when available)
- Proper canonical URLs (not hardcoded)
- Dynamic `og:type` (article for posts, website for pages)

## Architecture

### `<SEO>` Component

**File:** `app/src/components/SEO/SEO.astro`

Props:
```typescript
interface Props {
  title?: string;          // Page title (default: "thalida")
  description?: string;    // Meta description
  image?: string;          // OG image URL (default: /card-512x512.png)
  type?: "website" | "article";
  url?: string;            // Canonical URL (auto-derived from Astro.url)
  publishedOn?: Date;      // article:published_time
  updatedOn?: Date;        // article:modified_time
  tags?: string[];         // article:tag
  noindex?: boolean;       // Opt-out of indexing
}
```

**Renders:**
- `<meta name="description">`
- `<meta name="author" content="Thalida Noel">`
- `<meta name="theme-color" content="#1be48c">`
- `<link rel="canonical">`
- OpenGraph: `og:title`, `og:description`, `og:image`, `og:type`, `og:url`, `og:site_name`
- Twitter: `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site` (@thalida), `twitter:creator` (@thalida)
- For articles: `article:published_time`, `article:modified_time`, `article:tag`
- Favicon links: icon, apple-touch-icon

**Default description:**
> "Thalida Noel's corner of the internet since 2007 — projects, guides, experiments, and the occasional recipe from a creative technologist in New York."

### BaseLayout Changes

**File:** `app/src/layouts/BaseLayout/BaseLayout.astro`

Extend Props:
```typescript
interface Props {
  title?: string;
  activePage?: string;
  activeCollection?: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedOn?: Date;
  updatedOn?: Date;
  tags?: string[];
  noindex?: boolean;
}
```

Render `<SEO>` inside `<head>`, before existing `<slot name="head" />`.

### Per-Page Metadata

| Page | title | description | ogImage | ogType |
|---|---|---|---|---|
| Homepage `/` | `thalida` | Site default | Default card | `website` |
| About `/about` | `about · thalida` | Site default | Default card | `website` |
| Collection `/projects` | `Projects · thalida` | `collectionMeta[name].description` | Default card | `website` |
| Post `/projects/post/xyz` | `Post Title · thalida` | `entry.data.description` | Cover image or default | `article` |
| Login/Logout | `login · thalida` | — | — | `website` + `noindex` |

For post cover images: resolve Astro `ImageMetadata.src` to absolute URL using `Astro.site`.

### Static Assets (ported from v-2025)

Into `app/public/`:
- `favicon.ico`, `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`, `android-chrome-512x512.png`
- `card-512x512.png` (default OG image)

New files:
- `app/public/robots.txt` — `User-agent: * Allow: / Sitemap: https://thalida.com/sitemap-index.xml`
- `app/public/site.webmanifest` — name, short_name, icons, theme_color, background_color

### Astro Config Changes

**File:** `app/astro.config.mjs`

Add `@astrojs/sitemap` integration for automatic sitemap generation.

### JSON-LD Structured Data

**Person schema** (about page only):
- Name, alternateName, url, image, jobTitle, description
- worksFor, alumniOf, sameAs, knowsAbout, address

**Article schema** (all non-recipe posts):
- headline, description, keywords, articleSection
- author (Person), publisher (Organization)
- datePublished, dateModified

**Recipe schema** (unchanged — already implemented).

## Files Changed

| File | Action |
|---|---|
| `app/src/components/SEO/SEO.astro` | Create |
| `app/src/layouts/BaseLayout/BaseLayout.astro` | Modify — add SEO props, render `<SEO>` |
| `app/src/pages/index.astro` | Modify — pass description |
| `app/src/pages/about.astro` | Modify — add Person JSON-LD |
| `app/src/pages/[collection]/[...page].astro` | Modify — pass collection description |
| `app/src/pages/[collection]/post/[...id].astro` | Modify — pass post metadata, add Article JSON-LD |
| `app/src/pages/[collection]/[category]/[...page].astro` | Modify — pass description |
| `app/src/pages/login.astro` | Modify — add noindex |
| `app/src/pages/logout.astro` | Modify — add noindex |
| `app/astro.config.mjs` | Modify — add @astrojs/sitemap |
| `app/public/robots.txt` | Create |
| `app/public/site.webmanifest` | Create |
| `app/public/favicon.*` | Create (ported from v-2025) |
| `app/public/card-512x512.png` | Create (ported from v-2025) |
