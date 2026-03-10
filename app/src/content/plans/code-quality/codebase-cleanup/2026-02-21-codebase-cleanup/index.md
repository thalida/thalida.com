---
title: Codebase Cleanup Implementation Plan
description: Fix all naming inconsistencies, dead code, duplicate logic, bugs,
  and type safety issues identified in the February 2026 audit, resulting in a
  codebase where names reflect current reality and each piece of logic lives in
  exactly one place.
publishedOn: 2026-02-21T06:35:15.000Z
tags:
  - implementation
---

# Codebase Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all naming inconsistencies, dead code, duplicate logic, bugs, and type safety issues identified in the February 2026 audit, resulting in a codebase where names reflect current reality and each piece of logic lives in exactly one place.

**Architecture:** Six phases ordered by blast radius — API-only changes first, then app constants/dead code, then the `sidebar→nav` rename (touches the most files), then extracting the shared `CollectionGrid` component, then bug fixes, then minor constants cleanup. Each task ends with a commit so progress is always in a releasable state.

**Tech Stack:** Astro 5, TypeScript, Cloudflare Workers (Durable Objects), Vitest

---


## Verification commands

```bash
# API tests
just api::test

# App tests
just app::test

# App build (also type-checks all Astro files)
just app::build
```

Run these after every phase. A passing build + test suite is the definition of "done" for each phase.

---


## Phase 1 — API type safety and config


### Task 1: Fix `Env` type and `env` typing in `ChatRoom`

**Problem:** `ConnectionInfo` is already fixed. But `chat-room.ts` types `env` as `Record<string, unknown>`, losing all type safety and forcing casts throughout. `OPENAI_API_KEY` is declared required in `Env` but guarded at runtime as optional.

**Files:**

- Modify: `api/src/types.ts`
- Modify: `api/src/chat-room.ts`

**Step 1: Update `Env` to mark `OPENAI_API_KEY` as optional**

In `api/src/types.ts`, change line 145:

```typescript
// before
OPENAI_API_KEY: string;

// after
OPENAI_API_KEY?: string;
```

**Step 2: Type `env` as `Env` in `ChatRoom`**

In `api/src/chat-room.ts`, change the constructor:

```typescript
// before
constructor(
  private state: DurableObjectState,
  private env: Record<string, unknown>,
) {}

// after
constructor(
  private state: DurableObjectState,
  private env: Env,
) {}
```

**Step 3: Remove the unnecessary cast in `moderate()`**

In `api/src/chat-room.ts`, line ~265:

```typescript
// before
const apiKey = this.env.OPENAI_API_KEY as string | undefined;

// after
const apiKey = this.env.OPENAI_API_KEY;
```

**Step 4: Run API tests**

```bash
just api::test
```

Expected: all passing.

**Step 5: Commit**

```bash
git add api/src/types.ts api/src/chat-room.ts
git commit -m "fix: type env as Env in ChatRoom, make OPENAI_API_KEY optional"
```

---


### Task 2: Move magic numbers to `config.ts`

**Problem:** `MAX_MESSAGES` and `MAX_WARNINGS` are in `config.ts` but the message length cap (500), username min/max (2, 20), and reconnect delay (3000 ms on client) are hardcoded inline.

**Files:**

- Modify: `api/src/config.ts`
- Modify: `api/src/chat-room.ts`

**Step 1: Add constants to `api/src/config.ts`**

```typescript
export const MAX_MESSAGES = 50;
export const MAX_WARNINGS = 3;
export const ADMIN_USERNAME = "thalida";
export const RESERVATION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_MESSAGE_LENGTH = 500;
export const MIN_USERNAME_LENGTH = 2;
export const MAX_USERNAME_LENGTH = 20;
```

**Step 2: Use them in `api/src/chat-room.ts`**

Update the import at the top:

