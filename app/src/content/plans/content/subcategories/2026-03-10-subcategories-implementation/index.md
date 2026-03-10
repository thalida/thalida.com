---
title: Subcategories & Filesystem-Driven Content Implementation Plan
description: Derive category and subcategory from the filesystem, co-locate
  images via page bundles, and add subcategory filtering.
publishedOn: 2026-03-10
planType: implementation
topic: subcategories
tags:
  - implementation
---

# Subcategories & Filesystem-Driven Content Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Derive category and subcategory from the filesystem path instead of frontmatter, restructure content into directory hierarchies, and add subcategory filter pages.

**Architecture:** Content files move into `content/[collection]/[category/[subcategory/]]slug/index.md` page bundles. A `parseContentPath(id)` utility extracts category/subcategory/slug from entry IDs. The glob loader's `generateId` strips `/index` suffixes. Nav data builds an `allSubcategories` map. A new route and filter component enable subcategory browsing.

**Tech Stack:** Astro 5, TypeScript, Zod, Vitest, Tailwind CSS

---

### Task 1: Create `parseContentPath` utility

**Files:**
- Create: `app/src/lib/content-path.ts`
- Create: `app/src/lib/__tests__/content-path.test.ts`

**Step 1: Write the tests**

```typescript
// app/src/lib/__tests__/content-path.test.ts
import { describe, it, expect } from "vitest";
import { parseContentPath } from "../content-path";

describe("parseContentPath", () => {
  it("returns slug only for single-segment ID", () => {
    expect(parseContentPath("advent-of-code")).toEqual({
      slug: "advent-of-code",
    });
  });

  it("returns category + slug for two-segment ID", () => {
    expect(parseContentPath("education/advent-of-code")).toEqual({
      category: "education",
      slug: "advent-of-code",
    });
  });

  it("returns category + subcategory + slug for three-segment ID", () => {
    expect(parseContentPath("craft/3dprint/homer-bathroom")).toEqual({
      category: "craft",
      subcategory: "3dprint",
      slug: "homer-bathroom",
    });
  });

  it("handles deeply nested slugs (4+ segments) by joining remainder as slug", () => {
    expect(parseContentPath("craft/3dprint/sub/deep-post")).toEqual({
      category: "craft",
      subcategory: "3dprint",
      slug: "sub/deep-post",
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/lib/__tests__/content-path.test.ts`
Expected: FAIL — module `../content-path` not found

**Step 3: Write the implementation**

```typescript
// app/src/lib/content-path.ts
export function parseContentPath(id: string): {
  category?: string;
  subcategory?: string;
  slug: string;
} {
  const segments = id.split("/");
  if (segments.length === 1) return { slug: segments[0] };
  if (segments.length === 2) return { category: segments[0], slug: segments[1] };
  return {
    category: segments[0],
    subcategory: segments[1],
    slug: segments.slice(2).join("/"),
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/__tests__/content-path.test.ts`
Expected: PASS — all 4 tests green

**Step 5: Commit**

```bash
git add app/src/lib/content-path.ts app/src/lib/__tests__/content-path.test.ts
git commit -m "feat: add parseContentPath utility with tests"
```

---

### Task 2: Write the content migration script

This script restructures flat content files into the filesystem hierarchy described in the design spec. It moves files into `category/[subcategory/]slug/index.md` page bundles and strips `category`/`subcategory` from frontmatter.

**Files:**
- Create: `app/scripts/migrate-content-to-dirs.ts`

**Step 1: Write the migration script**

