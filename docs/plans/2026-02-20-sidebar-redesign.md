# Sidebar Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current file-tree sidebar with a two-level navigation and command palette search.

**Architecture:** The sidebar renders both Level 1 (overview) and Level 2 (per-collection) views in the same `<nav>`. Client-side JS manages which level is visible and applies CSS slide transitions. The command palette is a separate modal component rendered in `BaseLayout.astro`, with client-side search/filtering over a JSON data blob inlined at build time. All interactivity is vanilla JS (no React/Vue) — Astro components render server-side HTML, `<script>` tags handle client state.

**Tech Stack:** Astro 5, TypeScript, vanilla JS, scoped CSS

---

## Task 1: Extract Sidebar Data into a Shared Utility

The sidebar data (tree items per collection) is currently fetched inline in `ProjectTree.astro`. Extract it so both the sidebar and command palette can share the same data shape.

**Files:**
- Create: `app/src/lib/sidebar-data.ts`
- Modify: `app/src/components/ProjectTree.astro` (remove inline data fetching, import from new module)

**Step 1: Create `app/src/lib/sidebar-data.ts`**

```typescript
import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import { COLLECTION_NAMES, collectionMeta, type CollectionName } from "../content.config";

export type SidebarItem = {
  id: string;
  collection: string;
  title: string;
  href?: string;
  description?: string;
  tags?: string[];
  category?: string;
  publishedOn: string; // ISO string for JSON serialization
  coverImageSrc?: string;
  coverImageAlt?: string;
};

export type SidebarCollection = {
  name: string;
  title: string;
  items: SidebarItem[];
  allTags: string[];
  allCategories: string[];
};

export type SidebarEntry =
  | { type: "page"; page: string; label: string }
  | { type: "collection"; collection: string };

export const SIDEBAR_ORDER: SidebarEntry[] = [
  { type: "page", page: "about", label: "About" },
  { type: "collection", collection: "projects" },
  { type: "collection", collection: "guides" },
  { type: "collection", collection: "gallery" },
  { type: "collection", collection: "recipes" },
  { type: "collection", collection: "versions" },
  { type: "page", page: "links", label: "Links" },
];

export async function getSidebarData(): Promise<Record<string, SidebarCollection>> {
  const data: Record<string, SidebarCollection> = {};

  for (const name of COLLECTION_NAMES) {
    if (name === "links") continue; // links are not navigable in the sidebar

    const entries = await getCollection(name, ({ data }) => !data.draft);
    const sorted = entries.sort(
      (a, b) => new Date(b.data.publishedOn).getTime() - new Date(a.data.publishedOn).getTime(),
    );

    const tagsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const items: SidebarItem[] = [];

    for (const entry of sorted) {
      let coverImageSrc: string | undefined;
      if (entry.data.coverImage) {
        const optimized = await getImage({ src: entry.data.coverImage, width: 400 });
        coverImageSrc = optimized.src;
      }

      if (entry.data.tags) entry.data.tags.forEach((t) => tagsSet.add(t));
      if (entry.data.category) categoriesSet.add(entry.data.category);

      items.push({
        id: entry.id,
        collection: name,
        title: entry.data.title,
        href: entry.data.link,
        description: entry.data.description,
        tags: entry.data.tags,
        category: entry.data.category,
        publishedOn: entry.data.publishedOn.toISOString(),
        coverImageSrc,
        coverImageAlt: entry.data.coverImageAlt,
      });
    }

    data[name] = {
      name,
      title: collectionMeta[name].title,
      items,
      allTags: [...tagsSet].sort(),
      allCategories: [...categoriesSet].sort(),
    };
  }

  return data;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}
```

**Step 2: Verify the module resolves**

Run: `cd app && npx astro check 2>&1 | head -20`
Expected: No import errors for the new module.

**Step 3: Commit**

```bash
git add app/src/lib/sidebar-data.ts
git commit -m "feat: extract sidebar data into shared utility module"
```

---

## Task 2: Build the Two-Level Sidebar Component

Replace the current `ProjectTree.astro` with the new two-level navigation.

**Files:**
- Modify: `app/src/components/ProjectTree.astro` (full rewrite)

