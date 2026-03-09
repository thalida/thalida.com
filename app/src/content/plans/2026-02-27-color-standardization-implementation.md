---
title: "Color Standardization Implementation Plan"
description: "Standardize color usage so neon = emphasis, teal = interactive, ice = active/selected, and subheadings use text color with font hierarchy."
publishedOn: 2026-02-27
planType: "implementation"
topic: "color-standardization"
status: "completed"
---

# Color Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize color usage so neon = emphasis, teal = interactive, ice = active/selected, and subheadings use text color with font hierarchy.

**Architecture:** Pure CSS/template changes across ~8 files. No new components or logic. Each task targets one semantic category of change.

**Tech Stack:** Astro components, Tailwind CSS v4, CSS custom properties

---

### Task 1: Subheadings — change ice to text color

Subheadings now rely on font size/weight for hierarchy instead of accent color.

**Files:**
- Modify: `app/src/pages/about.astro:30,58,79`
- Modify: `app/src/pages/[collection]/[...id].astro:71,106`
- Modify: `app/src/components/CollectionGrid/CollectionGrid.astro:33`
- Modify: `app/src/components/Chat/Chat.astro:12`

**Step 1: Update about.astro subheadings**

Change all three `text-ice` to `text-text` on lines 30, 58, 79:

```astro
<!-- Line 30: was text-ice -->
<h3 class="font-heading text-xl font-semibold text-text mt-6 mb-2 tracking-tight">Hey, I'm Thalida!</h3>

<!-- Line 58: was text-ice -->
<h3 class="font-heading text-xl font-semibold text-text mt-6 mb-2 tracking-tight">Career History</h3>

<!-- Line 79: was text-ice -->
<h3 class="font-heading text-xl font-semibold text-text mt-6 mb-2 tracking-tight">About this site</h3>
```

**Step 2: Update [...id].astro article description and post h2**

Line 71 — article description subtitle:
```astro
<!-- was text-ice -->
<p class="m-0 mb-3 font-heading font-semibold text-text text-subtitle tracking-tight">
```

Lines 105-106 — post content h2 styling:
```css
/* was text-ice */
.post-content :global(h2) {
  @apply text-text;
}
```

**Step 3: Update CollectionGrid.astro subtitle**

Line 33:
```astro
<!-- was text-ice -->
<p class="m-0 mb-3 font-heading font-semibold text-text text-subtitle tracking-tight">{subtitle}</p>
```

**Step 4: Update Chat.astro heading**

Line 12:
```astro
<!-- was text-ice -->
<h2 class="m-0 font-heading text-base font-semibold text-text tracking-tight">Chat</h2>
```

**Step 5: Build to verify no errors**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 6: Commit**

```bash
git add app/src/pages/about.astro app/src/pages/\[collection\]/\[...id\].astro app/src/components/CollectionGrid/CollectionGrid.astro app/src/components/Chat/Chat.astro
git commit -m "refactor: change subheadings from ice to text color

Subheadings now use text color and rely on font size/weight for
hierarchy instead of accent color, per color standardization rules."
```

---

### Task 2: Active/selected states — change teal to ice

Active/selected UI elements now use ice to distinguish from interactive teal.

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro:55,63`
- Modify: `app/src/components/ProjectTree/ProjectTree.astro:54,65,70`
- Modify: `app/src/components/CollectionGrid/CollectionGrid.astro:45,55`
- Modify: `app/src/components/CommandPalette/CommandPalette.astro:82-90`
- Modify: `app/src/components/CommandPalette/CommandPalette.ts:118,120`

**Step 1: Update BaseLayout.astro nav active states**

Line 55 — page nav link:
```astro
<!-- was data-active:text-teal -->
class="font-body text-xs text-muted no-underline whitespace-nowrap py-1 px-2 rounded-md hover:text-text hover:bg-surface-active transition-colors data-active:text-ice"
```

Line 63 — collection nav link:
```astro
<!-- was data-active:text-teal -->
class="font-body text-xs text-muted no-underline whitespace-nowrap py-1 px-2 rounded-md hover:text-text hover:bg-surface-active transition-colors data-active:text-ice"
```

**Step 2: Update ProjectTree.astro active states**

Line 54 — page nav item:
```astro
<!-- was data-active:text-teal -->
class="group flex items-center gap-2 w-full no-underline text-muted font-body font-medium transition-colors text-sm tracking-wider py-2 px-3 rounded-md hover:bg-surface-active hover:text-text data-active:bg-surface-active data-active:text-ice"
```

Line 65 — collection nav item:
```astro
<!-- was data-active:text-teal -->
class="group flex items-center gap-2 w-full no-underline text-muted font-body font-medium transition-colors text-sm tracking-wider py-2 px-3 rounded-md hover:bg-surface-active hover:text-text data-active:bg-surface-active data-active:text-ice"
```

Line 70 — active badge:
```astro
<!-- was group-data-active:bg-teal/15 group-data-active:text-teal -->
<span class="text-xs font-normal bg-midnight py-0.5 px-2 rounded-full text-muted group-data-active:bg-ice/15 group-data-active:text-ice">
```

**Step 3: Update CollectionGrid.astro active filter state**

Line 45 — "All" button active indicator:
```astro
<!-- was "bg-teal/15 text-teal border-teal" -->
{ "bg-ice/15 text-ice border-ice": !activeCategory },
```

Line 55 — category button active indicator:
```astro
<!-- was "bg-teal/15 text-teal border-teal" -->
{ "bg-ice/15 text-ice border-ice": activeCategory === cat },
```

**Step 4: Update CommandPalette.astro selected row styles**

Lines 82-90 — CSS for selected row:
```css
#cp-results .cp-row--selected {
  background-color: var(--color-surface-active);
  color: var(--color-ice);
}
#cp-results .cp-row--selected .cp-row__title {
  color: var(--color-ice);
}
#cp-results .cp-row--selected .cp-row__tag {
  background-color: color-mix(in srgb, var(--color-ice) 10%, transparent);
  border-color: var(--color-ice);
  color: var(--color-ice);
}
```

**Step 5: Update CommandPalette.ts tag rendering**

Line 118 — overflow tag:
```typescript
`<span class="cp-row__tag py-0.5 px-2 bg-transparent border border-teal text-xs text-teal capitalize rounded">+${tags.length - 2}</span>`
```
Change `border-teal text-teal` to `border-muted text-xs text-muted` (tags in their default/unselected state should use muted since they're non-interactive labels; the selected row CSS override handles the ice highlight).

Line 120 — regular tags:
```typescript
`<span class="cp-row__tag py-0.5 px-2 bg-transparent border border-muted text-xs text-muted capitalize rounded">${escapeHtml(t)}</span>`
```

**Step 6: Build to verify no errors**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 7: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro app/src/components/ProjectTree/ProjectTree.astro app/src/components/CollectionGrid/CollectionGrid.astro app/src/components/CommandPalette/CommandPalette.astro app/src/components/CommandPalette/CommandPalette.ts
git commit -m "refactor: change active/selected states from teal to ice

Active nav items, selected filters, and command palette selection
now use ice color to distinguish from interactive teal elements."
```