```typescript
// app/scripts/migrate-content-to-dirs.ts
//
// Usage: npx tsx scripts/migrate-content-to-dirs.ts [--dry-run]
//
// For each markdown collection (projects, guides, gallery, recipes, versions, plans):
//   1. Read each .md/.mdx file's frontmatter for `category` and `subcategory`
//   2. Compute target path: content/[collection]/[category/[subcategory/]]slug/index.md
//   3. Move the file (and any sibling asset directory with the same name) into a page bundle
//   4. Remove `category` and `subcategory` fields from frontmatter
//
// For links:
//   1. Restructure flat YAML files into category directories
//   2. If entries have subcategory, split into separate files per subcategory

import { promises as fs } from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

const DRY_RUN = process.argv.includes("--dry-run");
const CONTENT_DIR = path.resolve(__dirname, "../src/content");

const MD_COLLECTIONS = ["projects", "guides", "gallery", "recipes", "versions", "plans"];

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true, () => false);
}

async function migrateMarkdownCollection(collection: string) {
  const collectionDir = path.join(CONTENT_DIR, collection);
  if (!(await exists(collectionDir))) return;

  const entries = await fs.readdir(collectionDir, { withFileTypes: true });

  for (const entry of entries) {
    // Only process .md/.mdx files at the collection root
    if (!entry.isFile()) continue;
    if (!/\.mdx?$/.test(entry.name)) continue;

    const filePath = path.join(collectionDir, entry.name);
    const raw = await fs.readFile(filePath, "utf-8");
    const { data: frontmatter, content } = matter(raw);

    const category: string | undefined = frontmatter.category;
    const subcategory: string | undefined = frontmatter.subcategory;
    const slug = entry.name.replace(/\.mdx?$/, "");

    // Build target directory
    const segments = [collectionDir];
    if (category) segments.push(category);
    if (subcategory) segments.push(subcategory);
    segments.push(slug);
    const targetDir = path.join(...segments);
    const targetFile = path.join(targetDir, "index.md");

    // Skip if source and target are the same (already migrated)
    if (filePath === targetFile) continue;

    // Remove category/subcategory from frontmatter
    const newFrontmatter = { ...frontmatter };
    delete newFrontmatter.category;
    delete newFrontmatter.subcategory;

    const newContent = matter.stringify(content, newFrontmatter);

    console.log(`${DRY_RUN ? "[DRY RUN] " : ""}${filePath} -> ${targetFile}`);

    if (!DRY_RUN) {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetFile, newContent);
      await fs.unlink(filePath);

      // Move sibling asset directory if it exists (e.g., advent-of-code/ alongside advent-of-code.md)
      const assetDir = path.join(collectionDir, slug);
      if (await exists(assetDir)) {
        const assetStat = await fs.stat(assetDir);
        if (assetStat.isDirectory()) {
          // Move contents into the page bundle directory
          const assets = await fs.readdir(assetDir);
          for (const asset of assets) {
            const src = path.join(assetDir, asset);
            const dest = path.join(targetDir, asset);
            await fs.rename(src, dest);
          }
          await fs.rmdir(assetDir);
          console.log(`  Moved assets from ${assetDir} -> ${targetDir}`);
        }
      }
    }
  }
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== MIGRATING ===");

  for (const collection of MD_COLLECTIONS) {
    console.log(`\n--- ${collection} ---`);
    await migrateMarkdownCollection(collection);
  }

  console.log("\nDone.");
  if (DRY_RUN) console.log("Re-run without --dry-run to apply changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 2: Run in dry-run mode to preview changes**

Run: `cd app && npx tsx scripts/migrate-content-to-dirs.ts --dry-run`
Expected: Prints a list of file moves without modifying anything. Review the output to confirm the mappings look correct.

**Step 3: Run the migration**

Run: `cd app && npx tsx scripts/migrate-content-to-dirs.ts`
Expected: Files are moved into directory hierarchies. Spot-check a few:
- `content/projects/advent-of-code.md` -> `content/projects/education/advent-of-code/index.md`
- `content/plans/2026-03-08-plan-categories.md` -> `content/plans/content/plan-categories/2026-03-08-plan-categories/index.md`

**Step 4: Verify the app still loads content**

Run: `just app::build`
Expected: Build may fail at this point because entry IDs now include directory segments and the glob loader hasn't been updated yet. That's expected — Task 3 fixes this.

**Step 5: Commit the migration**

```bash
git add app/scripts/migrate-content-to-dirs.ts
git add app/src/content/
git commit -m "feat: migrate content files to filesystem-driven directory structure"
```

---

### Task 3: Update glob loader with `generateId`

Strip `/index` from entry IDs so that `content/projects/education/advent-of-code/index.md` produces ID `education/advent-of-code` instead of `education/advent-of-code/index`.

**Files:**
- Modify: `app/src/content.config.ts:85-97` (the `makeCollection` function)

**Step 1: Update the glob loader**

In `app/src/content.config.ts`, change the `makeCollection` function's glob call:

```typescript
// Before (line 96):
loader = glob({ pattern: "**/*.{md,mdx}", base });

