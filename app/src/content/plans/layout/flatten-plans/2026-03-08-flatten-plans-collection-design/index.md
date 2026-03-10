---
title: Flatten Plans Collection Design
description: Remove topic grouping from plans, convert topic to subcategory,
  convert planType to a tag, and make plans display like every other collection.
publishedOn: 2026-03-08T00:00:00.000Z
tags:
  - design
---

## Problem

Plans are special-cased throughout the codebase: PlanGrid groups by topic, PlanCard renders a nested list of plans per topic, and both page routes branch on `collection === "plans"`. This creates a different UX from every other collection and makes pagination incorrect — PAGE_SIZE operates on individual plans but the display groups them, so a page of 30 plans might show only 5 topic cards.

## Design

### 1. Schema changes

Remove plan-specific fields `planType` and `topic`. Add a generic `subcategory` field available to all collections.

**Before:**
```ts
planType: z.enum(["design", "implementation"]).optional(),
topic: z.string().optional(),
```

**After:**
```ts
subcategory: z.string().optional(),
```

### 2. Frontmatter migration (97 plan files)

For each plan `.md` file:
- Remove `planType` field; add its value (`design` or `implementation`) to the `tags` array
- Rename `topic` → `subcategory`

**Before:**
```yaml
planType: implementation
topic: collection-pagination
category: layout
tags: []
```

**After:**
```yaml
subcategory: collection-pagination
category: layout
tags: [implementation]
```

### 3. Card display

- Plans switch from `cardVariant: "plan"` to `cardVariant: "compact"` (same as recipes)
- CompactCard gains an optional `subcategory` line between category and date
- `planType` values now appear naturally via CardTags since they're in the tags array

### 4. Remove plan-specific code

- Delete `PlanGrid.astro`
- Delete `PlanCard.astro`
- Remove `collection === "plans"` branches from `[collection]/[...page].astro` and `[collection]/[category]/[...page].astro`
- Remove `"plan"` from `CardVariant` type
- Remove `plan` fallback line from `Card.astro`

### 5. NavItem type

- Add optional `subcategory: string` field
- Remove `topic` and `planType` fields

### 6. Future work (not in this change)

- Subcategory filter UI on collection pages
- Add `subcategory` to other collections