```typescript
import { ADMIN_USERNAME, MAX_MESSAGES, MAX_WARNINGS, RESERVATION_DURATION_MS, MAX_MESSAGE_LENGTH, MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH } from "./config";
```

Replace the username validation regex (line ~149):

```typescript
// before
if (!/^[a-z0-9_\-.]{2,20}$/.test(name)) {
  this.sendError(
    ws,
    SERVER_ERROR_CODE.INVALID_USERNAME,
    "Username must be 2-20 characters: lowercase letters, numbers, hyphens, underscores, or dots.",
  );
  return;
}

// after
const usernamePattern = new RegExp(`^[a-z0-9_\\-.]{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`);
if (!usernamePattern.test(name)) {
  this.sendError(
    ws,
    SERVER_ERROR_CODE.INVALID_USERNAME,
    `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters: lowercase letters, numbers, hyphens, underscores, or dots.`,
  );
  return;
}
```

Replace the message length slice (line ~218):

```typescript
// before
.slice(0, 500);

// after
.slice(0, MAX_MESSAGE_LENGTH);
```

**Step 3: Run API tests**

```bash
just api::test
```

Expected: all passing.

**Step 4: Commit**

```bash
git add api/src/config.ts api/src/chat-room.ts
git commit -m "refactor: move message/username length limits to config constants"
```

---


### Task 3: Fix broken API tests and misleading test description

**Problem 1:** `index.test.ts` asserts `{ ok: true }` and `{ ok: false }` but `handleAuth` returns `{}` (empty body). `handleHealthCheck` also returns `{}`.

**Problem 2:** `chat-room.test.ts` describes `'tia'` as a reserved word when the actual reserved word is `'thalida'` (and `'tia'` only matches because it's a substring).

**Files:**

- Modify: `api/src/__tests__/index.test.ts`
- Modify: `api/src/__tests__/chat-room.test.ts`

**Step 1: Fix the health check assertion in `index.test.ts` line 11**

```typescript
// before
expect(await resp.json()).toEqual({ ok: true });

// after
expect(await resp.json()).toEqual({});
```

**Step 2: Fix the auth success assertion in `index.test.ts` line 25**

```typescript
// before
expect(body).toEqual({ ok: true });

// after
expect(body).toEqual({});
```

**Step 3: Fix the auth failure assertion in `index.test.ts` line 49**

```typescript
// before
expect(body).toEqual({ ok: false });

// after
expect(body).toEqual({});
```

**Step 4: Fix the misleading test description in `chat-room.test.ts` line ~386**

Find the test with description `reserved word 'tia' as substring in username returns error` and update it:

```typescript
// before
it("reserved word 'tia' as substring in username returns error", ...

// after
it("username containing the admin name as substring returns error", ...
```

**Step 5: Run API tests to confirm all pass**

```bash
just api::test
```

Expected: all passing (previously some assertions were wrong).

**Step 6: Commit**

```bash
git add api/src/__tests__/index.test.ts api/src/__tests__/chat-room.test.ts
git commit -m "fix: correct api test assertions and misleading test description"
```

---


## Phase 2 — App: constants and dead code


### Task 4: Extract `LS_ADMIN_TOKEN_KEY` constant

**Problem:** The raw string `"admin_token"` is hardcoded in three files (`chat-client.ts`, `login.astro`, `logout.astro`). Change in one place won't propagate.

`logout.astro` uses `is:inline` and `login.astro` uses `is:inline define:vars` — neither can import a module. The right fix is to move the constant into `chat-utils.ts` (which `chat-client.ts` already imports) and use `define:vars` in the two pages.

**Files:**

- Modify: `app/src/scripts/chat-utils.ts`
- Modify: `app/src/scripts/chat-client.ts`
- Modify: `app/src/pages/login.astro`
- Modify: `app/src/pages/logout.astro`

**Step 1: Add the constant to `chat-utils.ts`**

At the top of `app/src/scripts/chat-utils.ts`, add:

```typescript
export const LS_ADMIN_TOKEN_KEY = "admin_token";
```

**Step 2: Use it in `chat-client.ts`**

Update the import:

```typescript
import { generateRandomUsername, validateUsername, setAdminUsername, LS_ADMIN_TOKEN_KEY } from "./chat-utils";
```

Replace `localStorage.getItem("admin_token")` in `getAdminToken()`:

```typescript
function getAdminToken(): string | null {
  return localStorage.getItem(LS_ADMIN_TOKEN_KEY);
}
```

**Step 3: Use it in `login.astro`**

In the frontmatter, expose the constant via `define:vars`:

```astro
---
const wsUrl = import.meta.env.PUBLIC_CHAT_WS_URL || "ws://localhost:8787/ws";
const apiBase = wsUrl.replace(/^ws(s?):/, "http$1:").replace(/\/ws$/, "");
const LS_ADMIN_TOKEN_KEY = "admin_token";
---
```

Update the `<script is:inline define:vars={{ apiBase, LS_ADMIN_TOKEN_KEY }}>` tag and replace the hardcoded string:

```typescript
localStorage.setItem(LS_ADMIN_TOKEN_KEY, secret);
```

**Step 4: Use it in `logout.astro`**

```astro
---
const LS_ADMIN_TOKEN_KEY = "admin_token";
---
```

Update the `<script is:inline define:vars={{ LS_ADMIN_TOKEN_KEY }}>` and replace:

```typescript
localStorage.removeItem(LS_ADMIN_TOKEN_KEY);
```

**Step 5: Build to confirm no TypeScript errors**

```bash
just app::build
```

**Step 6: Commit**

```bash
git add app/src/scripts/chat-utils.ts app/src/scripts/chat-client.ts app/src/pages/login.astro app/src/pages/logout.astro
git commit -m "refactor: extract LS_ADMIN_TOKEN_KEY constant, remove hardcoded admin_token strings"
```

---


### Task 5: Use `COLLECTION_NAMES` in collection pages

**Problem:** Both `index.astro` and `[category].astro` hardcode `["projects", "guides", "gallery", "links", "recipes", "versions"]` in `getStaticPaths()`. `COLLECTION_NAMES` already exists in `content.config.ts` and is the canonical source.

**Files:**

- Modify: `app/src/pages/[collection]/index.astro`
- Modify: `app/src/pages/[collection]/[category].astro`

**Step 1: Update `index.astro`**

The `getStaticPaths()` block:

```typescript
// before
import { type CollectionName } from "../../content.config";
export async function getStaticPaths() {
  const collections: CollectionName[] = ["projects", "guides", "gallery", "links", "recipes", "versions"];
  return collections.map((collection) => ({
    params: { collection },
  }));
}

// after
import { COLLECTION_NAMES, type CollectionName } from "../../content.config";
export async function getStaticPaths() {
  return COLLECTION_NAMES.map((collection) => ({
    params: { collection },
  }));
}
```

**Step 2: Update `[category].astro`**

```typescript
// before
import { type CollectionName } from "../../content.config";
export async function getStaticPaths() {
  const collections: CollectionName[] = ["projects", "guides", "gallery", "links", "recipes", "versions"];
  ...

// after
import { COLLECTION_NAMES, type CollectionName } from "../../content.config";
export async function getStaticPaths() {
  ...
  for (const collection of COLLECTION_NAMES) {
```

**Step 3: Build**

```bash
just app::build
```

**Step 4: Commit**

```bash
git add "app/src/pages/[collection]/index.astro" "app/src/pages/[collection]/[category].astro"
git commit -m "refactor: use COLLECTION_NAMES constant instead of hardcoded arrays in collection pages"
```

---


### Task 6: Remove dead `activeId` prop

**Problem:** `ProjectTree` accepts `activeId` as a prop, immediately aliases it to `_activeId`, and never uses it. `BaseLayout` passes `activeId={activeId}` through but does nothing with it either.

**Files:**

- Modify: `app/src/components/ProjectTree.astro`
- Modify: `app/src/layouts/BaseLayout.astro`

**Step 1: Remove from `ProjectTree.astro`**

```typescript
// before
interface Props {
  activePage?: string;
  activeCollection?: string;
  activeId?: string;
}
const { activePage, activeCollection, activeId: _activeId } = Astro.props;

// after
interface Props {
  activePage?: string;
  activeCollection?: string;
}
const { activePage, activeCollection } = Astro.props;
```

**Step 2: Remove from `BaseLayout.astro`**

```typescript
// before
interface Props {
  title?: string;
  activePage?: string;
  activeCollection?: string;
  activeId?: string;
  ...
}
const { title = "thalida", activePage, activeCollection, activeId, pageContext = null } = Astro.props;

// after
interface Props {
  title?: string;
  activePage?: string;
  activeCollection?: string;
  ...
}
const { title = "thalida", activePage, activeCollection, pageContext = null } = Astro.props;
```

Also remove `activeId={activeId}` from the `<ProjectTree .../>` call in `BaseLayout.astro`.

**Step 3: Build**

```bash
just app::build
```

**Step 4: Commit**

```bash
git add app/src/components/ProjectTree.astro app/src/layouts/BaseLayout.astro
git commit -m "refactor: remove unused activeId prop from ProjectTree and BaseLayout"
```

---


### Task 7: Remove dead `item-card--link` CSS modifier

**Problem:** The class `item-card--link` is applied to link cards in both collection pages but no CSS rule targets it. It's a no-op.

**Files:**

- Modify: `app/src/pages/[collection]/index.astro`
- Modify: `app/src/pages/[collection]/[category].astro`

**Step 1: Remove the class from both files**

In `index.astro` (~line 63):

```astro
// before
<a href={href} class="item-card item-card--link" target="_blank" rel="noopener">

// after
<a href={href} class="item-card" target="_blank" rel="noopener">
```

Same change in `[category].astro` (~line 84).

**Step 2: Build**

```bash
just app::build
```

**Step 3: Commit**

```bash
git add "app/src/pages/[collection]/index.astro" "app/src/pages/[collection]/[category].astro"
git commit -m "refactor: remove dead item-card--link CSS class"
```

---


## Phase 3 — The sidebar → nav rename

This is the most far-reaching change. Do it in two commits: data layer first, then component internals.


### Task 8: Rename `sidebar-data.ts` → `nav-data.ts` and all its exports

**Rename map:**

| Old | New |
|-----|-----|
| `sidebar-data.ts` | `nav-data.ts` |
| `SidebarItem` | `NavItem` |
| `SidebarCollection` | `NavCollection` |
| `SidebarEntry` | `NavEntry` |
| `SIDEBAR_ORDER` | `NAV_ORDER` |
| `getSidebarData()` | `getNavData()` |

**Files touched:**

- Rename + modify: `app/src/lib/sidebar-data.ts` → `app/src/lib/nav-data.ts`
- Modify: `app/src/components/ProjectTree.astro`
- Modify: `app/src/components/CommandPalette.astro`
- Modify: `app/src/pages/[collection]/index.astro`
- Modify: `app/src/pages/[collection]/[category].astro`
- Modify: `app/src/pages/[collection]/[...id].astro`
- Modify: `app/src/pages/about.astro` (if it imports from sidebar-data)
- Search for any other imports: `grep -r "sidebar-data" app/src/`

**Step 1: Rename the file and update its exports**

Create `app/src/lib/nav-data.ts` with:

- `SidebarItem` → `NavItem`
- `SidebarCollection` → `NavCollection`
- `SidebarEntry` → `NavEntry`
- `SIDEBAR_ORDER` → `NAV_ORDER`
- `getSidebarData()` → `getNavData()`
- Delete `app/src/lib/sidebar-data.ts`

**Step 2: Find all import sites**

```bash
grep -r "sidebar-data\|SidebarItem\|SidebarCollection\|SidebarEntry\|SIDEBAR_ORDER\|getSidebarData" app/src/ --include="*.astro" --include="*.ts" -l
```

**Step 3: Update each import site** — replace old names with new names.

Example for `ProjectTree.astro`:

```typescript
// before
import { SIDEBAR_ORDER } from "../lib/sidebar-data";
import { getSidebarData } from "../lib/sidebar-data";

// after
import { NAV_ORDER, getNavData } from "../lib/nav-data";
```

And in the component body: `SIDEBAR_ORDER` → `NAV_ORDER`, `getSidebarData()` → `getNavData()`, `sidebarData` local variable → `navData`.

**Step 4: Build (this is the integration test)**

```bash
just app::build
```

Expected: clean build, no type errors.

**Step 5: Commit**

```bash
git add app/src/lib/ app/src/components/ "app/src/pages/"
git commit -m "refactor: rename sidebar-data → nav-data and all sidebar exports to nav equivalents"
```

---


### Task 9: Rename `id="project-tree"` → `id="site-nav"` and all `sidebar-*` CSS classes

**Problem:** The nav element is called `project-tree` everywhere in HTML, CSS, and JS. Its internal CSS classes are all prefixed `sidebar-*`.

**Rename map (HTML/CSS/JS):**

| Old | New |
|-----|-----|
| `id="project-tree"` | `id="site-nav"` |
| `#project-tree` (CSS selector) | `#site-nav` |
| `getElementById("project-tree")` | `getElementById("site-nav")` |
| `projectTree` (JS variable) | `siteNav` |
| `initSidebar()` (function) | `initNav()` |
| `.sidebar-heading-link` | `.nav-heading-link` |
| `.sidebar-search-trigger` | `.nav-search-trigger` |
| `.sidebar-search-shortcut` | `.nav-search-shortcut` |
| `#sidebar-search-btn` | `#nav-search-btn` |
| `.sidebar-nav` | `.nav-list` |
| `.sidebar-row` | `.nav-row` |
| `.sidebar-row--page` | `.nav-row--page` |
| `.sidebar-row--collection` | `.nav-row--collection` |
| `.sidebar-row__label` | `.nav-row__label` |
| `.sidebar-row__count` | `.nav-row__count` |

**Files:**

- Modify: `app/src/components/ProjectTree.astro` (HTML + `<script>` + `<style>`)
- Modify: `app/src/layouts/BaseLayout.astro` (CSS selectors + JS `getElementById`)

**Step 1: Update `ProjectTree.astro`**

Apply all the renames above to the `<nav>`, `<script>`, and `<style>` blocks.

**Step 2: Update `BaseLayout.astro`**

Find all references to `project-tree` in the `<style is:global>` and `<script>` blocks and apply renames:

```typescript
// JS: before
const projectTree = document.getElementById("project-tree")!;
...
projectTree.classList.remove("open");
projectTree.classList.contains("open")
projectTree.classList.add("open");

// JS: after
const siteNav = document.getElementById("site-nav")!;
...
siteNav.classList.remove("open");
siteNav.classList.contains("open")
siteNav.classList.add("open");
```

```typescript
// scroll preservation: before
const tree = document.getElementById("project-tree");
if (tree) savedTreeScroll = tree.scrollTop;
...
if (tree) tree.scrollTop = savedTreeScroll;

// after
const nav = document.getElementById("site-nav");
if (nav) savedNavScroll = nav.scrollTop;
...
if (nav) nav.scrollTop = savedNavScroll;
```

CSS selectors: replace all `#project-tree` with `#site-nav`.

**Step 3: Check for any other references**

```bash
grep -r "project-tree\|sidebar-row\|sidebar-nav\|sidebar-heading\|sidebar-search\|initSidebar\|sidebar-search-btn" app/src/ --include="*.astro" --include="*.ts"
```

Expected: no results.

**Step 4: Build**

```bash
just app::build
```

**Step 5: Commit**

```bash
git add app/src/components/ProjectTree.astro app/src/layouts/BaseLayout.astro
git commit -m "refactor: rename project-tree → site-nav and sidebar-* CSS classes → nav-*"
```

---


## Phase 4 — Extract `CollectionGrid` component


### Task 10: Create `CollectionGrid.astro`

**Problem:** `index.astro` and `[category].astro` have identical HTML card templates and identical `<style>` blocks (~200 lines each). Any card UI change requires editing two files.

**File to create:** `app/src/components/CollectionGrid.astro`

**Step 1: Determine the component interface**

```typescript
interface Props {
  collection: string;       // e.g. "projects" — used to build hrefs
  title: string;            // collection display name
  subtitle: string;         // e.g. "42 items" or "7 Mac apps items"
  items: NavItem[];         // already filtered if needed
  allCategories: string[];  // for filter chips
  activeCategory?: string;  // undefined = "All" is active
}
```

**Step 2: Write `CollectionGrid.astro`**

Move the entire `<div class="collection-page">` template from `index.astro` into this component, parameterizing what differs:

```astro
---
import { formatDate, categoryDisplay, type NavItem } from "../lib/nav-data";

interface Props {
  collection: string;
  title: string;
  subtitle: string;
  items: NavItem[];
  allCategories: string[];
  activeCategory?: string;
}

const { collection, title, subtitle, items, allCategories, activeCategory } = Astro.props;
---

<div class="collection-page">
  <header class="collection-header">
    <h1>{title}</h1>
    <p class="collection-count">{subtitle}</p>
  </header>

  {
    allCategories.length > 0 && (
      <div class="filter-section">
        <div class="filter-chips">
          <a
            href={`/${collection}`}
            class:list={["filter-chip", { "filter-chip--active": !activeCategory }]}
          >
            All
          </a>
          {allCategories.map((cat) => (
            <a
              href={`/${collection}/${encodeURIComponent(cat)}`}
              class:list={["filter-chip", { "filter-chip--active": activeCategory === cat }]}
            >
              {categoryDisplay(cat)}
            </a>
          ))}
        </div>
      </div>
    )
  }

  <div class="items-grid">
    {
      items.map((item) => {
        const isExternal = item.collection === "links";
        const href = isExternal ? item.id : `/${item.collection}/${item.id}`;
        if (isExternal) {
          const displayUrl = (() => {
            try {
              return new URL(item.id).hostname.replace(/^www\./, "");
            } catch {
              return item.id;
            }
          })();
          return (
            <a href={href} class="item-card" target="_blank" rel="noopener">
              <div class="item-card__body">
                <div class="item-card__link-title">
                  {item.faviconUrl && (
                    <img
                      class="item-card__favicon"
                      src={item.faviconUrl}
                      alt=""
                      width="16"
                      height="16"
                      loading="lazy"
                    />
                  )}
                  <h3 class="item-card__title">{item.title}</h3>
                </div>
                <p class="item-card__url">{displayUrl}</p>
                {item.metaDescription && <p class="item-card__description">{item.metaDescription}</p>}
              </div>
            </a>
          );
        }
        return (
          <a href={href} class="item-card">
            {item.coverImageSrc ? (
              <div class="item-card__image-wrapper">
                <img
                  class="item-card__image"
                  src={item.coverImageSrc}
                  alt={item.coverImageAlt ?? item.title}
                  loading="lazy"
                />
              </div>
            ) : (
              <div class="item-card__image-wrapper item-card__image-wrapper--empty">
                <span class="item-card__placeholder">{item.title.charAt(0)}</span>
              </div>
            )}
            <div class="item-card__body">
              <h3 class="item-card__title">{item.title}</h3>
              <p class="item-card__date">{formatDate(item.publishedOn)}</p>
              {item.description && <p class="item-card__description">{item.description}</p>}
            </div>
          </a>
        );
      })
    }
  </div>
</div>
```

Move the entire `<style>` block from `index.astro` into this component verbatim.

**Step 3: Build to verify the component itself has no errors**

```bash
just app::build
```

**Step 4: Commit the new component (before refactoring the pages)**

```bash
git add app/src/components/CollectionGrid.astro
git commit -m "feat: add CollectionGrid component with shared card template and styles"
```

---


### Task 11: Refactor `index.astro` to use `CollectionGrid`

**Files:**

- Modify: `app/src/pages/[collection]/index.astro`

**Step 1: Replace the page body**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import CollectionGrid from "../../components/CollectionGrid.astro";
import { getNavData, type NavCollection } from "../../lib/nav-data";
import { COLLECTION_NAMES, type CollectionName } from "../../content.config";

export async function getStaticPaths() {
  return COLLECTION_NAMES.map((collection) => ({
    params: { collection },
  }));
}

const { collection } = Astro.params as { collection: CollectionName };
const navData = await getNavData();
const collectionData: NavCollection | undefined = navData[collection];

if (!collectionData) {
  return Astro.redirect("/404");
}

const { title, items, allCategories } = collectionData;
---

<BaseLayout title={`${title} · thalida`} activeCollection={collection}>
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={`${items.length} items`}
    items={items}
    allCategories={allCategories}
  />
</BaseLayout>
```

Remove the entire `<style>` block (it's now in `CollectionGrid.astro`).

**Step 2: Build**

```bash
just app::build
```

**Step 3: Commit**

```bash
git add "app/src/pages/[collection]/index.astro"
git commit -m "refactor: replace index.astro template with CollectionGrid component"
```

---


### Task 12: Refactor `[category].astro` to use `CollectionGrid`

**Files:**

- Modify: `app/src/pages/[collection]/[category].astro`

**Step 1: Replace the page body**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import CollectionGrid from "../../components/CollectionGrid.astro";
import { getNavData, categoryDisplay, type NavCollection } from "../../lib/nav-data";
import { COLLECTION_NAMES, type CollectionName } from "../../content.config";

export async function getStaticPaths() {
  const navData = await getNavData();
  const paths: { params: { collection: string; category: string } }[] = [];

  for (const collection of COLLECTION_NAMES) {
    const collectionData = navData[collection];
    if (!collectionData) continue;
    for (const category of collectionData.allCategories) {
      paths.push({ params: { collection, category } });
    }
  }

  return paths;
}

const { collection, category } = Astro.params as { collection: CollectionName; category: string };
const navData = await getNavData();
const collectionData: NavCollection | undefined = navData[collection];

if (!collectionData) {
  return Astro.redirect("/404");
}

const { title, items, allCategories } = collectionData;
const filteredItems = items.filter((item) => item.category === category);

if (filteredItems.length === 0) {
  return Astro.redirect(`/${collection}`);
}
---

<BaseLayout title={`${categoryDisplay(category)} · ${title} · thalida`} activeCollection={collection}>
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={`${filteredItems.length} ${categoryDisplay(category)} items`}
    items={filteredItems}
    allCategories={allCategories}
    activeCategory={category}
  />
</BaseLayout>
```

Remove the entire `<style>` block.

**Step 2: Build**

```bash
just app::build
```

**Step 3: Commit**

```bash
git add "app/src/pages/[collection]/[category].astro"
git commit -m "refactor: replace [category].astro template with CollectionGrid component"
```

---


## Phase 5 — Bug fixes


### Task 13: Fix `isSameDate` logic bug

**Problem:** `isSameDate(a, b)` in `live-window.ts` only compares `getDate()` (day of month), so March 1 and April 1 are considered the same date.

**File:** `app/src/scripts/live-window/live-window.ts`

**Step 1: Write a failing test**

In `app/src/scripts/__tests__/chat-logic.test.ts` (or create `live-window.test.ts` if live-window exports are testable), note that `isSameDate` is a private method. Since it can't be unit-tested in isolation without refactoring, verify the fix by reading and confirming the corrected implementation instead.

**Step 2: Fix the implementation (~line 346)**

```typescript
// before
private isSameDate(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate();
}

// after
private isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
```

**Step 3: Build**

```bash
just app::build
```

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/live-window.ts
git commit -m "fix: isSameDate must compare year and month, not just day-of-month"
```

---


### Task 14: Fix deprecated `navigator.platform`

**Problem:** `navigator.platform` is deprecated. The modern approach is `navigator.userAgentData?.platform` with a fallback.

**File:** `app/src/components/ProjectTree.astro` (in `<script>`, `initNav()` after the rename in Task 9)

**Step 1: Update the platform detection**

```typescript
// before
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

// after
const platform =
  (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ??
  navigator.platform;
const isMac = platform.toUpperCase().includes("MAC");
```

**Step 2: Build**

```bash
just app::build
```

**Step 3: Commit**

```bash
git add app/src/components/ProjectTree.astro
git commit -m "fix: replace deprecated navigator.platform with userAgentData with fallback"
```

---


### Task 15: Fix content filename typo

**Problem:** `app/src/content/gallery/galllery_of_phones.md` has three l's. The URL slug derived from the filename is `galllery_of_phones`.

**Step 1: Rename the file**

```bash
git mv app/src/content/gallery/galllery_of_phones.md app/src/content/gallery/gallery_of_phones.md
```

**Step 2: Build to confirm slug works**

```bash
just app::build
```

**Step 3: Commit**

```bash
git commit -m "fix: correct triple-l typo in galllery_of_phones.md filename"
```

---


## Phase 6 — Minor constants cleanup


### Task 16: Add remaining magic number constants

**Problem:** A few remaining inline magic numbers across the app.

**Files:**

- Modify: `app/src/scripts/chat-client.ts` — `RECONNECT_DELAY_MS`
- Modify: `app/src/components/CommandPalette.astro` — `MAX_PALETTE_RESULTS`
- Modify: `app/src/lib/nav-data.ts` — `COVER_IMAGE_WIDTH`

**Step 1: `chat-client.ts` — add at top of file**

```typescript
const RECONNECT_DELAY_MS = 3000;
```

Replace `}, 3000);` in `scheduleReconnect()` with `}, RECONNECT_DELAY_MS);`.

**Step 2: `CommandPalette.astro` — in the `<script>` block**

```typescript
const MAX_PALETTE_RESULTS = 15;
```

Replace both `.slice(0, 15)` calls with `.slice(0, MAX_PALETTE_RESULTS)`.

**Step 3: `nav-data.ts` — add near the top**

```typescript
const COVER_IMAGE_WIDTH = 400;
```

Replace `width: 400` in the `getImage()` call with `width: COVER_IMAGE_WIDTH`.

**Step 4: Build + test**

```bash
just app::build && npm test
```

**Step 5: Commit**

```bash
git add app/src/scripts/chat-client.ts app/src/components/CommandPalette.astro app/src/lib/nav-data.ts
git commit -m "refactor: name remaining magic number constants"
```

---


## Final verification

```bash
# Run all tests
just api::test
just app::test

# Full build
just app::build

# Check for any remaining old names
grep -r "sidebar-data\|SidebarItem\|SidebarCollection\|SIDEBAR_ORDER\|getSidebarData\|project-tree\|sidebar-row\|sidebar-nav\|sidebar-heading\|sidebar-search\|initSidebar" app/src/ --include="*.astro" --include="*.ts"
# Expected: no output
```

Push to remote once all green:

```bash
git push
```