// After:
loader = glob({
  pattern: "**/*.{md,mdx}",
  base,
  generateId: ({ entry }) => entry.replace(/\/index$/, ""),
});
```

**Step 2: Verify the build works**

Run: `just app::build`
Expected: Build succeeds. Entry IDs now look like `education/advent-of-code` instead of `education/advent-of-code/index`.

**Step 3: Commit**

```bash
git add app/src/content.config.ts
git commit -m "feat: add generateId to strip /index from entry IDs"
```

---

### Task 4: Remove `category` and `subcategory` from Zod schema

These fields are now derived from the filesystem path, not frontmatter. Keeping them in the schema would cause Astro to expect them in frontmatter. Remove them so the schema validates without those fields.

**Note:** `category` is still needed for links (YAML-injected) and recipes (`recipeCategory` in JSON-LD). For now, keep `category` in the schema as optional — it's harmless for collections that don't use it, and links/recipes still inject it. Only remove `subcategory`.

**Files:**
- Modify: `app/src/content.config.ts:113` (the `subcategory` field)

**Step 1: Remove subcategory from the schema**

In `app/src/content.config.ts`, delete line 113:

```typescript
// Delete this line:
subcategory: z.string().optional(),
```

**Step 2: Verify existing tests pass**

Run: `just app::test`
Expected: All tests pass (no tests depend on `subcategory` in schema).

**Step 3: Commit**

```bash
git add app/src/content.config.ts
git commit -m "refactor: remove subcategory from Zod schema (now filesystem-derived)"
```

---

### Task 5: Update nav-data to use `parseContentPath`

Replace frontmatter reads of `category` and `subcategory` with path parsing. Add `allSubcategories` to `NavCollection`.

**Files:**
- Modify: `app/src/lib/nav-data.ts:1-111`
- Modify: `app/src/lib/collection-types.ts:14-17`

**Step 1: Update `NavCollection` type**

In `app/src/lib/nav-data.ts`, add `allSubcategories` to the `NavCollection` type (line 25-30):

```typescript
// Before:
export type NavCollection = {
  name: string;
  title: string;
  items: NavItem[];
  allCategories: string[];
};

// After:
export type NavCollection = {
  name: string;
  title: string;
  items: NavItem[];
  allCategories: string[];
  allSubcategories: Record<string, string[]>; // category -> subcategory[]
};
```

**Step 2: Update `CollectionPageProps`**

In `app/src/lib/collection-types.ts`, add `allSubcategories`:

```typescript
// Before:
export interface CollectionPageProps {
  title: string;
  allCategories: string[];
}

// After:
export interface CollectionPageProps {
  title: string;
  allCategories: string[];
  allSubcategories: Record<string, string[]>;
}
```

**Step 3: Update `getNavData()` to use `parseContentPath`**

In `app/src/lib/nav-data.ts`:

Add import at top:
```typescript
import { parseContentPath } from "./content-path";
```

Replace the category logic inside the `for (const entry of sorted)` loop (around lines 67-96). The key changes:

```typescript
// After the isDead check (line 77-78), replace:
//   const category = isDead ? "dead-links" : entry.data.category;
// With:
const parsed = parseContentPath(entry.id);
const category = isDead ? "dead-links" : (entry.data.category ?? parsed.category);

