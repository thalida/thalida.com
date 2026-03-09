---
title: Responsive Tailwind Redesign — Implementation Plan
description: >-
  Replace all raw CSS `@media` queries with Tailwind responsive utilities and
  implement mobile-first responsive layouts (single-column mobile, two-column
  tablet, three-column desktop).
publishedOn: 2026-02-23T04:32:46.000Z
subcategory: responsive-tailwind
category: styling
tags: [implementation]
---

# Responsive Tailwind Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all raw CSS `@media` queries with Tailwind responsive utilities and implement mobile-first responsive layouts (single-column mobile, two-column tablet, three-column desktop).

**Architecture:** Mobile-first approach using Tailwind v4 default breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`). The existing three-column desktop layout is preserved at `lg+`. Below `lg`, a header bar with slide-down nav panel replaces the left sidebar. Below `md`, chat is hidden behind a floating button overlay.

**Tech Stack:** Astro v5, Tailwind CSS v4 (via Vite plugin), TypeScript

---

### Task 1: BaseLayout.css — Remove media queries and update layout classes

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.css:5-255`

**Step 1: Remove the `--spacing-mobile-panel` theme token**

In `BaseLayout.css`, delete line 27:
```css
  --spacing-mobile-panel: calc(100svh - 48px);
```

**Step 2: Replace `#layout` styles with mobile-first responsive classes**

Replace:
```css
#layout {
  @apply flex w-screen h-svh;
}
```

With:
```css
#layout {
  @apply flex flex-col lg:flex-row w-screen h-svh;
}
```

**Step 3: Replace `#site-nav` styles**

Replace:
```css
#site-nav {
  @apply shrink-0 grow-0 basis-1/5 max-w-64 py-3 pl-3 pr-0;
}
```

With:
```css
#site-nav {
  @apply hidden lg:block lg:shrink-0 lg:grow-0 lg:basis-1/5 lg:max-w-64 lg:py-3 lg:pl-3 lg:pr-0;
}
```

**Step 4: Replace `#content-viewer` styles**

Replace:
```css
#content-viewer {
  @apply grow shrink basis-0 min-w-0 py-6 px-6;
}
```

With:
```css
#content-viewer {
  @apply grow shrink basis-0 min-w-0 py-4 px-4 sm:py-6 sm:px-6;
}
```

**Step 5: Replace `#chat-panel` styles**

Replace:
```css
#chat-panel {
  @apply shrink-0 grow-0 basis-1/4 max-w-80 border-l border-border p-4;
}
```

With:
```css
#chat-panel {
  @apply hidden md:flex md:shrink-0 md:grow-0 md:basis-1/4 md:max-w-80 md:border-l md:border-border md:p-4;
}
```

**Step 6: Replace `#mobile-toolbar` styles**

Replace:
```css
#mobile-toolbar {
  @apply hidden;
}
```

With:
```css
#mobile-toolbar {
  @apply flex items-center justify-between fixed top-0 left-0 w-full h-12 px-3 bg-surface border-b border-border z-60 lg:hidden;
}

#mobile-toolbar button {
  @apply bg-transparent border-none p-2 text-muted hover:text-neon;
}

#mobile-title {
  @apply font-display font-bold text-base text-neon;
}

#mobile-toolbar-right {
  @apply flex items-center gap-1;
}
```

**Step 7: Replace `#drawer-backdrop` styles**

Replace:
```css
#drawer-backdrop {
  @apply hidden;
}
```

With:
```css
#nav-backdrop {
  @apply hidden fixed top-12 left-0 w-full h-full z-40 bg-midnight/70 backdrop-blur-xs lg:hidden;
}

#nav-backdrop.visible {
  @apply block;
}

#chat-overlay-backdrop {
  @apply hidden fixed inset-0 z-40 bg-midnight/70 backdrop-blur-xs md:hidden;
}

#chat-overlay-backdrop.visible {
  @apply block;
}
```

**Step 8: Add nav slide-down panel styles**

After the backdrop styles, add:
```css
#nav-panel {
  @apply fixed top-12 left-0 w-full max-h-[60vh] overflow-y-auto bg-midnight/95 backdrop-blur-md border-b border-border z-50 -translate-y-full transition-transform duration-300 ease-in-out lg:hidden;
}

#nav-panel.open {
  @apply translate-y-0;
}
```

**Step 9: Add mobile chat overlay styles**

After the nav panel styles, add:
```css
#chat-overlay {
  @apply fixed bottom-0 left-0 w-full h-[70vh] bg-midnight border-t border-border z-50 translate-y-full transition-transform duration-300 ease-in-out md:hidden flex flex-col p-4;
}

#chat-overlay.open {
  @apply translate-y-0;
}

#chat-overlay-close {
  @apply self-end bg-transparent border-none p-2 text-muted hover:text-neon mb-2;
}
```

