---
title: Subcategories & Filesystem-Driven Content Organization
description: Derive category and subcategory from the filesystem, co-locate
  images via page bundles, and add subcategory filtering.
publishedOn: 2026-03-09
tags:
  - design
---

## Problem

Categories and subcategories are manually managed via frontmatter strings with no validation, no enforced hierarchy, and no way to see organizational structure at a glance. Images live in sibling directories separate from their content files.

## Solution

Derive category and subcategory from the filesystem. Content files move into directory hierarchies that encode their organization. Images co-locate with their content via page bundles.

## Design

### Filesystem Structure

Every collection follows the same pattern:

```
content/[collection]/[category/[subcategory/]]slug/index.md
```

Posts are **page bundles** — a directory containing `index.md` plus any assets:

```
content/
  projects/
    education/                          # category
      advent-of-code/                   # post directory
        index.md
        aoc-2020.png                    # images alongside content
        aoc-2019.png
    craft/                              # category
      3dprint/                          # subcategory
        homer-bathroom/                 # post directory
          index.md
          cover.jpg
      sewing/
        pillow/
          index.md
    tool/
      ciphers-codes/
        index.md

  gallery/
    illustration/
      dream-room/
        index.md
        dream-room.jpg
    photography/
      travel/
        iceland/
          index.md
          iceland-01.jpg

  plans/
    content/
      plans-collection/
        2026-03-08-plans-collection/
          index.md

  recipes/
    seafood/
      bang-bang-shrimp/
        index.md

  links/
    apps/
      apps.yaml                         # category=apps, no subcategory
      productivity.yaml                 # category=apps, subcategory=productivity
    art/
      art.yaml

  guides/
    astro/
      getting-started/
        index.md

  versions/
    version-30/
      index.md
```

**Rules:**
- Posts with assets MUST use page bundles (`slug/index.md` + assets)
- Posts without assets MAY use bare files (`slug.md`) — both patterns coexist
- Depth determines meaning: 1 segment = slug only, 2 = category/slug, 3 = category/subcategory/slug
- The filesystem is the source of truth — no config file defines valid categories
- A subcategory always belongs to exactly one category
- A post has at most one subcategory

### Path Parsing

New utility at `app/src/lib/content-path.ts`:

```typescript
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

### Schema Changes

Remove `category` and `subcategory` from the Zod schema in `content.config.ts`. These fields are now derived from the entry ID via `parseContentPath`.

The `category` field in recipe JSON-LD (`recipeCategory`) will use the parsed category instead of `entry.data.category`.

### Glob Loader Changes

Update `content.config.ts`:

1. Add `generateId` to the glob loader to strip `/index` from entry IDs:
   ```typescript
   glob({
     pattern: "**/*.{md,mdx}",
     base,
     generateId: ({ entry }) => entry.replace(/\/index$/, ""),
   })
   ```

2. For links, update `combineYamlFiles` to glob `**/*.yaml` instead of `*.yaml`, and inject `category` (from parent directory name) and `subcategory` (from filename, omitted when filename matches category) into each YAML entry.

### Nav Data Changes

In `nav-data.ts`, replace frontmatter reads with path parsing:

```typescript
import { parseContentPath } from "./content-path";

// In getNavData(), replace:
//   const category = isDead ? "dead-links" : entry.data.category;
// With:
const parsed = parseContentPath(entry.id);
const category = isDead ? "dead-links" : parsed.category;

// And for subcategory:
//   subcategory: entry.data.subcategory,
// With:
subcategory: parsed.subcategory,
```

Add `allSubcategories` to `NavCollection`:

```typescript
export type NavCollection = {
  name: string;
  title: string;
  items: NavItem[];
  allCategories: string[];
  allSubcategories: Record<string, string[]>; // category -> subcategory[]
};
```

### URL Structure

| URL | Purpose | Route File |
|---|---|---|
| `/projects` | Collection index | `[collection]/[...page].astro` |
| `/projects/2` | Collection page 2 | `[collection]/[...page].astro` |
| `/projects/education` | Category filter | `[collection]/[category]/[...page].astro` |
| `/projects/education/2` | Category page 2 | `[collection]/[category]/[...page].astro` |
| `/projects/craft/3dprint` | Subcategory filter | `[collection]/[category]/[subcategory]/[...page].astro` (NEW) |
| `/projects/craft/3dprint/2` | Subcategory page 2 | same |
| `/projects/post/education/advent-of-code` | Post | `[collection]/post/[...id].astro` (unchanged) |
| `/projects/post/craft/3dprint/homer-bathroom` | Post with subcategory | same |

**Routing changes:**
- `post/[...id].astro` — unchanged, the catch-all handles longer IDs naturally
- `[category]/[...page].astro` — unchanged
- `[category]/[subcategory]/[...page].astro` — **new file**, same pattern as category filter but filters by both category and subcategory

### Subcategory Filter UI

When a category is active on a collection page, show subcategory filter chips below the category filters. Subcategory chips link to `/[collection]/[category]/[subcategory]`.

The existing `CategoryFilter` component gets extended (or a new `SubcategoryFilter` component is created) to render subcategory chips when `activeCategory` is set and subcategories exist for that category.

### Related Items

Generalize the current "related plans" feature (which finds posts with the same subcategory) to work across all collections. On any post page, if the post has a subcategory, show related items from the same collection + subcategory.

### Links Collection

Update `combineYamlFiles`:
- Change glob from `*.yaml` to `**/*.yaml`
- For each YAML file, derive category from its parent directory and subcategory from its filename
- If filename matches the parent directory name (e.g., `apps/apps.yaml`), omit subcategory
- Inject `category` and `subcategory` fields into each entry before merging

### Component Updates

- **Post page breadcrumb** — subcategory becomes a link to its filter page: `/{collection}/{category}/{subcategory}`
- **CompactCard** — already displays category/subcategory, no change needed (reads from NavItem)
- **Card link hrefs** — update to use full entry ID path: `/{collection}/post/{id}` (IDs now include category/subcategory)
- **CollectionGrid** — pass `allSubcategories` and `activeSubcategory` props
- **Pagefind meta** — update `category` and add `subcategory` meta tags from parsed path

### Migration

A migration script will:
1. For each markdown collection: read frontmatter `category` and `subcategory`, create target directories, move the `.md` file and any sibling asset directory into a page bundle (`slug/index.md` + assets), remove `category`/`subcategory` from frontmatter
2. For links: restructure flat YAML files into category directories
3. For posts without categories: leave at collection root (bare file or page bundle)

### What This Does NOT Change

- Collection definitions in `content.config.ts` (same 7 collections)
- `collectionMeta` configuration
- Card variant assignments
- Tag system (tags remain in frontmatter)
- Recipe-specific fields (remain in frontmatter)
- Dead-links override logic (still applied in nav-data)