// In the items.push() call, replace:
//   subcategory: entry.data.subcategory,
// With:
subcategory: parsed.subcategory,
```

Note: `entry.data.category ?? parsed.category` — links still have `category` in their YAML data, so we fall back to parsed for markdown collections.

After the items loop, build the subcategories map:

```typescript
// After the items loop, before data[name] = ..., add:
const subcategoriesMap: Record<string, string[]> = {};
for (const item of items) {
  if (item.category && item.subcategory) {
    if (!subcategoriesMap[item.category]) {
      subcategoriesMap[item.category] = [];
    }
    if (!subcategoriesMap[item.category].includes(item.subcategory)) {
      subcategoriesMap[item.category].push(item.subcategory);
    }
  }
}
// Sort subcategories alphabetically
for (const cat of Object.keys(subcategoriesMap)) {
  subcategoriesMap[cat].sort();
}
```

Update the `data[name]` assignment to include `allSubcategories`:

```typescript
data[name] = {
  name,
  title: collectionMeta[name].title,
  items,
  allCategories: [...categoriesSet]
    .sort((a, b) => (name === "versions" ? b.localeCompare(a) : a.localeCompare(b)))
    .sort((a, b) => (a === "dead-links" ? 1 : b === "dead-links" ? -1 : 0)),
  allSubcategories: subcategoriesMap,
};
```

**Step 4: Verify the build works**

Run: `just app::build`
Expected: Build succeeds. Nav data now includes subcategory information parsed from paths.

**Step 5: Commit**

```bash
git add app/src/lib/nav-data.ts app/src/lib/collection-types.ts
git commit -m "feat: derive subcategory from filesystem path in nav-data"
```

---

### Task 6: Update collection index and category pages to pass `allSubcategories`

The route pages need to pass the new `allSubcategories` prop through to `CollectionGrid`.

**Files:**
- Modify: `app/src/pages/[collection]/[...page].astro:19-26`
- Modify: `app/src/pages/[collection]/[category]/[...page].astro:19-27`

**Step 1: Update collection index page**

In `app/src/pages/[collection]/[...page].astro`, add `allSubcategories` to the props passed by `paginate`:

```typescript
// In getStaticPaths, update the props object (lines 22-25):
props: {
  title: collectionData.title,
  allCategories: collectionData.allCategories,
  allSubcategories: collectionData.allSubcategories,
},
```

And extract it from props (line 33):
```typescript
const { title, allCategories, allSubcategories } = Astro.props as CollectionPageProps;
```

Pass to `CollectionGrid` (add after `allCategories` prop):
```
allSubcategories={allSubcategories}
```

**Step 2: Update category filter page**

In `app/src/pages/[collection]/[category]/[...page].astro`, same changes — add `allSubcategories` to props and pass to `CollectionGrid`:

```typescript
// In getStaticPaths props:
props: {
  title: collectionData.title,
  allCategories: collectionData.allCategories,
  allSubcategories: collectionData.allSubcategories,
},
```

Extract and pass through the same way as Step 1.

**Step 3: Update `CollectionGrid` props**

In `app/src/components/CollectionGrid/CollectionGrid.astro`, add to the Props interface:

```typescript
allSubcategories?: Record<string, string[]>;
activeSubcategory?: string;
```

Destructure them in the component script. Don't render them yet — Task 8 adds the SubcategoryFilter.

**Step 4: Verify the build**

Run: `just app::build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add app/src/pages/[collection]/[...page].astro \
       app/src/pages/[collection]/[category]/[...page].astro \
       app/src/components/CollectionGrid/CollectionGrid.astro
git commit -m "feat: plumb allSubcategories through collection pages"
```

---

### Task 7: Create the subcategory filter route

New route file: `/[collection]/[category]/[subcategory]/[...page].astro` — filters items by both category and subcategory.

**Files:**
- Create: `app/src/pages/[collection]/[category]/[subcategory]/[...page].astro`

**Step 1: Create the route file**

```astro
---
import type { GetStaticPathsOptions } from "astro";
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
import CollectionGrid from "@components/CollectionGrid/CollectionGrid.astro";
import { getNavData } from "@lib/nav-data";
import { prettifySlug } from "@lib/format-utils";
import { COLLECTION_NAMES, collectionMeta, type CollectionName } from "@/content.config";
import { PAGE_SIZE } from "@lib/constants";
import type { CollectionPage, CollectionPageProps } from "@lib/collection-types";