**Step 10: Add mobile content padding for toolbar**

After the overlay styles, add:
```css
#content-viewer {
  @apply pt-16 lg:pt-4;
}
```

Wait — this would conflict with the earlier `#content-viewer` rule. Instead, merge the `pt-16` into the existing rule:

Go back to Step 4 and use this instead:
```css
#content-viewer {
  @apply grow shrink basis-0 min-w-0 pt-16 pb-4 px-4 sm:px-6 sm:pb-6 lg:pt-6 lg:pb-6;
}
```

**Step 11: Add floating chat button styles**

```css
#mobile-chat-fab {
  @apply fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-neon text-midnight flex items-center justify-center shadow-lg md:hidden;
}

#mobile-chat-fab:hover {
  @apply bg-teal;
}
```

**Step 12: Delete the entire `@media (max-width: 767px)` block**

Delete lines 202–255 (the entire `@media (max-width: 767px) { ... }` block and everything inside it).

**Step 13: Run the build to verify no CSS errors**

Run: `just app::build`
Expected: Build succeeds (pages may look wrong visually, but no compile errors)

**Step 14: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.css
git commit -m "refactor(layout): replace BaseLayout CSS media queries with Tailwind responsive utilities"
```

---

### Task 2: BaseLayout.astro — Restructure markup for responsive layout

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro:36-96`

**Step 1: Replace the mobile toolbar chat button with `md:hidden`**

In `#mobile-toolbar-right`, add `class="md:hidden"` to the chat button:

Replace:
```html
        <button id="mobile-chat-btn" type="button" aria-label="Open chat">
```

With:
```html
        <button id="mobile-chat-btn" class="md:hidden" type="button" aria-label="Open chat">
```

**Step 2: Replace `#drawer-backdrop` with nav and chat backdrops**

Replace:
```html
    <div id="drawer-backdrop"></div>
```

With:
```html
    <div id="nav-backdrop" class="lg:hidden"></div>
    <div id="chat-overlay-backdrop" class="md:hidden"></div>
```

**Step 3: Add the nav slide-down panel wrapping a duplicate ProjectTree**

After the `#nav-backdrop` div and before `<div id="layout">`, add:
```html
    <div id="nav-panel" class="lg:hidden">
      <ProjectTree activePage={activePage} activeCollection={activeCollection} />
    </div>
```

Note: This means ProjectTree is rendered twice — once in the sidebar (visible on `lg+`) and once in the nav panel (visible on `< lg`). This is the simplest approach since Astro SSG renders both at build time; there's no runtime cost beyond the HTML.

**Step 4: Add floating chat button and chat overlay**

After `</div>` (closing `#layout`) and before `<CommandPalette />`, add:
```html
    <button id="mobile-chat-fab" type="button" aria-label="Open chat">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
    <div id="chat-overlay" class="md:hidden">
      <button id="chat-overlay-close" type="button" aria-label="Close chat">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div id="chat-overlay-content"></div>
    </div>
```

**Step 5: Build to verify**

Run: `just app::build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro
git commit -m "refactor(layout): restructure BaseLayout markup for responsive nav panel and chat overlay"
```

---

### Task 3: BaseLayout.ts — Rewrite drawer logic

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.ts:1-57`

**Step 1: Rewrite the entire file**

Replace the full contents of `BaseLayout.ts` with:

```typescript
function initResponsiveUI() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const searchBtn = document.getElementById("mobile-search-btn");
  const chatBtn = document.getElementById("mobile-chat-btn");
  const navPanel = document.getElementById("nav-panel");
  const navBackdrop = document.getElementById("nav-backdrop");
  const chatFab = document.getElementById("mobile-chat-fab");
  const chatOverlay = document.getElementById("chat-overlay");
  const chatOverlayClose = document.getElementById("chat-overlay-close");
  const chatOverlayBackdrop = document.getElementById("chat-overlay-backdrop");

  function closeNav() {
    navPanel?.classList.remove("open");
    navBackdrop?.classList.remove("visible");
    document.body.style.overflow = "";
  }

  function closeChat() {
    chatOverlay?.classList.remove("open");
    chatOverlayBackdrop?.classList.remove("visible");
    document.body.style.overflow = "";
  }

  function closeAll() {
    closeNav();
    closeChat();
  }

  // Nav slide-down panel toggle
  menuBtn?.addEventListener("click", () => {
    const willOpen = !navPanel?.classList.contains("open");
    closeAll();
    if (willOpen) {
      navPanel?.classList.add("open");
      navBackdrop?.classList.add("visible");
      document.body.style.overflow = "hidden";
    }
  });

  navBackdrop?.addEventListener("click", closeNav);

  // Close nav when a nav link is clicked
  navPanel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  // Mobile chat overlay toggle (toolbar button)
  chatBtn?.addEventListener("click", () => {
    closeNav();
    chatOverlay?.classList.add("open");
    chatOverlayBackdrop?.classList.add("visible");
    document.body.style.overflow = "hidden";
  });

  // Mobile chat FAB
  chatFab?.addEventListener("click", () => {
    closeNav();
    chatOverlay?.classList.add("open");
    chatOverlayBackdrop?.classList.add("visible");
    document.body.style.overflow = "hidden";
  });

  // Close chat overlay
  chatOverlayClose?.addEventListener("click", closeChat);
  chatOverlayBackdrop?.addEventListener("click", closeChat);

  // Search button closes everything (CommandPalette handles opening itself)
  searchBtn?.addEventListener("click", closeAll);
}

