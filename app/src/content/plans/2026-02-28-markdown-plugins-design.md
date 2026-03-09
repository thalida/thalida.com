---
title: Markdown Plugins Restoration — Design
description: >-
  The `v-2026` branch dropped several markdown processing plugins that existed
  on `main`, resulting in:
publishedOn: 2026-02-28T18:21:45.000Z
planType: design
topic: markdown-plugins
status: completed
category: content
---

# Markdown Plugins Restoration — Design

**Date:** 2026-02-28
**Branch:** v-2026
**Status:** Approved

## Problem

The `v-2026` branch dropped several markdown processing plugins that existed on `main`, resulting in:

- `[!TIP]`, `[!NOTE]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]` callouts rendering as plain blockquotes (18 occurrences across 7 content files)
- No heading `id` attributes (breaks anchor links)
- No clickable `#` anchor links on headings
- No automatic table-of-contents generation
- No scrollable wrapper around wide `<table>` elements

## Solution

Restore all five plugins to `app/`, using latest available versions (not pinned to `main`'s older versions), and add custom dark-themed CSS for callout alerts that matches the v-2026 design.

## Packages to Add

| Package | Latest Version | Purpose |
|---------|---------------|---------|
| `remark-github-blockquote-alert` | `^2.0.1` | Processes `[!TIP]`, `[!NOTE]`, etc. |
| `remark-toc` | `^9.0.0` | Generates TOC from `## toc` heading |
| `rehype-slug` | `^6.0.0` | Adds `id` attributes to headings |
| `rehype-autolink-headings` | `^7.1.0` | Adds clickable `#` anchor to headings |
| `rehype-wrap` | `^1.1.0` | Wraps `<table>` in scrollable `<div>` |

## Changes

### 1. `app/package.json`

Add all five packages as dependencies.

### 2. `app/astro.config.mjs`

Import and wire plugins into the `markdown` config, ordering them alongside existing R2 plugins:

```js
remarkPlugins: [
  remarkAlert,
  [remarkToc, { heading: "toc" }],
  [remarkR2Media, { baseUrl: mediaBaseUrl }],
]
rehypePlugins: [
  rehypeSlug,
  rehypeAutolinkHeadings,
  [rehypeWrap, { selector: 'table', wrapper: 'div.overflow-auto' }],
  [rehypeR2Media, { baseUrl: mediaBaseUrl }],
]
```

### 3. `app/src/styles/alerts.css` (new file)

Custom CSS for `.markdown-alert` classes using the v-2026 dark palette:
- Background: `#0d1f2d` (matches `codeBackground`)
- Border: left-side accent, 4px solid, color varies by type
- Consistent border-radius with code blocks (`0.375rem`)
- Matches `prose-invert` context

Color assignments by type:
- `[!NOTE]` → blue (`#60a5fa`)
- `[!TIP]` → green (`#4ade80`)
- `[!IMPORTANT]` → purple (`#a78bfa`)
- `[!WARNING]` → orange (`#fb923c`)
- `[!CAUTION]` → red (`#f87171`)

### 4. Import CSS

Import `alerts.css` in `app/src/layouts/BaseLayout/BaseLayout.css` so it applies site-wide wherever markdown is rendered.

## Files Changed

- `app/package.json` — add 5 packages
- `app/astro.config.mjs` — import and configure 5 plugins
- `app/src/styles/alerts.css` — new file (callout styles)
- `app/src/layouts/BaseLayout/BaseLayout.css` — import alerts.css

## Non-Goals

- No changes to existing content files
- No changes to the expressive code theme
- No MDX support (not needed on v-2026)
