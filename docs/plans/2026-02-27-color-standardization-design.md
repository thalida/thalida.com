# Color Standardization Design

## Problem

The site uses three accent colors (neon, teal, ice) without consistent semantic rules. Neon appears on both headings and hover states, teal is used for both links and active nav items, and ice is underutilized. Users can't reliably tell what's clickable vs what's decorative.

## Color System Rules

| Color | Variable | Hex | Role | Usage |
|-------|----------|-----|------|-------|
| **Neon** | `--color-neon` | #39ff14 | **Emphasis** | Page titles, hero headings, brand name, category labels |
| **Teal** | `--color-teal` | #00e5a0 | **Interactive** | Links, buttons, clickable cards — resting state |
| **Ice** | `--color-ice` | #80d4ff | **Active/Selected** | Current nav item, selected filter, active tab |
| **Muted** | `--color-muted` | #7a9ab5 | **Secondary** | Timestamps, metadata, labels |
| **Text** | `--color-text` | #e8f0f8 | **Content** | Body text, subheadings (hierarchy via font size/weight) |

### Interaction States

```
Resting:    teal
Hover:      teal → neon
Active:     ice
Disabled:   muted
```

### Key Principles

1. **Neon never means clickable.** If you see neon at rest, it's a heading or brand element.
2. **Teal always means clickable.** Any teal element at rest is interactive.
3. **Ice means "you are here."** Active nav, selected filter, current page indicator.
4. **Hover confirms interactivity.** Teal elements shift to neon on hover as feedback.
5. **Subheadings use text color.** Font size and weight create hierarchy, not accent color.

## Changes Required

### 1. Subheadings: `ice` → `text`

Ice is no longer decorative — it's reserved for active/selected states. Subheadings rely on font size/weight for hierarchy.

| File | Element | Current | New |
|------|---------|---------|-----|
| `app/src/pages/about.astro` | 3 section subheadings | `text-ice` | `text-text` |
| `app/src/pages/[collection]/[...id].astro` | Article description | `text-ice` | `text-text` |
| `app/src/pages/[collection]/[...id].astro` | Post content `<h2>` | `text-ice` | `text-text` |
| `app/src/components/CollectionGrid/CollectionGrid.astro` | Collection subtitle | `text-ice` | `text-text` |
| `app/src/components/Chat/Chat.astro` | Chat panel heading | `text-ice` | `text-text` |

### 2. Active/selected states: `teal` → `ice`

Active/selected state now uses ice to distinguish from interactive teal.

| File | Element | Current | New |
|------|---------|---------|-----|
| `app/src/layouts/BaseLayout/BaseLayout.astro` | Nav link active | `data-active:text-teal` | `data-active:text-ice` |
| `app/src/components/ProjectTree/ProjectTree.astro` | Sidebar active item | `data-active:text-teal` | `data-active:text-ice` |
| `app/src/components/ProjectTree/ProjectTree.astro` | Active badge | `group-data-active:bg-teal/15 group-data-active:text-teal` | `group-data-active:bg-ice/15 group-data-active:text-ice` |
| `app/src/components/CollectionGrid/CollectionGrid.astro` | Active category filter | `bg-teal/15 text-teal border-teal` | `bg-ice/15 text-ice border-ice` |
| `app/src/components/CommandPalette/CommandPalette.astro` | Selected row | `color: var(--color-teal)` | `color: var(--color-ice)` |

### 3. Breadcrumb links: flip hover direction

Breadcrumb links are clickable — they should be teal at rest, neon on hover (currently reversed).

| File | Element | Current | New |
|------|---------|---------|-----|
| `app/src/pages/[collection]/[...id].astro` | Collection breadcrumb link | `text-neon hover:text-teal` | `text-teal hover:text-neon` |
| `app/src/pages/[collection]/[...id].astro` | Category breadcrumb link | `text-neon hover:text-teal` | `text-teal hover:text-neon` |

### 4. Primary buttons: `neon` bg → `teal` bg

Buttons are interactive — they follow teal at rest, neon on hover.

| File | Element | Current | New |
|------|---------|---------|-----|
| `app/src/layouts/BaseLayout/BaseLayout.astro` | Mobile chat FAB | `bg-neon hover:bg-teal` | `bg-teal hover:bg-neon` |
| `app/src/pages/login.astro` | Submit button (inline) | `background:#39FF14` | `background:#00e5a0` (+ hover neon) |

### 5. Login page: inline hex → CSS variables

The login page uses inline hex values that match existing CSS variables. Convert to use the theme system for consistency.

### 6. No changes needed (already correct)

- Page headings using neon (emphasis)
- Default link color teal in BaseLayout.css (interactive)
- Link hover → neon in BaseLayout.css (hover feedback)
- Card eyebrow/category labels using neon (emphasis)
- Category filter buttons (inactive) using teal (interactive)
- Card tags using teal border/text (interactive)
- Gradient text using neon → teal (decorative)

## Out of Scope

- Live window widget colors (self-contained system with time/weather dynamics)
- Card placeholder colors (generative, domain-specific)
- Error color (`#ff4444` on login — could be formalized later)