export async function getStaticPaths({ paginate }: GetStaticPathsOptions) {
  const navData = await getNavData();
  const pages = COLLECTION_NAMES.flatMap((collection) => {
    const collectionData = navData[collection];
    if (!collectionData) return [];
    return Object.entries(collectionData.allSubcategories).flatMap(([category, subcategories]) =>
      subcategories.flatMap((subcategory) => {
        const filtered = collectionData.items.filter(
          (item) => item.category === category && item.subcategory === subcategory,
        );
        if (filtered.length === 0) return [];
        return paginate(filtered, {
          pageSize: PAGE_SIZE,
          params: { collection, category, subcategory },
          props: {
            title: collectionData.title,
            allCategories: collectionData.allCategories,
            allSubcategories: collectionData.allSubcategories,
          },
        });
      }),
    );
  });
  return pages;
}

const { collection, category, subcategory } = Astro.params as {
  collection: CollectionName;
  category: string;
  subcategory: string;
};
const page = Astro.props.page as CollectionPage;
const { title, allCategories, allSubcategories } = Astro.props as CollectionPageProps;
---

<BaseLayout
  title={`${prettifySlug(subcategory)} · ${prettifySlug(category)} · ${title} · thalida`}
  activeCollection={collection}
  description={`${prettifySlug(subcategory)} ${prettifySlug(category)} ${collectionMeta[collection].description.toLowerCase()}`}
>
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={collectionMeta[collection].description}
    itemCount={page.total}
    items={page.data}
    allCategories={allCategories}
    allSubcategories={allSubcategories}
    activeCategory={category}
    activeSubcategory={subcategory}
    prevUrl={page.url.prev}
    nextUrl={page.url.next}
    currentPage={page.currentPage}
    lastPage={page.lastPage}
  />
</BaseLayout>
```

**Step 2: Verify the build**

Run: `just app::build`
Expected: Build succeeds. New pages generated for subcategory routes.

**Step 3: Commit**

```bash
git add "app/src/pages/[collection]/[category]/[subcategory]/[...page].astro"
git commit -m "feat: add subcategory filter route"
```

---

### Task 8: Create `SubcategoryFilter` component

Shows subcategory chips below the category filter when a category is active and has subcategories.

**Files:**
- Create: `app/src/components/SubcategoryFilter/SubcategoryFilter.astro`
- Modify: `app/src/components/CollectionGrid/CollectionGrid.astro`

**Step 1: Create the component**

```astro
---
import { prettifySlug } from "@lib/format-utils";

interface Props {
  collection: string;
  category: string;
  subcategories: string[];
  activeSubcategory?: string;
}

const { collection, category, subcategories, activeSubcategory } = Astro.props;
---