---

### Task 3: Breadcrumb links — flip hover direction

Breadcrumb links are clickable, so they should be teal at rest and neon on hover (currently reversed).

**Files:**
- Modify: `app/src/pages/[collection]/[...id].astro:53,59`

**Step 1: Flip breadcrumb link colors**

Line 53 — collection breadcrumb:
```astro
<!-- was text-neon hover:text-teal -->
<a class="text-teal no-underline hover:text-neon" href={`/${collection}`}>{collection}</a>
```

Line 59 — category breadcrumb:
```astro
<!-- was text-neon hover:text-teal -->
<a class="text-teal no-underline hover:text-neon" href={`/${collection}/${entry.data.category}`}>
```

**Step 2: Build to verify no errors**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add app/src/pages/\[collection\]/\[...id\].astro
git commit -m "refactor: flip breadcrumb link colors to teal rest / neon hover

Breadcrumb links are interactive, so they follow the standard
teal (rest) → neon (hover) pattern."
```

---

### Task 4: Primary buttons — teal at rest, neon on hover

Buttons are interactive elements, so they follow teal resting / neon hover.

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro:117`

**Step 1: Update mobile chat FAB**

Line 117:
```astro
<!-- was bg-neon hover:bg-teal -->
class="fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-teal text-midnight flex items-center justify-center shadow-lg lg:hidden hover:bg-neon"
```

**Step 2: Build to verify no errors**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro
git commit -m "refactor: change chat FAB from neon to teal bg

Interactive buttons use teal at rest and neon on hover per
color standardization rules."
```

---

### Task 5: Login page — use CSS variables and standardized colors

Convert inline hex values to use the theme system and apply the standardized color rules.

**Files:**
- Modify: `app/src/pages/login.astro:13-36`

**Step 1: Update login page inline styles**

The login page uses inline styles with raw hex values. Update the button from neon to teal background, and convert hex colors to use CSS variables where possible. Since this page doesn't import BaseLayout.css, we need to keep inline styles but use the correct semantic colors:

Line 31 — submit button: change `background:#39FF14` to `background:#00E5A0` (teal):
```html
<button
  type="submit"
  style="padding:0.6rem 1.25rem;border:none;border-radius:6px;background:#00E5A0;color:#030A12;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:0.9rem;cursor:pointer;"
  >Log in</button>
```

**Step 2: Build to verify no errors**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add app/src/pages/login.astro
git commit -m "refactor: use teal for login button per color standardization

Login submit button uses teal (interactive) instead of neon (emphasis)."
```

---

### Task 6: Chat overlay close button hover — keep neon hover (already correct)

**Files:**
- Verify: `app/src/layouts/BaseLayout/BaseLayout.css:195-196`

The chat overlay close button hover uses neon (`color: var(--color-neon)`). This follows the rule: interactive elements go teal → neon on hover. The base color is muted (line 192), hover is neon. This is correct — muted → neon is acceptable for icon-only buttons where the muted base indicates "de-emphasized interactive."

No changes needed. Skip this task.

---

### Task 7: Final verification

**Step 1: Full build**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 2: Verify color rule compliance**

Grep for remaining violations:
```bash
# Should find NO interactive elements using neon at rest (except headings/branding)
# data-active should use ice, not teal
grep -rn "data-active:text-teal" app/src/
# Should return no results

# Subheadings should not use ice
grep -rn "text-ice" app/src/
# Should only find the CSS variable definition in BaseLayout.css
```