**Step 1: Rewrite `ProjectTree.astro`**

The component renders both Level 1 and Level 2 in the same `<nav>`. Level 2 sections are hidden by default. Client-side JS handles transitions.

```astro
---
import { getSidebarData, SIDEBAR_ORDER, formatDate, type SidebarCollection } from "../lib/sidebar-data";

interface Props {
  activePage?: string;
  activeCollection?: string;
  activeId?: string;
}

const { activePage, activeCollection, activeId } = Astro.props;
const sidebarData = await getSidebarData();
---

<nav id="project-tree">
  <!-- Level 1: Overview -->
  <div class="sidebar-level sidebar-level--1 sidebar-level--active" id="sidebar-level-1">
    <h2><a href="/" class="sidebar-heading-link">Work</a></h2>

    <button class="sidebar-search-trigger" type="button" data-open-palette>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <span>Search…</span>
      <kbd>⌘K</kbd>
    </button>

    <ul class="sidebar-nav">
      {SIDEBAR_ORDER.map((entry) =>
        entry.type === "page" ? (
          <li>
            <a
              href={`/${entry.page}`}
              class="sidebar-row sidebar-row--page"
              data-active={activePage === entry.page ? "true" : undefined}
            >
              {entry.label}
            </a>
          </li>
        ) : sidebarData[entry.collection] ? (
          <li>
            <button
              class="sidebar-row sidebar-row--collection"
              type="button"
              data-collection={entry.collection}
              data-active={activeCollection === entry.collection ? "true" : undefined}
            >
              <span class="sidebar-row__label">{sidebarData[entry.collection].title}</span>
              <span class="sidebar-row__count">{sidebarData[entry.collection].items.length}</span>
            </button>
          </li>
        ) : null
      )}
    </ul>
  </div>

  <!-- Level 2: One per collection -->
  {Object.values(sidebarData).map((col: SidebarCollection) => (
    <div class="sidebar-level sidebar-level--2" id={`sidebar-level-2-${col.name}`} data-collection={col.name}>
      <button class="sidebar-back" type="button" data-back>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        {col.title}
      </button>

      <button class="sidebar-search-trigger" type="button" data-open-palette data-palette-collection={col.name}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>Filter {col.title.toLowerCase()}…</span>
      </button>

      {(col.allTags.length > 0 || col.allCategories.length > 0) && (
        <div class="sidebar-chips" data-chips-for={col.name}>
          <button class="sidebar-chip sidebar-chip--active" type="button" data-tag="all">All</button>
          {col.allCategories.map((cat) => (
            <button class="sidebar-chip" type="button" data-tag={cat}>{cat}</button>
          ))}
          {col.allTags.map((tag) => (
            <button class="sidebar-chip" type="button" data-tag={tag}>{tag}</button>
          ))}
        </div>
      )}

      <ul class="sidebar-items" data-items-for={col.name}>
        {col.items.map((item) => (
          <li data-item-tags={JSON.stringify([...(item.tags ?? []), item.category].filter(Boolean))}>
            <a
              href={`/${item.collection}/${item.id}`}
              class="sidebar-item"
              data-active={activeCollection === item.collection && activeId === item.id ? "true" : undefined}
            >
              {item.coverImageSrc && (
                <img
                  class="sidebar-item__image"
                  src={item.coverImageSrc}
                  alt={item.coverImageAlt ?? item.title}
                  loading="lazy"
                />
              )}
              <div class="sidebar-item__body">
                <span class="sidebar-item__title">{item.title}</span>
                <span class="sidebar-item__date">{formatDate(item.publishedOn)}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  ))}
</nav>

<script>
  function initSidebar() {
    const tree = document.getElementById("project-tree");
    if (!tree) return;

    const level1 = document.getElementById("sidebar-level-1");
    if (!level1) return;

    function showLevel1() {
      const activeLevel2 = tree!.querySelector(".sidebar-level--2.sidebar-level--active");
      if (activeLevel2) activeLevel2.classList.remove("sidebar-level--active");
      level1!.classList.add("sidebar-level--active");
      tree!.dataset.level = "1";
    }

    function showLevel2(collection: string) {
      const target = document.getElementById(`sidebar-level-2-${collection}`);
      if (!target) return;
      level1!.classList.remove("sidebar-level--active");
      const prev = tree!.querySelector(".sidebar-level--2.sidebar-level--active");
      if (prev) prev.classList.remove("sidebar-level--active");
      target.classList.add("sidebar-level--active");
      tree!.dataset.level = "2";
    }

    // Collection row clicks → go to level 2
    tree.querySelectorAll<HTMLButtonElement>(".sidebar-row--collection").forEach((btn) => {
      btn.addEventListener("click", () => {
        const col = btn.dataset.collection;
        if (col) showLevel2(col);
      });
    });

    // Back buttons → go to level 1
    tree.querySelectorAll<HTMLButtonElement>("[data-back]").forEach((btn) => {
      btn.addEventListener("click", showLevel1);
    });

    // Tag chip filtering
    tree.querySelectorAll<HTMLDivElement>(".sidebar-chips").forEach((chipsContainer) => {
      const col = chipsContainer.dataset.chipsFor;
      if (!col) return;
      const itemsList = tree.querySelector<HTMLUListElement>(`[data-items-for="${col}"]`);
      if (!itemsList) return;

      chipsContainer.addEventListener("click", (e) => {
        const chip = (e.target as HTMLElement).closest<HTMLButtonElement>(".sidebar-chip");
        if (!chip) return;

        const tag = chip.dataset.tag;
        if (!tag) return;

        if (tag === "all") {
          chipsContainer.querySelectorAll(".sidebar-chip").forEach((c) => c.classList.remove("sidebar-chip--active"));
          chip.classList.add("sidebar-chip--active");
        } else {
          chipsContainer.querySelector('[data-tag="all"]')?.classList.remove("sidebar-chip--active");
          chip.classList.toggle("sidebar-chip--active");
          if (!chipsContainer.querySelector(".sidebar-chip--active")) {
            chipsContainer.querySelector('[data-tag="all"]')?.classList.add("sidebar-chip--active");
          }
        }

        const activeTags = new Set<string>();
        chipsContainer.querySelectorAll<HTMLButtonElement>(".sidebar-chip--active").forEach((c) => {
          if (c.dataset.tag && c.dataset.tag !== "all") activeTags.add(c.dataset.tag);
        });
        const showAll = activeTags.size === 0 || chipsContainer.querySelector('[data-tag="all"]')?.classList.contains("sidebar-chip--active");

        itemsList.querySelectorAll<HTMLLIElement>(":scope > li").forEach((li) => {
          const itemTags: string[] = JSON.parse(li.dataset.itemTags || "[]");
          if (showAll || itemTags.some((t) => activeTags.has(t))) {
            li.style.display = "";
          } else {
            li.style.display = "none";
          }
        });
      });
    });

    // If we're on a collection page, auto-open level 2
    const activeCollBtn = tree.querySelector<HTMLButtonElement>('.sidebar-row--collection[data-active="true"]');
    if (activeCollBtn?.dataset.collection) {
      showLevel2(activeCollBtn.dataset.collection);
    }
  }

  document.addEventListener("astro:page-load", initSidebar);
</script>

<style>
  /* ---- Layout ---- */
  #project-tree {
    font-family: system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
  }

  .sidebar-level {
    display: none;
    flex-direction: column;
    height: 100%;
  }

  .sidebar-level--active {
    display: flex;
  }

  /* ---- Heading ---- */
  #project-tree h2 {
    margin: 0 0 0.75em;
    font-size: 1.1em;
    letter-spacing: 0.02em;
  }

  .sidebar-heading-link {
    text-decoration: none;
    color: inherit;
  }

  /* ---- Search trigger ---- */
  .sidebar-search-trigger {
    display: flex;
    align-items: center;
    gap: 0.5em;
    width: 100%;
    padding: 0.5em 0.6em;
    margin-bottom: 0.75em;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    color: #999;
    font-size: 0.85em;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .sidebar-search-trigger:hover {
    border-color: #ccc;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .sidebar-search-trigger span {
    flex: 1;
    text-align: left;
  }

  .sidebar-search-trigger kbd {
    font-size: 0.8em;
    padding: 0.15em 0.4em;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f5f5f5;
    color: #999;
    font-family: inherit;
  }

  /* ---- Navigation list (Level 1) ---- */
  .sidebar-nav {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-row {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.5em 0.6em;
    border-radius: 6px;
    text-decoration: none;
    color: #333;
    font-weight: 500;
    font-size: 0.9em;
    transition: background 0.15s;
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
  }

  .sidebar-row:hover {
    background: #e4e4e4;
  }

  .sidebar-row[data-active] {
    background: #eef2ff;
    color: #4338ca;
  }

  .sidebar-row--collection {
    justify-content: space-between;
  }

  .sidebar-row__count {
    font-size: 0.8em;
    color: #999;
    font-weight: 400;
    background: #f0f0f0;
    padding: 0.1em 0.5em;
    border-radius: 10px;
  }

  .sidebar-row[data-active] .sidebar-row__count {
    background: #ddd6fe;
    color: #6d28d9;
  }

  /* ---- Back button (Level 2) ---- */
  .sidebar-back {
    display: flex;
    align-items: center;
    gap: 0.3em;
    background: none;
    border: none;
    padding: 0.4em 0;
    margin-bottom: 0.5em;
    font-size: 1em;
    font-weight: 600;
    color: #333;
    cursor: pointer;
    font-family: inherit;
  }

  .sidebar-back:hover {
    color: #4338ca;
  }

  /* ---- Filter chips ---- */
  .sidebar-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35em;
    margin-bottom: 0.75em;
  }

  .sidebar-chip {
    padding: 0.25em 0.6em;
    border-radius: 12px;
    border: 1px solid #e0e0e0;
    background: #fff;
    font-size: 0.75em;
    color: #666;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    text-transform: capitalize;
  }

  .sidebar-chip:hover {
    border-color: #ccc;
    background: #f5f5f5;
  }

  .sidebar-chip--active {
    background: #eef2ff;
    border-color: #a5b4fc;
    color: #4338ca;
  }

  /* ---- Item list (Level 2) ---- */
  .sidebar-items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    flex: 1;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.45em 0.5em;
    border-radius: 6px;
    text-decoration: none;
    color: #333;
    transition: background 0.15s;
  }

  .sidebar-item:hover {
    background: #e4e4e4;
  }

  .sidebar-item[data-active] {
    background: #eef2ff;
    border-left: 3px solid #a5b4fc;
  }

  .sidebar-item__image {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
    background: #eee;
  }

  .sidebar-item__body {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }

  .sidebar-item__title {
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-item__date {
    font-size: 0.72em;
    color: #999;
  }
</style>
```

