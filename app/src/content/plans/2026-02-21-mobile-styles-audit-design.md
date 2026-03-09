---
title: Mobile Styles Audit — Design Doc
description: 'The mobile layout has two user-visible symptoms:'
publishedOn: 2026-02-21T07:13:14.000Z
subcategory: mobile-styles
category: styling
tags: [design]
---

# Mobile Styles Audit — Design Doc

**Date:** 2026-02-21
**Approach:** Option A — Targeted surgical fixes

## Problem Summary

The mobile layout has two user-visible symptoms:
1. **~48px gap** between the fixed toolbar and the slideout nav drawer
2. **Weird spacing** — content viewer shifted right on mobile

Both stem from a single root cause (Bug 1) plus four secondary issues.

## Root Cause (Bug 1) — CSS position conflict

`ProjectTree.css` declares `#site-nav { position: relative }` without a media query. With Astro 5's `:where()` scoping, component CSS has equal specificity to global CSS but loads later in the bundle. This causes `position: relative` to override `position: fixed` from BaseLayout.css's mobile media query.

**Effect:**
- `position: relative; top: 48px` shifts the nav 48px *down from its flex position*, which is already at y=48 due to `#layout { padding-top: 48px }`. Visible gap = 96px - 48px = 48px extra.
- Nav remains a flex item (not fixed), occupying width in layout, pushing `#content-viewer` rightward.

## All Bugs

| # | File | Issue | Fix |
|---|------|--------|-----|
| 1 | `ProjectTree.css` | `position: relative` overrides mobile `position: fixed` | Wrap in `@media (min-width: 640px)` |
| 2 | `BaseLayout.css` | `height: 100vh` broken on iOS Safari | Change to `height: 100svh` |
| 3 | `BaseLayout.ts` | No body scroll lock when drawer open | Toggle `document.body.style.overflow` |
| 4 | `about.astro` | 4-column grid not responsive | Add 2-column fallback via `<style>` block |
| 5 | `Chat.astro` | No CSS — chat panel content unstyled on mobile | Add minimal `Chat.css` |

## Implementation Plan

1. **ProjectTree.css** — wrap `position: relative` in `@media (min-width: 640px)`
2. **BaseLayout.css** — change `height: 100vh` to `height: 100svh`
3. **BaseLayout.ts** — add `overflow: hidden` on open, restore on close
4. **about.astro** — add `<style>` with mobile grid media query
5. **Chat.css** (new) — basic styles for chat panel content, import in Chat.astro