{
  subcategories.length > 0 && (
    <div class="mb-6 -mt-3">
      <div class="flex flex-wrap gap-2">
        <a
          href={`/${collection}/${encodeURIComponent(category)}`}
          class:list={[
            "border font-body transition-colors no-underline capitalize text-xs rounded-sm py-1 px-3 tracking-wide",
            !activeSubcategory
              ? "bg-white/15 text-white! border-white"
              : "bg-transparent border-muted text-muted hover:bg-teal/20 hover:text-white hover:border-white/60",
          ]}
        >
          All
        </a>
        {subcategories.map((sub) => (
          <a
            href={`/${collection}/${encodeURIComponent(category)}/${encodeURIComponent(sub)}`}
            class:list={[
              "border font-body transition-colors no-underline capitalize text-xs rounded-sm py-1 px-3 tracking-wide",
              activeSubcategory === sub
                ? "bg-white/15 text-white! border-white"
                : "bg-transparent border-muted text-muted hover:bg-teal/20 hover:text-white hover:border-white/60",
            ]}
          >
            {prettifySlug(sub)}
          </a>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Wire it into `CollectionGrid`**

In `app/src/components/CollectionGrid/CollectionGrid.astro`, import and render the `SubcategoryFilter` below the `CategoryFilter`:

Add import:
```typescript
import SubcategoryFilter from "@components/SubcategoryFilter/SubcategoryFilter.astro";
```

After the `<CategoryFilter ... />` line, add:
```astro
{activeCategory && allSubcategories?.[activeCategory]?.length > 0 && (
  <SubcategoryFilter
    collection={collection}
    category={activeCategory}
    subcategories={allSubcategories[activeCategory]}
    activeSubcategory={activeSubcategory}
  />
)}
```

**Step 3: Verify the build and visual**

Run: `just app::serve`
Navigate to a collection with subcategories (e.g., `/plans/content`). Verify subcategory chips appear below the category filter.

**Step 4: Commit**

```bash
git add app/src/components/SubcategoryFilter/SubcategoryFilter.astro \
       app/src/components/CollectionGrid/CollectionGrid.astro
git commit -m "feat: add SubcategoryFilter component with CollectionGrid integration"
```

---

### Task 9: Update post page breadcrumb for subcategory links

Currently the subcategory in the breadcrumb is plain text. Make it a link to the subcategory filter page.

**Files:**
- Modify: `app/src/pages/[collection]/post/[...id].astro:197-204`

**Step 1: Update the subcategory breadcrumb**

In `app/src/pages/[collection]/post/[...id].astro`, the subcategory is derived from frontmatter. Now derive it from the entry ID using `parseContentPath`:

Add import at top of the frontmatter block:
```typescript
import { parseContentPath } from "@lib/content-path";
```

After line 33 (`const { entry } = Astro.props;`), add:
```typescript
const parsedPath = parseContentPath(entry.id);
```

Update the category/subcategory references in the breadcrumb (lines 187-204). Replace `entry.data.category` with `parsedPath.category ?? entry.data.category` and `entry.data.subcategory` with `parsedPath.subcategory`:

```astro
{
  (parsedPath.category ?? entry.data.category) && (
    <span>
      {" "}
      /{" "}
      <a class="text-teal no-underline hover:text-neon" href={`/${collection}/${parsedPath.category ?? entry.data.category}`}>
        {prettifySlug((parsedPath.category ?? entry.data.category)!)}
      </a>
    </span>
  )
}
{
  parsedPath.subcategory && (
    <span>
      {" "}
      /{" "}
      <a class="text-teal no-underline hover:text-neon" href={`/${collection}/${parsedPath.category}/${parsedPath.subcategory}`}>
        {prettifySlug(parsedPath.subcategory)}
      </a>
    </span>
  )
}
```

Also update the `recipeCategory` in the JSON-LD (line 83):
```typescript
// Replace:
recipeCategory: entry.data.category,
// With:
recipeCategory: parsedPath.category ?? entry.data.category,
```

And the pagefind meta (line 179):
```astro
<meta data-pagefind-meta={`category:${parsedPath.category ?? entry.data.category ?? ""}`} />
```

Add a subcategory pagefind meta tag after the category one:
```astro
<meta data-pagefind-meta={`subcategory:${parsedPath.subcategory ?? ""}`} />
```

**Step 2: Update related plans to use `parseContentPath`**

Replace the related plans logic (lines 37-47):

```typescript
// Before:
if (collection === "plans" && entry.data.subcategory) {
  const allPlans = await getCollection("plans", ({ data }) => !data.draft);
  relatedPlans = allPlans
    .filter((p) => p.data.subcategory === entry.data.subcategory && p.id !== entry.id)
    ...

// After:
if (parsedPath.subcategory) {
  const allSameCollection = await getCollection(collection as CollectionName, ({ data }) => !data.draft);
  relatedPlans = allSameCollection
    .filter((p) => {
      const pp = parseContentPath(p.id);
      return pp.subcategory === parsedPath.subcategory && p.id !== entry.id;
    })
    .map((p) => ({
      id: p.id,
      title: p.data.title,
      tags: p.data.tags,
    }));
}
```

Update the "Related plans" label to be more generic — "Related" instead of "Related plans":
```astro
<p class="m-0 mb-2 text-xs font-body font-semibold text-muted uppercase tracking-widest">Related</p>
```

**Step 3: Verify the build and visual**

Run: `just app::build`
Expected: Build succeeds. Breadcrumb subcategories are now links.

**Step 4: Commit**

```bash
git add "app/src/pages/[collection]/post/[...id].astro"
git commit -m "feat: link subcategory in breadcrumb, generalize related items"
```

---

### Task 10: Update `combineYamlFiles` for directory-structured links

The design spec calls for links to be restructured into subdirectories: `links/apps/apps.yaml`, `links/apps/productivity.yaml`, etc. This task updates `combineYamlFiles` to glob `**/*.yaml` and inject `category`/`subcategory` from the path.

**Files:**
- Modify: `app/src/content.config.ts:51-97`

**Step 1: Update `combineYamlFiles` to support subdirectories**

Update the glob pattern and inject category/subcategory:

```typescript
async function combineYamlFiles({ filename, pattern, base }: { filename: string; pattern: string; base: string }) {
  const yamlFiles = fs.glob(pattern, { cwd: base });
  const outputDir = `.generated`;
  const outputPath = `${outputDir}/${filename}`;

  await fs.mkdir(outputDir, { recursive: true });

  const seenIds = new Set<string>();
  const allEntries: Record<string, unknown>[] = [];

  for await (const entry of yamlFiles) {
    const content = await fs.readFile(`${base}/${entry}`, "utf-8");
    const parsed = parseYaml(content) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) continue;

    // Derive category from parent directory, subcategory from filename
    const segments = entry.split("/");
    let dirCategory: string | undefined;
    let dirSubcategory: string | undefined;

    if (segments.length >= 2) {
      // e.g., "apps/productivity.yaml" -> category=apps, subcategory=productivity
      dirCategory = segments[segments.length - 2];
      const fileName = segments[segments.length - 1].replace(/\.yaml$/, "");
      // If filename matches category (e.g., apps/apps.yaml), no subcategory
      dirSubcategory = fileName === dirCategory ? undefined : fileName;
    } else {
      // Flat file (e.g., "apps.yaml") — category from filename, no subcategory
      dirCategory = segments[0].replace(/\.yaml$/, "");
    }

    for (const item of parsed) {
      const id = String(item.id ?? "");
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      // Inject category/subcategory if not already set in the YAML entry
      if (dirCategory && !item.category) item.category = dirCategory;
      if (dirSubcategory && !item.subcategory) item.subcategory = dirSubcategory;
      allEntries.push(item);
    }
  }

  const newContent = stringifyYaml(allEntries);
  const existing = await fs.readFile(outputPath, "utf-8").catch(() => "");
  if (newContent !== existing) {
    await fs.writeFile(outputPath, newContent);
  }

  return file(outputPath);
}
```

Update the glob pattern in `makeCollection` (line 92):
```typescript
// Before:
pattern: "*.yaml",

// After:
pattern: "**/*.yaml",
```

**Step 2: Verify links still load**

Run: `just app::build`
Expected: Build succeeds. Links collection loads with categories derived from YAML file data (existing `category` fields in YAML entries take precedence over directory-derived ones).

**Step 3: Commit**

```bash
git add app/src/content.config.ts
git commit -m "feat: support directory-structured links with derived category/subcategory"
```

---

### Task 11: Run full test suite and verify build

**Step 1: Run all tests**

Run: `just test`
Expected: All tests pass.

**Step 2: Type-check**

Run: `just app::typecheck`
Expected: No type errors.

**Step 3: Build**

Run: `just app::build`
Expected: Clean build with no errors.

**Step 4: Smoke test**

Run: `just app::serve`
Manually verify:
- Collection index pages load (`/projects`, `/plans`, etc.)
- Category filter pages load (`/projects/education`, `/plans/content`)
- Subcategory filter pages load (if any subcategories exist, e.g., `/plans/content/subcategories`)
- Post pages load with correct breadcrumbs
- Subcategory chips appear when viewing a category that has subcategories
- Related items appear on posts with subcategories

**Step 5: Commit any fixes**

If any issues found, fix and commit individually.

---

### Task 12: Clean up migration script

The migration script was a one-time tool. Remove it or move it to a `scripts/` archive.

**Step 1: Remove the migration script**

```bash
git rm app/scripts/migrate-content-to-dirs.ts
git commit -m "chore: remove one-time content migration script"
```
