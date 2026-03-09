---
title: Plans Collection Implementation Plan
description: >-
  Add a "plans" content collection that surfaces Claude's design docs and
  implementation plans as browsable, topic-grouped content on the site.
publishedOn: 2026-03-09T00:19:53.000Z
planType: implementation
topic: plans-collection
status: completed
category: content
---

# Plans Collection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "plans" content collection that surfaces Claude's design docs and implementation plans as browsable, topic-grouped content on the site.

**Architecture:** Plans are standard Astro content collection entries with extra frontmatter fields (`planType`, `topic`, `status`). A migration script moves files from `docs/plans/` to `src/content/plans/` with injected frontmatter. The collection list page uses a custom `PlanGrid` component that groups plans by `topic` instead of the standard flat card grid. Related plans are derived at build time by matching `topic` values.

**Tech Stack:** Astro 5, TypeScript, Tailwind CSS, Node.js (migration script)

---

## Task 1: Migration Script

Write a Node.js script that moves existing plan files from `docs/plans/` to `app/src/content/plans/` with injected frontmatter.

**Files:**
- Create: `scripts/migrate-plans.mjs`

**Step 1: Write the migration script**

```javascript
// scripts/migrate-plans.mjs
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";

const SOURCE = "docs/plans";
const DEST = "app/src/content/plans";

// Patterns that suggest sensitive content
const SENSITIVE_PATTERNS = [
  /(?:api[_-]?key|secret|token|password|credential)s?\s*[:=]/i,
  /(?:sk|pk|api)[-_][a-zA-Z0-9]{20,}/,
  /\.env\b/,
  /Bearer\s+[a-zA-Z0-9._-]+/,
];

function parsePlanFilename(filename) {
  const stem = filename.replace(/\.md$/, "");
  const dateMatch = stem.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (!dateMatch) return null;

  const [, dateStr, rest] = dateMatch;
  let planType = "implementation";
  let topic = rest;

  if (rest.endsWith("-design")) {
    planType = "design";
    topic = rest.replace(/-design$/, "");
  } else if (rest.endsWith("-implementation")) {
    planType = "implementation";
    topic = rest.replace(/-implementation$/, "");
  }

  return { publishedOn: dateStr, planType, topic };
}

function extractTitleAndDescription(content) {
  const lines = content.split("\n");
  let title = null;
  let description = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!title && line.startsWith("# ")) {
      title = line.replace(/^#\s+/, "");
      // Look for first non-empty paragraph after heading
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (nextLine.startsWith("#") || nextLine.startsWith(">")
            || nextLine.startsWith("---") || nextLine.startsWith("```")
            || nextLine.startsWith("- ") || nextLine.startsWith("*")) {
          break;
        }
        description = nextLine.slice(0, 200);
        break;
      }
      break;
    }
  }

  return { title: title || "Untitled Plan", description };
}

function hasSensitiveContent(content) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(content));
}

async function main() {
  await mkdir(DEST, { recursive: true });

  const files = (await readdir(SOURCE)).filter((f) => f.endsWith(".md"));
  const flagged = [];
  let migrated = 0;

  for (const file of files) {
    const content = await readFile(join(SOURCE, file), "utf-8");
    const parsed = parsePlanFilename(file);

    if (!parsed) {
      console.warn(`SKIP (bad filename): ${file}`);
      continue;
    }

    if (hasSensitiveContent(content)) {
      flagged.push(file);
      console.warn(`FLAG (sensitive): ${file}`);
      continue;
    }

    const { title, description } = extractTitleAndDescription(content);
    const { publishedOn, planType, topic } = parsed;

    const frontmatter = [
      "---",
      `title: "${title.replace(/"/g, '\\"')}"`,
      description
        ? `description: "${description.replace(/"/g, '\\"')}"`
        : null,
      `publishedOn: ${publishedOn}`,
      `planType: "${planType}"`,
      `topic: "${topic}"`,
      `status: "completed"`,
      "---",
      "",
    ]
      .filter((line) => line !== null)
      .join("\n");

    const newContent = frontmatter + content;
    const destFile = join(DEST, file);
    await writeFile(destFile, newContent);
    migrated++;
  }

  console.log(`\nMigrated: ${migrated}`);
  if (flagged.length > 0) {
    console.log(`\nFlagged for manual review (${flagged.length}):`);
    flagged.forEach((f) => console.log(`  - ${f}`));
    console.log("\nFlagged files remain in docs/plans/.");
  }
}

