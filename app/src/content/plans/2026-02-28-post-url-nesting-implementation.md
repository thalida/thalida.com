---
title: Post URL Nesting + Tags on Post Pages — Implementation Plan
description: >-
  Nest post pages under `/{collection}/post/{id}` to avoid collision with
  category routes, and display tags on post pages.
publishedOn: 2026-02-28T08:06:34.000Z
planType: implementation
topic: post-url-nesting
status: completed
category: content
---

# Post URL Nesting + Tags on Post Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Nest post pages under `/{collection}/post/{id}` to avoid collision with category routes, and display tags on post pages.

**Architecture:** Move the `[...id].astro` page into a `post/` subdirectory, update all href generation to include `/post/`, add a redirect index page for bare `/post/` URLs, and import `CardTags` into the post template.

**Tech Stack:** Astro file-based routing, existing CardTags component

---

### Task 1: Move the post page route

**Files:**
- Move: `app/src/pages/[collection]/[...id].astro` → `app/src/pages/[collection]/post/[...id].astro`

**Step 1: Create the post directory and move the file**

```bash
mkdir -p app/src/pages/\[collection\]/post
git mv app/src/pages/\[collection\]/\[...id\].astro app/src/pages/\[collection\]/post/\[...id\].astro
```

**Step 2: Verify the file is in the right place**

```bash
ls app/src/pages/\[collection\]/post/
```

Expected: `[...id].astro`

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor: move post page route under /post/ prefix"
```

---

### Task 2: Add redirect for bare /collection/post/

**Files:**
- Create: `app/src/pages/[collection]/post/index.astro`

**Step 1: Create the redirect page**

Create `app/src/pages/[collection]/post/index.astro` with this content:

```astro
---
import { COLLECTION_NAMES } from "../../../content.config";

export function getStaticPaths() {
  return COLLECTION_NAMES.map((name) => ({
    params: { collection: name },
  }));
}

const { collection } = Astro.params;
return Astro.redirect(`/${collection}/`);
---
```

**Step 2: Commit**

```bash
git add app/src/pages/\[collection\]/post/index.astro
git commit -m "feat: redirect bare /collection/post/ to collection index"
```

---

### Task 3: Update post href in StackedCard

**Files:**
- Modify: `app/src/components/Card/StackedCard.astro:14`

**Step 1: Update the href**

Change line 14 from:
```typescript
const href = `/${item.collection}/${item.id}`;
```
to:
```typescript
const href = `/${item.collection}/post/${item.id}`;
```

**Step 2: Commit**

```bash
git add app/src/components/Card/StackedCard.astro
git commit -m "fix: update StackedCard post href to nested route"
```

---

### Task 4: Update post href in FlagCard

**Files:**
- Modify: `app/src/components/Card/FlagCard.astro:13`

**Step 1: Update the href**

Change line 13 from:
```typescript
const href = `/${item.collection}/${item.id}`;
```
to:
```typescript
const href = `/${item.collection}/post/${item.id}`;
```

**Step 2: Commit**

```bash
git add app/src/components/Card/FlagCard.astro
git commit -m "fix: update FlagCard post href to nested route"
```

---

### Task 5: Update post href in GalleryCard

**Files:**
- Modify: `app/src/components/Card/GalleryCard.astro:14`

**Step 1: Update the href**

Change line 14 from:
```typescript
const href = `/${item.collection}/${item.id}`;
```
to:
```typescript
const href = `/${item.collection}/post/${item.id}`;
```

**Step 2: Commit**

```bash
git add app/src/components/Card/GalleryCard.astro
git commit -m "fix: update GalleryCard post href to nested route"
```

---

### Task 6: Update post href in CommandPalette

**Files:**
- Modify: `app/src/components/CommandPalette/CommandPalette.ts:173`

**Step 1: Update the href**

Change line 173 from:
```typescript
const href = isExternal ? item.id : `/${item.collection}/${item.id}`;
```
to:
```typescript
const href = isExternal ? item.id : `/${item.collection}/post/${item.id}`;
```

**Step 2: Commit**

```bash
git add app/src/components/CommandPalette/CommandPalette.ts
git commit -m "fix: update CommandPalette post href to nested route"
```

---

### Task 7: Display tags on post pages

**Files:**
- Modify: `app/src/pages/[collection]/post/[...id].astro`

**Step 1: Add CardTags import**

Add to the frontmatter imports (after the existing imports):
```typescript
import CardTags from "@components/Card/CardTags.astro";
```

**Step 2: Add CardTags to the metadata area**

In the `<div class="flex flex-wrap items-center gap-3">` block (around line 80), after the `<time>` element and before the closing `</div>`, add:

```astro
<CardTags tags={entry.data.tags} max={Infinity} />
```

**Step 3: Commit**

```bash
git add app/src/pages/\[collection\]/post/\[...id\].astro
git commit -m "feat: display tags on post pages using CardTags component"
```

---

### Task 8: Build verification

**Step 1: Run the build**

```bash
just app::build
```

Expected: Build succeeds with no errors.

**Step 2: Spot-check generated routes**

```bash
ls app/dist/projects/post/ | head -5
ls app/dist/projects/ | grep -v post | head -5
```

Expected: Post pages appear under `post/` subdirectory. Category pages remain at collection level.

**Step 3: Verify redirect page exists**

```bash
cat app/dist/projects/post/index.html
```

Expected: Contains a redirect or meta-refresh to `/projects/`.