document.addEventListener("astro:page-load", initResponsiveUI);

// Preserve nav scroll across View Transitions
let savedNavScroll = 0;
document.addEventListener("astro:before-swap", () => {
  const nav = document.getElementById("site-nav");
  if (nav) savedNavScroll = nav.scrollTop;
  document.body.style.overflow = "";
});
document.addEventListener("astro:after-swap", () => {
  const nav = document.getElementById("site-nav");
  if (nav) nav.scrollTop = savedNavScroll;
});
```

**Step 2: Build to verify**

Run: `just app::build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.ts
git commit -m "refactor(layout): rewrite BaseLayout.ts for responsive nav panel and chat overlay"
```

---

### Task 4: ProjectTree — Remove media queries, add responsive classes

**Files:**
- Modify: `app/src/components/ProjectTree/ProjectTree.css:1-88`
- Modify: `app/src/components/ProjectTree/ProjectTree.astro:13-66`

**Step 1: Remove media queries from ProjectTree.css**

Delete lines 8-12 (the `@media (min-width: 768px)` block):
```css
@media (min-width: 768px) {
  #site-nav {
    @apply relative;
  }
}
```

Delete lines 80-88 (the `@media (max-width: 767px)` block):
```css
@media (max-width: 767px) {
  .nav-search-trigger {
    @apply hidden;
  }

  #site-nav h2 {
    @apply hidden;
  }
}
```

And add `relative` to the base `#site-nav` rule (since on `lg+` it's always visible and needs `position: relative`):

Replace:
```css
#site-nav {
  @apply font-body;
}
```

With:
```css
#site-nav {
  @apply font-body relative;
}
```

**Step 2: Add responsive visibility classes in ProjectTree.astro**

The search trigger and brand heading are always visible now since `#site-nav` itself is `hidden lg:block`. But in the nav panel (mobile/tablet), we also want the heading and search trigger visible. Since both instances of ProjectTree render the same markup, and `#site-nav` handles visibility via `hidden lg:block`, the nav panel copy shows everything. This works as-is — no markup changes needed for ProjectTree.astro.

Actually, wait — the search trigger should still be hidden inside the nav panel since the toolbar already has a search button. Let's add `hidden lg:flex` to it:

In `ProjectTree.astro`, replace:
```html
  <button class="nav-search-trigger" type="button" id="nav-search-btn">
```

With:
```html
  <button class="nav-search-trigger hidden lg:flex" type="button" id="nav-search-btn">
```

And hide the brand `h2` in the nav panel too (toolbar has brand):

Replace:
```html
  <h2><a href="/" class="nav-heading-link">thalida</a></h2>
```