main().catch(console.error);
```

**Step 2: Run the migration script**

Run: `node scripts/migrate-plans.mjs`

Expected: Output showing migrated count and any flagged files.

**Step 3: Verify migration output**

Run: `ls app/src/content/plans/ | head -10`

Expected: Plan files with date-prefixed names.

Run: `head -10 app/src/content/plans/2026-02-20-sidebar-redesign-design.md`

Expected: Frontmatter block with title, publishedOn, planType, topic, status followed by original content.

**Step 4: Review any flagged files manually**

If any files were flagged, review them for actual sensitive content. For false positives, manually add frontmatter and copy to `app/src/content/plans/`. For true positives, either redact the sensitive content or add `draft: true` to exclude from the site.

**Step 5: Remove migrated source files**

Run: `rm docs/plans/*.md` (only if no flagged files remain, otherwise remove only the migrated ones)

**Step 6: Commit**

```bash
git add app/src/content/plans/ scripts/migrate-plans.mjs
git rm docs/plans/*.md  # or selectively for non-flagged files
git commit -m "chore: migrate plan files to content collection

Move 90+ plan docs from docs/plans/ to app/src/content/plans/
with injected frontmatter (title, planType, topic, status).
Flagged files with potential sensitive content for manual review."
```

---

## Task 2: Content Config — Add Plans Collection

Register the `"plans"` collection in the Astro content config with plan-specific schema fields.

**Files:**
- Modify: `app/src/content.config.ts`

**Step 1: Add "plans" to COLLECTION_NAMES and CardVariant**

In `app/src/content.config.ts`, update line 6:

```typescript
export const COLLECTION_NAMES = [
  "projects", "guides", "gallery", "recipes", "versions", "links", "plans",
] as const;
```

Update line 10:

```typescript
export type CardVariant = "stacked" | "link" | "compact" | "gallery" | "plan";
```

**Step 2: Add collectionMeta entry for plans**

After the `versions` entry (line 43), add:

```typescript
    plans: {
      title: "Plans",
      description: "Claude's design docs and implementation plans for thalida.com.",
      cardVariant: "plan",
    },
```

**Step 3: Add plan-specific schema fields**

In the `schema` object inside `makeCollection` (around line 97), add after the `tags` field (line 107):

```typescript
        // Plan-specific optional fields
        planType: z.enum(["design", "implementation"]).optional(),
        topic: z.string().optional(),
        status: z.enum(["planned", "in-progress", "completed"]).optional(),
```

**Step 4: Verify build**

Run: `just app::typecheck`

Expected: No type errors.

**Step 5: Commit**

```bash
git add app/src/content.config.ts
git commit -m "feat: register plans content collection with schema"
```

---

## Task 3: Nav Data — Include Plans with Topic/Status Fields

Extend `NavItem` to carry plan-specific fields and ensure plans are included in nav data.

**Files:**
- Modify: `app/src/lib/nav-data.ts`

**Step 1: Add plan fields to NavItem type**

In `app/src/lib/nav-data.ts`, add to the `NavItem` type (after line 21):

```typescript
  // Plan-specific fields
  planType?: string;
  topic?: string;
  status?: string;
```

**Step 2: Populate plan fields in getNavData**

In the `getNavData` loop body, after `metaDescription` is set (line 93), add plan-specific field population:

```typescript
        planType: name === "plans" ? entry.data.planType : undefined,
        topic: name === "plans" ? entry.data.topic : undefined,
        status: name === "plans" ? entry.data.status : undefined,
```

These go inside the `items.push({...})` call, after the `metaDescription` line.

**Step 3: Verify build**

Run: `just app::typecheck`

Expected: No type errors.

**Step 4: Commit**

```bash
git add app/src/lib/nav-data.ts
git commit -m "feat: add plan fields to NavItem for topic grouping"
```

---

## Task 4: PlanCard Component

Create the card component for a single topic group, showing its design and implementation plan rows.

**Files:**
- Create: `app/src/components/Card/PlanCard.astro`

**Step 1: Create PlanCard component**

```astro
---
import type { NavItem } from "@lib/nav-data";
import { formatDate, isValidDate } from "@lib/format-utils";

interface Props {
  topic: string;
  plans: NavItem[];
}

const { topic, plans } = Astro.props;

// Sort: design first, then implementation
const sorted = [...plans].sort((a, b) => {
  if (a.planType === "design" && b.planType !== "design") return -1;
  if (a.planType !== "design" && b.planType === "design") return 1;
  return 0;
});

// Most recent date for the topic header
const latestDate = plans
  .map((p) => p.publishedOn)
  .filter(Boolean)
  .sort()
  .reverse()[0];

// Status from the most recent plan
const latestPlan = [...plans].sort(
  (a, b) => new Date(b.publishedOn).getTime() - new Date(a.publishedOn).getTime(),
)[0];
const status = latestPlan?.status ?? "completed";

const statusColors: Record<string, string> = {
  planned: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  "in-progress": "text-blue-400 border-blue-400/30 bg-blue-400/10",
  completed: "text-teal border-teal/30 bg-teal/10",
};
---

<div class="item-card flex flex-col p-4 gap-3">
  <div class="flex items-center justify-between gap-2">
    <h3 class="m-0 font-heading font-bold text-text text-base leading-snug">
      {topic}
    </h3>
    {isValidDate(latestDate) && (
      <span class="text-dim text-2xs whitespace-nowrap">{formatDate(latestDate)}</span>
    )}
  </div>

  <div class="flex flex-col gap-2">
    {sorted.map((plan) => (
      <a
        href={`/plans/post/${plan.id}`}
        class="group flex items-start gap-2 no-underline hover:bg-white/5 rounded-sm p-2 -m-1 transition-colors"
      >
        <span class="text-xs mt-0.5 shrink-0">
          {plan.planType === "design" ? "\u{1F4D0}" : "\u{1F527}"}
        </span>
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="font-body text-sm text-teal group-hover:text-neon capitalize">
            {plan.planType}
          </span>
          {plan.description && (
            <span class="font-body text-xs text-muted leading-relaxed line-clamp-2">
              {plan.description}
            </span>
          )}
        </div>
      </a>
    ))}
  </div>

  <div class="mt-auto pt-1">
    <span class:list={[
      "text-2xs font-body border rounded-sm py-0.5 px-2 capitalize",
      statusColors[status] ?? statusColors.completed,
    ]}>
      {status}
    </span>
  </div>
</div>
```

**Step 2: Verify no syntax errors**

Run: `just app::typecheck`

Expected: No type errors.

**Step 3: Commit**

```bash
git add app/src/components/Card/PlanCard.astro
git commit -m "feat: add PlanCard component for topic-grouped plan display"
```

---

## Task 5: PlanGrid Component

Create the grid component that groups plans by topic and renders PlanCards.

**Files:**
- Create: `app/src/components/CollectionGrid/PlanGrid.astro`

**Step 1: Create PlanGrid component**

```astro
---
import type { NavItem } from "@lib/nav-data";
import PlanCard from "@components/Card/PlanCard.astro";
import CategoryFilter from "@components/CategoryFilter/CategoryFilter.astro";
import Pagination from "@components/Pagination/Pagination.astro";

interface Props {
  collection: string;
  title: string;
  subtitle: string;
  itemCount: number;
  items: NavItem[];
  allCategories: string[];
  activeCategory?: string;
  prevUrl?: string;
  nextUrl?: string;
  currentPage?: number;
  lastPage?: number;
}

const {
  collection,
  title,
  subtitle,
  itemCount,
  items,
  allCategories,
  activeCategory,
  prevUrl,
  nextUrl,
  currentPage,
  lastPage,
} = Astro.props;

// Group items by topic
const topicMap = new Map<string, NavItem[]>();
for (const item of items) {
  const topic = item.topic ?? item.id;
  if (!topicMap.has(topic)) topicMap.set(topic, []);
  topicMap.get(topic)!.push(item);
}

// Sort topics by most recent plan date
const topics = [...topicMap.entries()].sort((a, b) => {
  const latestA = Math.max(...a[1].map((p) => new Date(p.publishedOn).getTime()));
  const latestB = Math.max(...b[1].map((p) => new Date(p.publishedOn).getTime()));
  return latestB - latestA;
});

const topicCount = topics.length;
---

<div class="font-body">
  <header class="mb-6">
    <h1 class="page-title mb-1">{title}</h1>
    <p class="m-0 mb-1 font-heading font-semibold text-text text-subtitle tracking-tight">
      {subtitle}
    </p>
    <p class="m-0 font-body text-muted text-sm">
      {itemCount} items &middot; {topicCount} topics
    </p>
  </header>

  <CategoryFilter
    collection={collection}
    categories={allCategories}
    activeCategory={activeCategory}
  />

  <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3">
    {topics.map(([topic, plans]) => (
      <PlanCard topic={topic} plans={plans} />
    ))}
  </div>

  <Pagination
    prevUrl={prevUrl}
    nextUrl={nextUrl}
    currentPage={currentPage ?? 1}
    lastPage={lastPage ?? 1}
  />
</div>
```

**Step 2: Verify no syntax errors**

Run: `just app::typecheck`

Expected: No type errors.

**Step 3: Commit**

```bash
git add app/src/components/CollectionGrid/PlanGrid.astro
git commit -m "feat: add PlanGrid component for topic-grouped plan layout"
```

---

## Task 6: Wire Up Collection List Page

Update the collection list page to use PlanGrid for plans instead of CollectionGrid.

**Files:**
- Modify: `app/src/pages/[collection]/[...page].astro`

**Step 1: Import PlanGrid**

In `app/src/pages/[collection]/[...page].astro`, add after line 4:

```typescript
import PlanGrid from "@components/CollectionGrid/PlanGrid.astro";
```

**Step 2: Conditionally render PlanGrid for plans**

Replace the template section (lines 36-53) with:

```astro
<BaseLayout
  title={`${title} · thalida`}
  activeCollection={collection}
  description={collectionMeta[collection].description}
>
  {collection === "plans" ? (
    <PlanGrid
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
  ) : (
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
  )}
</BaseLayout>
```

**Step 3: Do the same for the category-filtered page**

In `app/src/pages/[collection]/[category]/[...page].astro`, add the same PlanGrid import and conditional rendering pattern.

**Step 4: Verify build**

Run: `just app::typecheck`

Expected: No type errors.

**Step 5: Commit**

```bash
git add app/src/pages/[collection]/[...page].astro \
       app/src/pages/[collection]/[category]/[...page].astro
git commit -m "feat: route plans collection through PlanGrid component"
```

---

## Task 7: Plan Post Page — Related Plans Section

Add plan-specific metadata and related plans section to the post page.

**Files:**
- Modify: `app/src/pages/[collection]/post/[...id].astro`

**Step 1: Fetch related plans for plan posts**

In `app/src/pages/[collection]/post/[...id].astro`, after `const { entry } = Astro.props;` (line 33), add:

```typescript
// Fetch related plans (same topic) for plan posts
let relatedPlans: Array<{ id: string; title: string; planType?: string }> = [];
if (collection === "plans" && entry.data.topic) {
  const { getCollection } = await import("astro:content");
  const allPlans = await getCollection("plans", ({ data }) => !data.draft);
  relatedPlans = allPlans
    .filter((p) => p.data.topic === entry.data.topic && p.id !== entry.id)
    .map((p) => ({
      id: p.id,
      title: p.data.title,
      planType: p.data.planType,
    }));
}
```

**Step 2: Add plan metadata to the header**

In the header section (after the CardTags rendering around line 209), add:

```astro
      {collection === "plans" && (
        <div class="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-body text-muted">
          {entry.data.planType && (
            <span>
              <span class="font-semibold text-text">Type</span>{" "}
              <span class="capitalize">{entry.data.planType}</span>
            </span>
          )}
          {entry.data.status && (
            <span>
              <span class="font-semibold text-text">Status</span>{" "}
              <span class="capitalize">{entry.data.status}</span>
            </span>
          )}
        </div>
      )}
      {relatedPlans.length > 0 && (
        <div class="mt-4 pt-3 border-t border-border">
          <p class="m-0 mb-2 text-xs font-body font-semibold text-muted uppercase tracking-widest">
            Related plans
          </p>
          <div class="flex flex-col gap-1">
            {relatedPlans.map((rp) => (
              <a
                href={`/plans/post/${rp.id}`}
                class="flex items-center gap-2 text-sm text-teal no-underline hover:text-neon font-body"
              >
                <span>{rp.planType === "design" ? "\u{1F4D0}" : "\u{1F527}"}</span>
                <span>{rp.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}
```

**Step 3: Update breadcrumb for plans to show topic**

In the breadcrumb section (around line 170), after the existing category breadcrumb, add topic-based breadcrumb for plans:

```astro
          {
            collection === "plans" && entry.data.topic && (
              <span>
                {" "}
                /{" "}
                <a class="text-teal no-underline hover:text-neon" href={`/plans/${entry.data.topic}`}>
                  {entry.data.topic}
                </a>
              </span>
            )
          }
```

Note: This uses the topic as a category-style breadcrumb. The `topic` won't map to a real category route unless plans use `category` for the topic value. Consider whether to set `category` equal to `topic` during migration, or adjust the breadcrumb link. Since plans use `tags` for filtering (not `category`), this breadcrumb link could either be removed or point to a search/filter URL. For now, omit the breadcrumb link and just show the topic as text:

```astro
          {
            collection === "plans" && entry.data.topic && (
              <span>
                {" "}
                / <span class="text-teal">{entry.data.topic}</span>
              </span>
            )
          }
```

**Step 4: Verify build**

Run: `just app::typecheck`

Expected: No type errors.

**Step 5: Commit**

```bash
git add app/src/pages/[collection]/post/[...id].astro
git commit -m "feat: add related plans and plan metadata to post page"
```

---

## Task 8: Card.astro — Handle Plan Variant

Update the Card dispatcher to handle the `"plan"` variant. Since plans use PlanGrid (not CollectionGrid), this is a fallback that prevents errors if Card is ever called with a plan item.

**Files:**
- Modify: `app/src/components/Card/Card.astro`

**Step 1: Add PlanCard import and case**

In `app/src/components/Card/Card.astro`, add import:

```typescript
import PlanCard from "./PlanCard.astro";
```

Note: PlanCard expects `topic` + `plans[]` props, not a single `item`. For the Card dispatcher (which passes a single item), render it as a compact card fallback:

```astro
{variant === "plan" && <CompactCard item={item} />}
```

This ensures plans still render if they ever flow through the standard Card path (e.g., search results).

**Step 2: Commit**

```bash
git add app/src/components/Card/Card.astro
git commit -m "feat: add plan variant fallback to Card dispatcher"
```

---

## Task 9: Build and Visual Verification

**Step 1: Run full build**

Run: `just app::build`

Expected: Build completes with no errors. Plans collection is generated.

**Step 2: Serve locally and verify**

Run: `just app::serve`

Browse to: `http://localhost:4321/plans`

Verify:
- Page title shows "Plans" with description
- Plans are grouped by topic
- Each topic card shows design/implementation rows
- Status badges are visible
- Category filter shows tags

Browse to: `http://localhost:4321/plans/post/2026-02-20-sidebar-redesign-design`

Verify:
- Plan content renders correctly (headings, code blocks, lists)
- Breadcrumb shows `plans / sidebar-redesign`
- Plan type and status metadata shown
- Related plans section shows the implementation plan link

**Step 3: Fix any issues found**

Address any rendering, styling, or data issues.

**Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix: address visual issues in plans collection"
```

---

## Task 10: Update Brainstorming Skill

Update the brainstorming skill to write plan files to the new content location with proper frontmatter and sensitive content handling.

**Files:**
- Modify: `/Users/thalida/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/brainstorming/SKILL.md`

Note: This file is in the superpowers plugin cache. Since the plugin is managed externally, this change may need to be made upstream. If the skill can't be modified directly, document the required changes for the plugin maintainer.

**Required changes to the skill:**

1. Line 30 — Change output path:
   - From: `docs/plans/YYYY-MM-DD-<topic>-design.md`
   - To: `app/src/content/plans/YYYY-MM-DD-<topic>-design.md`

2. Line 81 — Same path change in the "After the Design" section.

3. Add instruction after the "Write design doc" step: the skill must include frontmatter in the written file:

```markdown
**Frontmatter template for plan files:**

    ---
    title: "[Design/Feature title]"
    description: "[One-sentence summary]"
    publishedOn: YYYY-MM-DD
    planType: "design"  # or "implementation"
    topic: "[topic-slug from filename]"
    status: "planned"
    tags: ["relevant", "tags"]
    ---

**Before committing:** Ask the user to confirm the plan content is safe
to publish, since plans are now public site content. Do not include API
keys, tokens, credentials, internal URLs, or .env values.
```

**Step 1: Make the changes**

Edit the SKILL.md file with the changes described above.

**Step 2: Commit**

If the skill is in a separate repo (skillslida), commit there. If it's in the plugin cache, note that changes will be overwritten on plugin update — consider opening an issue or PR upstream.

```bash
git add -u
git commit -m "feat: update brainstorming skill for plans content collection"
```

---

## Task 11: Run Tests and Final Verification

**Step 1: Run existing tests**

Run: `just test`

Expected: All existing tests pass. No regressions.

**Step 2: Run typecheck**

Run: `just app::typecheck`

Expected: No type errors.

**Step 3: Run build**

Run: `just app::build`

Expected: Clean build with plans collection included.

**Step 4: Final commit if needed**

```bash
git add -u
git commit -m "chore: final cleanup for plans collection"
```
