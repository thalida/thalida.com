---
title: Flatten Plans Collection Implementation Plan
description: Remove topic grouping from plans, convert topic to subcategory,
  convert planType to tags, make plans display identically to other collections.
publishedOn: 2026-03-08T00:00:00.000Z
tags:
  - implementation
---

# Flatten Plans Collection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make plans display like every other collection — flat grid of individual cards, no topic grouping — while preserving topic as a generic `subcategory` field and converting `planType` to a tag.

**Architecture:** Remove all plan-specific components (PlanGrid, PlanCard) and branching logic. Migrate 98 plan frontmatter files via script. Add `subcategory` as a generic schema field. Display subcategory on CompactCard between category and date.

**Tech Stack:** Astro 5, TypeScript, Tailwind CSS, Node.js (migration script)

---

### Task 1: Migrate plan frontmatter (script)

**Files:**
- Create: `scripts/migrate-plans.ts`
- Modify: all 98 files in `app/src/content/plans/*.md`

**Step 1: Write the migration script**

```typescript
// scripts/migrate-plans.ts
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PLANS_DIR = join(import.meta.dirname, "../app/src/content/plans");

async function migrate() {
  const files = await readdir(PLANS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  let changed = 0;

  for (const file of mdFiles) {
    const path = join(PLANS_DIR, file);
    const content = await readFile(path, "utf-8");

    // Split frontmatter from body
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;

    let frontmatter = match[1];
    const body = content.slice(match[0].length);
    let modified = false;

    // Extract planType value
    const planTypeMatch = frontmatter.match(/^planType:\s*(.+)$/m);
    const planType = planTypeMatch?.[1]?.trim();

    if (planType) {
      // Remove planType line
      frontmatter = frontmatter.replace(/^planType:\s*.+\n?/m, "");
      modified = true;

      // Add planType to tags
      const tagsMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]$/m);
      if (tagsMatch) {
        // Existing tags array — append
        const existing = tagsMatch[1]
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        existing.push(planType);
        frontmatter = frontmatter.replace(
          /^tags:\s*\[[^\]]*\]$/m,
          `tags: [${existing.join(", ")}]`,
        );
      } else {
        // No tags field — add after category line
        frontmatter = frontmatter.replace(
          /^(category:\s*.+)$/m,
          `$1\ntags: [${planType}]`,
        );
      }
    }

    // Rename topic → subcategory
    if (frontmatter.match(/^topic:\s/m)) {
      frontmatter = frontmatter.replace(/^topic:/m, "subcategory:");
      modified = true;
    }

    if (modified) {
      await writeFile(path, `---\n${frontmatter}\n---${body}`);
      changed++;
    }
  }

  console.log(`Migrated ${changed}/${mdFiles.length} plan files`);
}

migrate();
```

**Step 2: Run the migration**

Run: `npx tsx scripts/migrate-plans.ts`
Expected: `Migrated ~98/98 plan files`

**Step 3: Spot-check a few files**

Verify that a plan file like `2026-02-28-collection-pagination-implementation.md` now has:
- No `planType` field
- `subcategory: collection-pagination` (was `topic:`)
- `tags: [implementation]`

**Step 4: Delete the migration script**

Remove: `scripts/migrate-plans.ts`

**Step 5: Commit**

```bash
git add app/src/content/plans/
git commit -m "chore: migrate plan frontmatter — planType to tags, topic to subcategory"
```

---

### Task 2: Update schema and types

**Files:**
- Modify: `app/src/content.config.ts:10,44-48,113-115`
- Modify: `app/src/lib/nav-data.ts:8-25,97-98`

**Step 1: Update content.config.ts schema**

In `app/src/content.config.ts`:

Replace lines 10:
```typescript
export type CardVariant = "stacked" | "link" | "compact" | "gallery" | "plan";
```
with:
```typescript
export type CardVariant = "stacked" | "link" | "compact" | "gallery";
```