**Step 2: Verify build**

Run: `cd app && npx astro build 2>&1 | tail -20`
Expected: Build succeeds. Sidebar renders with Level 1 visible, Level 2 hidden.

**Step 3: Commit**

```bash
git add app/src/components/ProjectTree.astro
git commit -m "feat: replace file-tree sidebar with two-level navigation"
```

---

## Task 3: Build the Command Palette Component

A modal overlay component that provides global and collection-scoped search.

**Files:**
- Create: `app/src/components/CommandPalette.astro`
- Modify: `app/src/layouts/BaseLayout.astro` (add CommandPalette to the page)

**Step 1: Create `app/src/components/CommandPalette.astro`**

```astro
---
import { getSidebarData, formatDate } from "../lib/sidebar-data";

const sidebarData = await getSidebarData();

// Flatten all items for search, include collection info
const allItems = Object.values(sidebarData).flatMap((col) =>
  col.items.map((item) => ({
    ...item,
    collectionTitle: col.title,
  })),
);
---

<div id="command-palette" class="cp-overlay" aria-hidden="true">
  <div class="cp-backdrop"></div>
  <div class="cp-dialog" role="dialog" aria-label="Search content">
    <div class="cp-header">
      <div class="cp-filter-chip" id="cp-collection-chip" hidden>
        <span id="cp-collection-chip-label"></span>
        <button type="button" id="cp-collection-chip-clear" aria-label="Clear collection filter">&times;</button>
      </div>
      <input
        type="text"
        id="cp-input"
        class="cp-input"
        placeholder="Search…"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
    <div class="cp-results" id="cp-results"></div>
    <div class="cp-footer">
      <span><kbd>&uarr;&darr;</kbd> navigate</span>
      <span><kbd>&crarr;</kbd> open</span>
      <span><kbd>esc</kbd> close</span>
    </div>
  </div>
</div>

<script define:vars={{ allItems, sidebarData }}>
  // Store data globally for the palette script
  window.__cpData = { allItems, sidebarData };
</script>

<script>
  interface CPItem {
    id: string;
    collection: string;
    collectionTitle: string;
    title: string;
    description?: string;
    tags?: string[];
    category?: string;
    publishedOn: string;
    coverImageSrc?: string;
  }

  function initCommandPalette() {
    const overlay = document.getElementById("command-palette") as HTMLDivElement;
    const backdrop = overlay?.querySelector(".cp-backdrop") as HTMLDivElement;
    const input = document.getElementById("cp-input") as HTMLInputElement;
    const resultsContainer = document.getElementById("cp-results") as HTMLDivElement;
    const collectionChip = document.getElementById("cp-collection-chip") as HTMLDivElement;
    const chipLabel = document.getElementById("cp-collection-chip-label") as HTMLSpanElement;
    const chipClear = document.getElementById("cp-collection-chip-clear") as HTMLButtonElement;

    if (!overlay || !input || !resultsContainer) return;

    const data = (window as any).__cpData as {
      allItems: CPItem[];
      sidebarData: Record<string, { name: string; title: string; items: CPItem[] }>;
    };

    let activeCollection: string | null = null;
    let selectedIndex = -1;

    function open(collection?: string) {
      activeCollection = collection ?? null;
      if (activeCollection && data.sidebarData[activeCollection]) {
        chipLabel.textContent = data.sidebarData[activeCollection].title;
        collectionChip.hidden = false;
      } else {
        collectionChip.hidden = true;
      }
      input.value = "";
      overlay.setAttribute("aria-hidden", "false");
      overlay.classList.add("cp-overlay--open");
      input.focus();
      renderResults("");
    }

    function close() {
      overlay.setAttribute("aria-hidden", "true");
      overlay.classList.remove("cp-overlay--open");
      activeCollection = null;
      input.value = "";
      selectedIndex = -1;
    }

    function getFiltered(query: string): CPItem[] {
      let pool = activeCollection
        ? data.allItems.filter((item) => item.collection === activeCollection)
        : data.allItems;

      if (!query.trim()) return pool.slice(0, 20);

      const q = query.toLowerCase();
      return pool
        .filter((item) => {
          return (
            item.title.toLowerCase().includes(q) ||
            (item.description ?? "").toLowerCase().includes(q) ||
            (item.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
            (item.category ?? "").toLowerCase().includes(q)
          );
        })
        .slice(0, 20);
    }

    function renderResults(query: string) {
      const filtered = getFiltered(query);
      selectedIndex = -1;

      if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="cp-empty">No results found</div>';
        return;
      }

      if (activeCollection) {
        // Flat list when scoped to a collection
        resultsContainer.innerHTML = filtered
          .map(
            (item, i) =>
              `<a href="/${item.collection}/${item.id}" class="cp-result" data-index="${i}">
                <span class="cp-result__title">${escapeHtml(item.title)}</span>
                <span class="cp-result__meta">${formatDateClient(item.publishedOn)}</span>
              </a>`,
          )
          .join("");
      } else {
        // Grouped by collection
        const grouped: Record<string, CPItem[]> = {};
        for (const item of filtered) {
          (grouped[item.collection] ??= []).push(item);
        }
        let idx = 0;
        let html = "";
        for (const [col, items] of Object.entries(grouped)) {
          const title = items[0]?.collectionTitle ?? col;
          html += `<div class="cp-group-label">${escapeHtml(title)}</div>`;
          for (const item of items) {
            html += `<a href="/${item.collection}/${item.id}" class="cp-result" data-index="${idx}">
              <span class="cp-result__title">${escapeHtml(item.title)}</span>
              <span class="cp-result__meta">${formatDateClient(item.publishedOn)}</span>
            </a>`;
            idx++;
          }
        }
        resultsContainer.innerHTML = html;
      }
    }

    function updateSelection() {
      const items = resultsContainer.querySelectorAll<HTMLAnchorElement>(".cp-result");
      items.forEach((el, i) => {
        el.classList.toggle("cp-result--selected", i === selectedIndex);
        if (i === selectedIndex) el.scrollIntoView({ block: "nearest" });
      });
    }

    function escapeHtml(str: string) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function formatDateClient(iso: string) {
      return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    }

    // Event listeners
    input.addEventListener("input", () => renderResults(input.value));

    input.addEventListener("keydown", (e) => {
      const items = resultsContainer.querySelectorAll<HTMLAnchorElement>(".cp-result");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
      } else if (e.key === "Enter" && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        close();
        items[selectedIndex].click();
      } else if (e.key === "Escape") {
        close();
      }
    });

    backdrop.addEventListener("click", close);

    chipClear.addEventListener("click", () => {
      activeCollection = null;
      collectionChip.hidden = true;
      input.focus();
      renderResults(input.value);
    });

    // Global Cmd+K listener
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (overlay.classList.contains("cp-overlay--open")) {
          close();
        } else {
          open();
        }
      }
    });

    // Open palette buttons (from sidebar)
    document.querySelectorAll<HTMLButtonElement>("[data-open-palette]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const col = btn.dataset.paletteCollection;
        open(col || undefined);
      });
    });
  }

  document.addEventListener("astro:page-load", initCommandPalette);
</script>

<style>
  .cp-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
  }

  .cp-overlay--open {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20vh;
  }

  .cp-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
  }

  .cp-dialog {
    position: relative;
    width: 100%;
    max-width: 520px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    max-height: 60vh;
  }

  .cp-header {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.75em;
    border-bottom: 1px solid #e0e0e0;
  }

  .cp-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    padding: 0.2em 0.5em;
    background: #eef2ff;
    border: 1px solid #a5b4fc;
    border-radius: 6px;
    font-size: 0.8em;
    color: #4338ca;
    white-space: nowrap;
  }

  .cp-filter-chip button {
    background: none;
    border: none;
    color: #4338ca;
    cursor: pointer;
    font-size: 1.1em;
    padding: 0 0.1em;
    line-height: 1;
  }

  .cp-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1em;
    padding: 0.3em 0;
    font-family: inherit;
    background: transparent;
  }

  .cp-results {
    overflow-y: auto;
    flex: 1;
    padding: 0.4em 0;
  }

  .cp-group-label {
    padding: 0.5em 0.75em 0.25em;
    font-size: 0.72em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #999;
  }

  .cp-result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5em 0.75em;
    text-decoration: none;
    color: #333;
    cursor: pointer;
    transition: background 0.1s;
  }

  .cp-result:hover,
  .cp-result--selected {
    background: #f5f5f5;
  }

  .cp-result--selected {
    background: #eef2ff;
  }

  .cp-result__title {
    font-size: 0.9em;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cp-result__meta {
    font-size: 0.75em;
    color: #999;
    flex-shrink: 0;
    margin-left: 0.5em;
  }

  .cp-empty {
    padding: 1.5em;
    text-align: center;
    color: #999;
    font-size: 0.9em;
  }

  .cp-footer {
    display: flex;
    gap: 1em;
    padding: 0.5em 0.75em;
    border-top: 1px solid #e0e0e0;
    font-size: 0.72em;
    color: #999;
  }

  .cp-footer kbd {
    font-size: 0.9em;
    padding: 0.1em 0.3em;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: #f5f5f5;
    font-family: inherit;
  }

  @media (max-width: 639px) {
    .cp-overlay--open {
      padding-top: 0;
      align-items: stretch;
    }

    .cp-dialog {
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
      height: 100%;
    }

    .cp-footer {
      display: none;
    }
  }
</style>
```