With:
```html
  <h2 class="hidden lg:block"><a href="/" class="nav-heading-link">thalida</a></h2>
```

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add app/src/components/ProjectTree/ProjectTree.css app/src/components/ProjectTree/ProjectTree.astro
git commit -m "refactor(nav): remove ProjectTree media queries, add Tailwind responsive classes"
```

---

### Task 5: CommandPalette — Remove media queries, add responsive classes

**Files:**
- Modify: `app/src/components/CommandPalette/CommandPalette.css:126-138`
- Modify: `app/src/components/CommandPalette/CommandPalette.astro:22,31`

**Step 1: Remove the media query from CommandPalette.css**

Delete lines 126-138:
```css
@media (max-width: 767px) {
  .cp-overlay--open {
    @apply items-start;
  }

  .cp-dialog {
    @apply max-w-full rounded-none max-h-1/2 mt-12;
  }

  .cp-footer {
    @apply hidden;
  }
}
```

**Step 2: Update `.cp-dialog` with responsive classes**

Replace:
```css
.cp-dialog {
  @apply relative w-full max-w-lg bg-surface rounded-lg overflow-hidden font-body flex flex-col max-h-3/5 shadow-dialog;
}
```

With:
```css
.cp-dialog {
  @apply relative w-full max-w-full mt-12 rounded-none md:max-w-lg md:mt-0 md:rounded-lg bg-surface overflow-hidden font-body flex flex-col max-h-1/2 md:max-h-3/5 shadow-dialog;
}
```

**Step 3: Update `.cp-overlay--open` with responsive classes**

Replace:
```css
.cp-overlay--open {
  @apply flex items-center justify-center;
}
```

With:
```css
.cp-overlay--open {
  @apply flex items-start md:items-center justify-center;
}
```

**Step 4: Update `.cp-footer` with responsive classes**

Replace:
```css
.cp-footer {
  @apply flex gap-4 py-2 px-4 border-t border-border text-xs text-muted;
}
```

With:
```css
.cp-footer {
  @apply hidden md:flex gap-4 py-2 px-4 border-t border-border text-xs text-muted;
}
```

**Step 5: Build to verify**

Run: `just app::build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add app/src/components/CommandPalette/CommandPalette.css
git commit -m "refactor(command-palette): replace media queries with Tailwind responsive utilities"
```

---

### Task 6: CollectionGrid — Remove media queries, add responsive classes

**Files:**
- Modify: `app/src/components/CollectionGrid/CollectionGrid.css:49-236`

**Step 1: Update `.items-grid` with responsive columns**

Replace:
```css
.items-grid {
  @apply grid gap-4 grid-cols-2;
}
```

With:
```css
.items-grid {
  @apply grid gap-4 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3;
}
```

**Step 2: Update masonry mobile fallback**

The masonry JS in `CollectionGrid.astro` already checks `cols <= 1` and disables masonry. With `grid-cols-1` as the default (mobile), this works automatically. No JS changes needed.

**Step 3: Delete the `@media (min-width: 1536px)` block (lines 221-225)**

Delete:
```css
@media (min-width: 1536px) {
  .items-grid {
    @apply grid-cols-3;
  }
}
```

**Step 4: Delete the `@media (max-width: 639px)` block (lines 227-236)**

Delete:
```css
@media (max-width: 639px) {
  .items-grid {
    @apply grid-cols-1;
  }

  .items-grid.masonry-ready {
    @apply gap-4;
    grid-auto-rows: auto;
  }
}
```

**Step 5: Add masonry single-column override to the base `.masonry-ready` rule**

The masonry JS already handles disabling masonry on single-column. But we should ensure the CSS doesn't break. The existing `.items-grid.masonry-ready` rule sets `gap-y-0` and `grid-auto-rows: 10px`, which is wrong for single-column. The JS removes the `masonry-ready` class on mobile, so this is fine — no CSS change needed.

**Step 6: Build to verify**

Run: `just app::build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add app/src/components/CollectionGrid/CollectionGrid.css
git commit -m "refactor(grid): replace CollectionGrid media queries with Tailwind responsive utilities"
```

---

### Task 7: Page-specific styles — index.astro and about.astro

**Files:**
- Modify: `app/src/pages/index.astro:196-206`
- Modify: `app/src/pages/about.astro:113-121`

**Step 1: Replace index.astro media query with responsive class**

Replace the `.home-projects` block and its media query (lines 197-206):
```css
  .home-projects {
    @apply grid gap-4;
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    .home-projects {
      grid-template-columns: repeat(3, 1fr);
    }
  }
```

With:
```css
  .home-projects {
    @apply grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
  }
```

**Step 2: Replace about.astro media query with responsive class**

Replace the `.about-photos` block and its media query (lines 113-121):
```css
  .about-photos {
    @apply grid grid-cols-4 gap-2 mb-6;
  }

  @media (max-width: 767px) {
    .about-photos {
      @apply grid-cols-2;
    }
  }
```

With:
```css
  .about-photos {
    @apply grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6;
  }
```

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add app/src/pages/index.astro app/src/pages/about.astro
git commit -m "refactor(pages): replace page-specific media queries with Tailwind responsive utilities"
```

---

### Task 8: Final build and verification

**Step 1: Run a full build**

Run: `just app::build`
Expected: Build succeeds with zero errors

**Step 2: Verify no remaining layout media queries**

Run: `grep -rn "@media" app/src/ --include="*.css" --include="*.astro" | grep -v "prefers-color-scheme"`
Expected: No results (only the `prefers-color-scheme` query in `live-window.css` should remain)

**Step 3: Run all tests**

Run: `just test`
Expected: All tests pass

**Step 4: Start the dev server for visual verification**

Run: `just app::serve`
Expected: Site loads. Manually verify:
- **Desktop (1024px+):** Three columns, same as before
- **Tablet (768px–1023px):** Content + chat visible, header bar with hamburger, slide-down nav panel works
- **Mobile (< 768px):** Single column, header bar, slide-down nav, floating chat FAB, chat overlay works

**Step 5: Final commit if any fixes needed**

If visual testing reveals issues, fix and commit individually.