Replace lines 44-48:
```typescript
    plans: {
      title: "Plans",
      description: "Claude's design docs and implementation plans for thalida.com.",
      cardVariant: "plan",
    },
```
with:
```typescript
    plans: {
      title: "Plans",
      description: "Claude's design docs and implementation plans for thalida.com.",
      cardVariant: "compact",
    },
```

Replace lines 113-115:
```typescript
        // Plan-specific optional fields
        planType: z.enum(["design", "implementation"]).optional(),
        topic: z.string().optional(),
```
with:
```typescript
        subcategory: z.string().optional(),
```

**Step 2: Update NavItem type in nav-data.ts**

In `app/src/lib/nav-data.ts`, replace lines 23-25:
```typescript
  // Plan-specific fields
  planType?: string;
  topic?: string;
```
with:
```typescript
  subcategory?: string;
```

Replace lines 97-98:
```typescript
        planType: name === "plans" ? entry.data.planType : undefined,
        topic: name === "plans" ? entry.data.topic : undefined,
```
with:
```typescript
        subcategory: entry.data.subcategory,
```

**Step 3: Run typecheck**

Run: `just app::typecheck`
Expected: errors about PlanGrid/PlanCard references (fixed in next task)

**Step 4: Commit**

```bash
git add app/src/content.config.ts app/src/lib/nav-data.ts
git commit -m "feat: replace planType/topic with subcategory in schema and NavItem"
```

---

### Task 3: Add subcategory to CompactCard

**Files:**
- Create: `app/src/components/Card/CardSubcategory.astro`
- Modify: `app/src/components/Card/CompactCard.astro:18`

**Step 1: Create CardSubcategory component**

Create `app/src/components/Card/CardSubcategory.astro`:
```astro
---
import { prettifySlug } from "@lib/format-utils";

interface Props {
  subcategory?: string;
}

const { subcategory } = Astro.props;
---

{
  subcategory && (
    <p class="m-0 font-body text-muted text-2xs tracking-wide">{prettifySlug(subcategory)}</p>
  )
}
```

**Step 2: Add subcategory to CompactCard**

In `app/src/components/Card/CompactCard.astro`, add import after line 4:
```typescript
import CardSubcategory from "./CardSubcategory.astro";
```

After the CardCategory line (line 18), add:
```astro
    <CardSubcategory subcategory={item.subcategory} />
```

**Step 3: Commit**

```bash
git add app/src/components/Card/CardSubcategory.astro app/src/components/Card/CompactCard.astro
git commit -m "feat: add subcategory display to CompactCard"
```

---

### Task 4: Remove plan-specific components and page branching

**Files:**
- Delete: `app/src/components/CollectionGrid/PlanGrid.astro`
- Delete: `app/src/components/Card/PlanCard.astro`
- Modify: `app/src/components/Card/Card.astro:21`
- Modify: `app/src/pages/[collection]/[...page].astro:5,43-56`
- Modify: `app/src/pages/[collection]/[category]/[...page].astro:5,44-57`

**Step 1: Delete PlanGrid and PlanCard**

```bash
rm app/src/components/CollectionGrid/PlanGrid.astro
rm app/src/components/Card/PlanCard.astro
```

**Step 2: Remove plan variant from Card.astro**

In `app/src/components/Card/Card.astro`, delete line 21:
```astro
{variant === "plan" && <CompactCard item={item} />}
```

**Step 3: Simplify [collection]/[...page].astro**

Remove the PlanGrid import (line 5):
```typescript
import PlanGrid from "@components/CollectionGrid/PlanGrid.astro";
```

Replace the entire template block (lines 42-70) — remove the `collection === "plans"` ternary and keep only CollectionGrid:
```astro
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={collectionMeta[collection].description}
    itemCount={page.total}
    items={page.data}
    allCategories={allCategories}
    prevUrl={page.url.prev}
    nextUrl={page.url.next}
    currentPage={page.currentPage}
    lastPage={page.lastPage}
  />
```

