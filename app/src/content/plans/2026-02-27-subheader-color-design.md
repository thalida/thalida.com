---
title: Separate subheader color from link color
description: >-
  Teal (#00e5a0) is used for both links and subheaders, making it unclear what
  is clickable vs decorative.
publishedOn: 2026-02-28T04:49:39.000Z
subcategory: color-standardization
category: styling
tags: [design]
---

# Separate subheader color from link color

## Problem

Teal (#00e5a0) is used for both links and subheaders, making it unclear what is clickable vs decorative.

## Decision

- Add `--color-ice: #80d4ff` to the theme
- Use ice for non-interactive headings/subheaders
- Keep teal exclusively for interactive elements

## Changes

| Element | Location | Before | After |
|---------|----------|--------|-------|
| Post description/subtitle | `[...id].astro:71` | `text-teal` | `text-ice` |
| Post content H2 | `[...id].astro:106` | `text-teal` | `text-ice` |
| About page H3s (x3) | `about.astro:30,58,79` | `text-teal` | `text-ice` |
| Collection page subtitle | `CollectionGrid.astro:33` | `text-teal` | `text-ice` |
| Chat component H2 | `Chat.astro:12` | `text-teal` | `text-ice` |

## Unchanged (stays teal)

- Global `<a>` link color
- Post content links
- Category filter buttons/pills
- Active nav items
- Command palette selections
- Card tags
- Inline code text
- Gradient text utility (neon -> teal)

## Theme addition

In `BaseLayout.css` `@theme` block:

```css
--color-ice: #80d4ff;
```
