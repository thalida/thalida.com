# Plans Collection: Surface Claude Plans as Site Content

## Problem

93 planning documents live in `docs/plans/` — design docs and implementation plans for features built on thalida.com. They're invisible to site visitors and can't be browsed, searched, or linked to. Moving them into the site's content collection system makes them a browsable archive of how the site was built.

## Solution

Add `"plans"` as a new Astro content collection. Files move from `docs/plans/` to `src/content/plans/` with frontmatter added. Plans are grouped by topic on the collection list page, and related plans (design + implementation) are linked automatically via a shared `topic` field.

## Schema

Each plan file gets this frontmatter:

```yaml
---
title: "Sidebar Redesign"
description: "Two-level navigation sidebar with command palette"
publishedOn: 2026-02-20
planType: "design"        # "design" | "implementation"
topic: "sidebar-redesign" # shared slug — all plans with same topic are related
status: "completed"       # "planned" | "in-progress" | "completed"
tags: ["navigation", "ui"]
---
```

**Relationships are derived, not declared.** Plans sharing the same `topic` value are automatically grouped and cross-linked at build time. No `relatedPlans` array to maintain.

**Plan type detection:** Files ending in `-design.md` → `"design"`, everything else → `"implementation"`.

## Collection List Page (`/plans`)

Topic-grouped layout instead of a flat card grid. Each topic is a visual cluster:

```
Plans
Claude's design docs and implementation plans for thalida.com
93 items · 50 topics

[ category filter: all | navigation | ui | performance | ... ]

┌─────────────────────────────────────────────────┐
│ sidebar-redesign                     Feb 2026   │
│                                                 │
│  📐 Design    Two-level navigation sidebar...   │
│  🔧 Implementation   Replace file-tree with...  │
│                                                 │
│ Status: completed                               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ neon-cursor                          Feb 2026   │
│                                                 │
│  📐 Design    Custom neon cursor effect...      │
│  🔧 Implementation   Add cursor glow to...     │
│                                                 │
│ Status: completed                               │
└─────────────────────────────────────────────────┘
```

- Topics sorted by most recent plan date (newest topic first)
- Within each topic group, design doc listed before implementation plan
- Each row within the group links to the individual plan post page
- Category filter uses `tags` (topics are the primary grouping, tags enable cross-cutting filters)
- Status badge on each topic group (derived from the most recent plan's status in that group)
- The topic heading is not a link — the individual plan type rows are

**New card variant:** `"plan"` — plans use a custom `PlanGrid.astro` component instead of the standard `CollectionGrid`.

## Individual Plan Post Page (`/plans/post/[id]`)

Renders the plan markdown as-is with a header showing metadata and related plans:

```
plans / sidebar-redesign                    · February 20, 2026

Sidebar Redesign
Two-level navigation sidebar with command palette

Type: Design · Status: Completed

Related plans:
  🔧 Sidebar Redesign Implementation Plan  →

─────────────────────────────────────────

[markdown body renders here]
```

- Breadcrumb: `plans` links to collection list, topic slug filters to that topic
- Plan type and status shown as metadata badges
- "Related plans" lists all other plans sharing the same `topic`, linking to their post pages
- Hidden when only one plan exists for the topic
- Markdown body renders exactly as written — code blocks, task lists, headings all work via existing prose styling

## Migration

One-time script to move existing files:

1. Read each file in `docs/plans/`
2. Parse filename → `publishedOn` (date prefix), `topic` (stem minus date and `-design`/`-implementation` suffix), `planType`
3. Extract `title` from first `# heading` in the file
4. Extract `description` from first paragraph after the heading
5. Set `status: "completed"` for all existing plans
6. Inject frontmatter and write to `src/content/plans/`
7. Remove `docs/plans/` after migration

## Content Config Changes

- Add `"plans"` to `COLLECTION_NAMES`
- Add `"plan"` to `CardVariant` type
- Add plan-specific optional schema fields: `planType` (z.enum), `topic` (z.string), `status` (z.enum)
- Add `collectionMeta` entry: `{ title: "Plans", description: "Claude's design docs and implementation plans for thalida.com.", cardVariant: "plan" }`

## New Components

- `PlanGrid.astro` — groups NavItems by topic, renders the topic-grouped layout
- `PlanCard.astro` — a single topic group card with nested plan type rows

## Modified Files

- `app/src/content.config.ts` — new collection, schema fields, card variant
- `app/src/lib/nav-data.ts` — plans included in nav data
- `app/src/pages/[collection]/[...page].astro` — route plans through `PlanGrid` instead of `CollectionGrid`
- `app/src/pages/[collection]/post/[...id].astro` — add related plans section for plan posts

## Brainstorming Skill Update

The brainstorming skill (`superpowers:brainstorming`) currently writes plan files to `docs/plans/`. After this change:

1. **Output path** changes from `docs/plans/` to `src/content/plans/`
2. **New frontmatter fields** must be included when writing plan files: `title`, `description`, `publishedOn`, `planType`, `topic`, `status`, and `tags`

The skill already uses the `YYYY-MM-DD-<topic>-design.md` naming convention, so `topic` and `planType` are naturally derivable. The skill just needs to write the frontmatter block at the top of each file.