**Step 4: Simplify [collection]/[category]/[...page].astro**

Same pattern — remove PlanGrid import (line 5), replace template to use only CollectionGrid:
```astro
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={collectionMeta[collection].description}
    itemCount={page.total}
    items={page.data}
    allCategories={allCategories}
    activeCategory={category}
    prevUrl={page.url.prev}
    nextUrl={page.url.next}
    currentPage={page.currentPage}
    lastPage={page.lastPage}
  />
```

**Step 5: Run typecheck**

Run: `just app::typecheck`
Expected: PASS (or errors only from post page, fixed in next task)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove PlanGrid/PlanCard, unify plans with CollectionGrid"
```

---

### Task 5: Update post page — convert plan-specific sections to generic subcategory

**Files:**
- Modify: `app/src/pages/[collection]/post/[...id].astro:36-47,198-204,233-241,244-259`

**Step 1: Update related plans fetch to use subcategory**

Replace the related plans logic (lines 36-47) to use `subcategory` instead of `topic`:
```typescript
let relatedPlans: Array<{ id: string; title: string; tags?: string[] }> = [];
if (collection === "plans" && entry.data.subcategory) {
  const allPlans = await getCollection("plans", ({ data }) => !data.draft);
  relatedPlans = allPlans
    .filter((p) => p.data.subcategory === entry.data.subcategory && p.id !== entry.id)
    .map((p) => ({
      id: p.id,
      title: p.data.title,
      tags: p.data.tags,
    }));
}
```

**Step 2: Convert topic breadcrumb to subcategory**

Replace the topic breadcrumb (lines 198-204):
```astro
{
  collection === "plans" && entry.data.topic && (
    <span>
      {" "}
      / <span class="text-muted">{prettifySlug(entry.data.topic)}</span>
    </span>
  )
}
```
with a generic subcategory breadcrumb (not plan-specific):
```astro
{
  entry.data.subcategory && (
    <span>
      {" "}
      / <span class="text-muted">{prettifySlug(entry.data.subcategory)}</span>
    </span>
  )
}
```

**Step 3: Remove planType metadata display**

Delete lines 233-241 (the `collection === "plans"` block showing plan type metadata). This info is now in tags which render elsewhere.

**Step 4: Update related plans section — remove planType emoji, use tags**

Replace the related plans rendering (lines 244-259) to remove planType references:
```astro
{
  relatedPlans.length > 0 && (
    <div class="mt-4 pt-3 border-t border-border">
      <p class="m-0 mb-2 text-xs font-body font-semibold text-muted uppercase tracking-widest">Related plans</p>
      <div class="flex flex-col gap-1">
        {relatedPlans.map((rp) => (
          <a
            href={`/plans/post/${rp.id}`}
            class="flex items-center gap-2 text-sm text-teal no-underline hover:text-neon font-body"
          >
            <span>{rp.title}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
```

**Step 5: Clean up unused imports**

Remove any dead references to `planType` or `topic`.

**Step 6: Run typecheck and tests**

Run: `just app::typecheck && just test`
Expected: PASS

**Step 7: Commit**

```bash
git add app/src/pages/[collection]/post/
git commit -m "feat: replace plan-specific post sections with generic subcategory"
```

---

### Task 6: Build and verify

**Step 1: Run full build**

Run: `just app::build`
Expected: PASS, all pages generated

**Step 2: Serve and spot-check**

Run: `just app::serve`

Verify:
- `/plans` shows individual plan cards (compact style, like recipes)
- Each card shows category, subcategory, date, title, description, tags (including "design" or "implementation")
- Pagination works correctly (30 items per page)
- `/plans/code-quality` (category filter) works
- `/plans/post/<id>` shows subcategory in breadcrumb, related plans still work (grouped by subcategory)
- `/recipes` still looks correct (unaffected)

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during verification"
```