**Step 2: Add CommandPalette to `BaseLayout.astro`**

Add the import and render the component in the body, after `<div id="layout">`.

At the top of the frontmatter, add:
```astro
import CommandPalette from "../components/CommandPalette.astro";
```

In the body, after `</div>` (closing `#layout`), before the `<script>` tag, add:
```astro
<CommandPalette />
```

Also add a search icon button to `#mobile-toolbar`, between the title and the chat button:
```html
<button id="mobile-search-btn" type="button" aria-label="Search">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
</button>
```

In the `initDrawers()` script, add a click handler for the mobile search button that opens the command palette:
```javascript
const searchBtn = document.getElementById("mobile-search-btn");
if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    closeAll();
    document.dispatchEvent(new CustomEvent("open-command-palette"));
  });
}
```

And in the CommandPalette script, add a listener for this custom event:
```javascript
document.addEventListener("open-command-palette", () => open());
```

**Step 3: Verify build**

Run: `cd app && npx astro build 2>&1 | tail -20`
Expected: Build succeeds. Command palette renders as hidden overlay.

**Step 4: Commit**

```bash
git add app/src/components/CommandPalette.astro app/src/layouts/BaseLayout.astro
git commit -m "feat: add command palette search modal with global and scoped search"
```

---

## Task 4: Update Mobile Toolbar Layout

