---
title: Plan Collection Categories & Topic Cleanup
description: >-
  Add category-based filtering to the plans page and merge fragmented topics
  into cohesive groups. Reduces 55 topics to ~47 and adds 6 filterable
  categories.
publishedOn: 2026-03-09T01:18:19.000Z
planType: design
topic: plan-categories
status: planned
category: content
---

# Plan Collection Categories & Topic Cleanup

## Problem

The plans page has 55 separate topics displayed as a flat grid with no filtering. Related work is fragmented — e.g., `app-code-audit`, `app-audit-fixes`, and `code-quality-fixes` are three separate topic cards despite being the same effort. The `CategoryFilter` component is wired up but never renders because no plan has a `category` value. Meanwhile, `docs/plans/` still exists despite being orphaned after migration.

## Solution

1. Add a `category` field to all plan files with one of 6 values
2. Merge ~8 fragmented topic pairs into single topics
3. Delete the orphaned `docs/plans/` directory

## Categories

Six categories, used as filter buttons on the plans page:

| Slug | Display Name | Description |
|------|-------------|-------------|
| `code-quality` | Code Quality | Code audits, CSS cleanup, codebase cleanup |
| `live-window` | Live Window | Live window core, weather, sky layers, idle behaviors |
| `chat` | Chat | Chat identity, moderation, admin tools, websocket |
| `styling` | Styling | Colors, responsive design, syntax highlighting, cards |
| `layout` | Layout & Navigation | Sidebar, info panel, command palette, pagination, footer, homepage |
| `content-seo` | Content & SEO | Meta tags, link metadata, markdown plugins, URL nesting, content audits |

## Topic Merges

| Plans to merge | New topic slug |
|---|---|
| `app-audit-fixes` + `code-quality-fixes` → into `app-code-audit` | `app-code-audit` |
| `mobile-styles-fix` → into `mobile-styles-audit` | `mobile-styles` |
| `live-window-class-refactor` → into `live-window-refactor` | `live-window-refactor` |
| `public-playground` → into `live-window-playground` | `live-window-playground` |
| `signed-client-identity` → into `clientid-identity` | `client-identity` |
| `meta-card-image` → into `meta-seo` | `meta-seo` |
| `home-styling` → into `home-page-redesign` | `home-page-redesign` |
| `subheader-color` → into `color-standardization` | `color-standardization` |

## Category Assignments

### code-quality
- `api-code-audit`
- `app-code-audit` (absorbs `app-audit-fixes`, `code-quality-fixes`)
- `css-audit`
- `codebase-cleanup`
- `remove-apply`

### live-window
- `live-window-refactor` (absorbs `live-window-class-refactor`)
- `live-window-playground` (absorbs `public-playground`)
- `live-window-test-page`
- `live-window-readability-audit`
- `idle-blinds`
- `weather-code-audit`
- `weather-id-system`
- `weather-visual-fixes`
- `weather-api-proxy`
- `sky-gradient`
- `stars-layer`
- `sun-moon-layers`

### chat
- `client-identity` (absorbs `clientid-identity`, `signed-client-identity`)
- `chat-auto-page-context`
- `admin-help-command`
- `admin-moderation-tools`
- `idle-websocket-disconnect`

### styling
- `color-standardization` (absorbs `subheader-color`)
- `neon-cursor`
- `card-component`
- `syntax-highlighting`
- `responsive-tailwind`
- `mobile-styles` (absorbs `mobile-styles-audit`, `mobile-styles-fix`)

### layout
- `sidebar-redesign`
- `info-panel`
- `command-palette-enhancements`
- `collection-pagination`
- `site-footer`
- `home-page-redesign` (absorbs `home-styling`)
- `spotify-player`

### content-seo
- `meta-seo` (absorbs `meta-card-image`)
- `link-metadata`
- `post-url-nesting`
- `markdown-plugins`
- `version-post`
- `plans-collection`
- `plan-categories`
- `dead-link-detection`
- `image-audit`

## Cleanup

- Delete `docs/plans/` directory (orphaned after migration to `app/src/content/plans/`)
- Remove `docs/plans` entries from `.markdownlintignore` and `.prettierignore`

## What Stays the Same

- PlanGrid + PlanCard components (topic cards with design/implementation links)
- Flat grid layout with filter buttons at top
- Topic-based "related plans" on detail pages
- Pagination
