---
title: "Remove @apply — Move to Inline Tailwind Classes"
description: "The codebase uses `@apply` extensively (204 usages across 9 files) to compose Tailwind utilities inside CSS classes. This creates issues:"
publishedOn: 2026-02-27
planType: "design"
topic: "remove-apply"
status: "completed"
---

# Remove @apply — Move to Inline Tailwind Classes

## Problem

The codebase uses `@apply` extensively (204 usages across 9 files) to compose Tailwind utilities inside CSS classes. This creates issues:

- Separate `.css` files imported via `import "./Component.css"` are **globally scoped** — Astro doesn't scope them
- Every CSS file needs `@reference "../../layouts/BaseLayout/BaseLayout.css"` to resolve tokens
- The Chat component requires `<style is:global>` as a workaround for dynamic content
- More indirection between markup and styling than necessary

## Approach

**Component-by-component migration** from simplest to most complex. Each component is a self-contained, verifiable unit.

## Migration Order

1. **SpotifyPlayer.astro** — 1 class, tiny scope
2. **Chat.css → Chat.astro** — 20 `@apply` usages, removes `is:global` workaround
3. **ProjectTree.css → ProjectTree.astro** — 17 usages, data-attribute states
4. **CommandPalette.css → CommandPalette.ts** — 29 usages, web component (classes applied in JS)
5. **about.astro** — 9 usages, already in scoped `<style>`
6. **[collection]/[...id].astro** — 16 usages, `:global()` rules stay for markdown
7. **index.astro** — 31 usages, timeline has non-inlineable CSS
8. **CollectionGrid.css → CollectionGrid.astro** — 49 usages, card variants + masonry + gallery
9. **BaseLayout.css** — 32 usages, layout shell + globals

## Conversion Patterns

| CSS Pattern | Inline Tailwind Equivalent |
|-------------|---------------------------|
| `.class { @apply flex gap-4; }` | `class="flex gap-4"` on element |
| `.class:hover { @apply bg-teal; }` | `class="hover:bg-teal"` |
| `.parent:hover .child { @apply scale-105; }` | `group` on parent, `group-hover:scale-105` on child |
| `.el[data-active] { @apply text-teal; }` | `class="data-[active]:text-teal"` |
| `.el[data-online="true"] { @apply bg-neon; }` | `class="data-[online=true]:bg-neon"` |
| `.class--modifier { @apply bg-red; }` | Conditional via `class:list` or separate class |

## What Stays as CSS (Scoped `<style>` Blocks)

| Pattern | Component | Reason |
|---------|-----------|--------|
| `::selection` | BaseLayout | Pseudo-element |
| `::placeholder` | CommandPalette | Pseudo-element |
| `::before` (timeline track) | index.astro | Pseudo-element |
| Custom SVG cursors | BaseLayout | `cursor: url(...)` has no Tailwind equivalent |
| `.gradient-text` | BaseLayout | `-webkit-background-clip: text` vendor prefix |
| `:global()` markdown styles | [collection]/[...id].astro | Astro scoping for rendered content |
| `live-window` custom properties | index.astro | Web component CSS vars |
| `mask-image` gradient | index.astro | Vendor prefix |
| `border-bottom: dashed` | Chat.astro | No Tailwind shorthand for dashed bottom-only |
| `grid-auto-rows: 10px` | CollectionGrid | Masonry layout |

## Files Deleted

- `app/src/components/Chat/Chat.css`
- `app/src/components/ProjectTree/ProjectTree.css`
- `app/src/components/CommandPalette/CommandPalette.css`
- `app/src/components/CollectionGrid/CollectionGrid.css`

## Files That Shrink

- `app/src/layouts/BaseLayout/BaseLayout.css` — keeps `@theme`, cursors, gradient-text, `::selection`, non-inlineable layout rules only

## Not In Scope

- No changes to `@theme` block or design tokens
- No changes to component behavior or markup structure
- No new dependencies
- No Tailwind config changes