The mobile toolbar currently has hamburger (left) and chat (right). Add the search button in the middle and ensure the three-button layout is balanced.

**Files:**
- Modify: `app/src/layouts/BaseLayout.astro` (mobile toolbar + styles)

**Step 1: Update `#mobile-toolbar` structure**

Replace the `#mobile-toolbar` HTML so it has three sections: left (hamburger), center (title), right (search + chat).

```html
<div id="mobile-toolbar">
  <button id="mobile-menu-btn" type="button" aria-label="Open projects">
    <!-- hamburger SVG (unchanged) -->
  </button>
  <span id="mobile-title">thalida</span>
  <div id="mobile-toolbar-right">
    <button id="mobile-search-btn" type="button" aria-label="Search">
      <!-- search SVG -->
    </button>
    <button id="mobile-chat-btn" type="button" aria-label="Open chat">
      <!-- chat SVG (unchanged) -->
    </button>
  </div>
</div>
```

**Step 2: Add CSS for the right button group**

```css
#mobile-toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

**Step 3: Verify mobile layout**

Run: `cd app && npx astro dev`
Open in browser at mobile viewport (< 640px). Verify hamburger is left, title center, search + chat icons right.

**Step 4: Commit**

```bash
git add app/src/layouts/BaseLayout.astro
git commit -m "feat: add search button to mobile toolbar"
```

---

## Task 5: Integration Testing & Polish

Manual verification of all interactions.

**Step 1: Start dev server**

Run: `cd app && npx astro dev`

**Step 2: Verify Level 1**

- Page loads with Level 1 visible: search trigger, About, collection rows with counts, Links.
- Clicking About navigates to `/about`.
- Active page gets indigo highlight.

**Step 3: Verify Level 2**

- Clicking "Projects" row transitions to Level 2 with slide animation.
- Level 2 shows back button, search trigger, tag chips, and item list with thumbnails.
- Clicking back returns to Level 1.
- Tag chips filter the item list (OR logic, "All" resets).
- Active item is highlighted when on a project page.
- Auto-opens Level 2 when navigating to a collection page.

**Step 4: Verify Command Palette**

- `Cmd+K` opens the palette globally (no collection filter).
- Clicking search trigger from Level 1 opens palette globally.
- Clicking search trigger from Level 2 opens palette with collection chip pre-selected.
- Typing filters results in real-time.
- Arrow keys navigate, Enter selects, Escape closes.
- Clicking `✕` on collection chip clears the filter.
- Clicking backdrop closes palette.

**Step 5: Verify Mobile**

- At < 640px, mobile toolbar shows hamburger, title, search icon, chat icon.
- Hamburger opens sidebar drawer with Level 1.
- Drilling into a collection works within the drawer.
- Search icon opens full-screen command palette.
- Selecting a result closes palette and navigates.

**Step 6: Final commit**

```bash
git add -A
git commit -m "polish: sidebar redesign integration fixes"
```
