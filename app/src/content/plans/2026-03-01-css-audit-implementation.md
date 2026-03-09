---
title: "CSS Audit Implementation Plan"
description: "Remove all HTML IDs, inline styles, and hardcoded JS styles — replacing them with data attributes (JS targeting), CSS classes (styling), and Tailwind utilities."
publishedOn: 2026-03-01
planType: "implementation"
topic: "css-audit"
status: "completed"
---

# CSS Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all HTML IDs, inline styles, and hardcoded JS styles — replacing them with data attributes (JS targeting), CSS classes (styling), and Tailwind utilities.

**Architecture:** Component-namespaced data attributes (`data-layout`, `data-nav`, `data-cp`, `data-chat`, `data-login`, `data-home`) replace all IDs. Classes replace ID selectors in `<style>` blocks. Tailwind replaces inline `style=` attributes. Class toggling replaces `element.style.*` in JS.

**Tech Stack:** Astro 5, Tailwind CSS v4 (`@tailwindcss/vite`), TypeScript

**Design doc:** `docs/plans/2026-03-01-css-audit-design.md`

---

### Task 1: Add `--color-error` to theme and convert inline styles to Tailwind

Small standalone changes with no cross-dependencies.

**Files:**
- Modify: `app/src/styles/theme.css`
- Modify: `app/src/components/SpotifyPlayer/SpotifyPlayer.astro`
- Modify: `app/src/components/SectionHeader/SectionHeader.astro`
- Modify: `app/src/components/Card/LinkCard.astro`
- Modify: `app/src/pages/index.astro:64`
- Modify: `app/src/components/CommandPalette/CommandPalette.astro:157`

**Step 1: Add `--color-error` to theme.css**

In `app/src/styles/theme.css`, add inside `@theme {}` block after `--color-admin`:

```css
  --color-error: #ff4444;
```

**Step 2: Replace inline styles with Tailwind classes**

In `app/src/components/SpotifyPlayer/SpotifyPlayer.astro`:

Line 5 — remove `style="transform: scale(0.88); transform-origin: bottom left; margin-right: -12%;"`, add Tailwind classes:
```html
<div class="mt-auto pt-3 scale-[0.88] origin-bottom-left mr-[-12%]">
```

Line 16 — remove `style="border-radius:12px;"`, add class:
```html
    loading="lazy"
    class="rounded-xl"></iframe>
```

In `app/src/components/SectionHeader/SectionHeader.astro`:

Line 21 — remove `style="font-size:0.55em"`, add class:
```html
        <i class="fa-solid fa-chevron-right text-[0.55em]" aria-hidden="true" />
```

In `app/src/components/Card/LinkCard.astro`:

Line 59 — remove `style="font-size:10px"`, add class:
```html
      <i class="fa-solid fa-arrow-up-right-from-square text-muted opacity-60 text-[10px]" aria-hidden="true"
```

In `app/src/pages/index.astro`:

Line 64 — remove `style="min-width:max-content"`, add class:
```html
      <div class="home-timeline__track flex gap-6 pb-4 relative min-w-max">
```

In `app/src/components/CommandPalette/CommandPalette.astro`:

Line 157 — remove `style="font-size:10px"`, add class:
```html
          style="font-size:10px"    →    class removed, Tailwind added
```
Change:
```html
          <i
            class="fa-solid fa-arrow-up-right-from-square text-muted opacity-60"
            style="font-size:10px"
            aria-hidden="true"></i>
```
To:
```html
          <i
            class="fa-solid fa-arrow-up-right-from-square text-muted opacity-60 text-[10px]"
            aria-hidden="true"></i>
```

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add app/src/styles/theme.css app/src/components/SpotifyPlayer/SpotifyPlayer.astro app/src/components/SectionHeader/SectionHeader.astro app/src/components/Card/LinkCard.astro app/src/pages/index.astro app/src/components/CommandPalette/CommandPalette.astro
git commit -m "refactor: replace inline styles with Tailwind utilities and add --color-error to theme"
```

---

### Task 2: Migrate ProjectTree component (HTML + CSS + TS + cross-refs)

Migrate all ProjectTree IDs to data attributes. Update ALL files that reference ProjectTree elements.

**Files:**
- Modify: `app/src/components/ProjectTree/ProjectTree.astro`
- Modify: `app/src/components/ProjectTree/ProjectTree.ts`
- Modify: `app/src/layouts/BaseLayout/BaseLayout.ts` (lines 97, 102 — `site-nav` refs)
- Modify: `app/src/components/CommandPalette/CommandPalette.ts` (lines 65, 315 — `site-nav`, `js-nav-search-btn` refs)
- Modify: `app/src/components/Chat/chat-client.ts` (line 396 — `js-admin-link` ref)

**Step 1: Update ProjectTree.astro HTML**

Line 16 — change `id="site-nav"` to `data-nav="root" class="nav-root ..."`:
```html
<nav
  data-nav="root"
  class="nav-root font-body relative xl:flex xl:flex-col min-h-full overflow-y-auto overflow-x-hidden hidden xl:shrink-0 xl:grow-0 xl:basis-1/5 xl:max-w-64 xl:py-3 xl:pl-3 xl:pr-0"
  aria-label="Main navigation"
  data-active-collection={activeCollection || ""}
>
```

Line 28 — change `id="js-nav-search-btn"` to `data-nav="search-btn"`:
```html
    id="js-nav-search-btn"    →    data-nav="search-btn"
```

Line 69 — change `id="js-admin-link"` to `data-nav="admin-link"`:
```html
    id="js-admin-link"    →    data-nav="admin-link"
```

**Step 2: Update ProjectTree.astro `<style>` block**

Line 80 — change `:global(#nav-panel) #site-nav` to `:global(.layout-nav-panel) .nav-root`:
```css
<style>
  :global(.layout-nav-panel) .nav-root {
    @apply flex flex-col p-3;
  }
</style>
```

**Step 3: Update ProjectTree.ts**

Line 2 — change `getElementById("site-nav")` to `querySelector`:
```ts
  const siteNav = document.querySelector<HTMLElement>('[data-nav="root"]');
```

Line 9 — the `.nav-search-shortcut` querySelector is dead code (no element has this class). Remove or keep as-is. Since the element with `⌘K` text is a `<kbd>` with only Tailwind classes (line 32 of ProjectTree.astro), this code never matches. Remove the dead code:

Replace lines 5-12:
```ts
  // Platform detection for keyboard shortcut hint
  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ?? navigator.platform;
  const isMac = platform.toUpperCase().includes("MAC");
  const shortcutHint = siteNav.querySelector(".nav-search-shortcut");
  if (shortcutHint) {
    shortcutHint.textContent = isMac ? "⌘K" : "Ctrl+K";
  }
```
With (using a data attribute for the kbd element):
```ts
  // Platform detection for keyboard shortcut hint
  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ?? navigator.platform;
  const isMac = platform.toUpperCase().includes("MAC");
  const shortcutHint = siteNav.querySelector<HTMLElement>('[data-nav="shortcut-hint"]');
  if (shortcutHint) {
    shortcutHint.textContent = isMac ? "⌘K" : "Ctrl+K";
  }
```

And add `data-nav="shortcut-hint"` to the kbd element in ProjectTree.astro line 32:
```html
    <kbd data-nav="shortcut-hint" class="text-xs py-0.5 px-2 border border-border rounded bg-surface-active text-muted font-body">⌘K</kbd>
```

**Step 4: Update cross-component references**

In `app/src/layouts/BaseLayout/BaseLayout.ts`:

Line 97 — change `getElementById("site-nav")`:
```ts
  const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
```

Line 102 — same:
```ts
  const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
```

In `app/src/components/CommandPalette/CommandPalette.ts`:

Line 65 — change `getElementById("site-nav")`:
```ts
    const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
```

Line 315 — change `querySelectorAll("#js-nav-search-btn")`:
```ts
  document.querySelectorAll('[data-nav="search-btn"]').forEach((btn) => {
```

In `app/src/components/Chat/chat-client.ts`:

Line 396 — change `querySelectorAll("#js-admin-link")`:
```ts
  const adminLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav="admin-link"]');
```

**Step 5: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add app/src/components/ProjectTree/ app/src/layouts/BaseLayout/BaseLayout.ts app/src/components/CommandPalette/CommandPalette.ts app/src/components/Chat/chat-client.ts
git commit -m "refactor: migrate ProjectTree IDs to data-nav attributes"
```

---

### Task 3: Migrate Chat component (HTML + CSS + TS + cross-refs)

Migrate all Chat IDs to data attributes. Update CSS to use classes.

**Files:**
- Modify: `app/src/components/Chat/Chat.astro`
- Modify: `app/src/components/Chat/chat-client.ts`
- Modify: `app/src/layouts/BaseLayout/BaseLayout.ts` (lines 5, 75 — `js-chat-panel`, `chat-overlay-close` refs)

**Step 1: Update Chat.astro HTML**

Line 6 — `id="js-chat-panel"` → `data-chat="panel"`:
```html
<aside
  data-chat="panel"
  class="hidden lg:flex lg:flex-col lg:border-l lg:border-border font-body overflow-y-auto overflow-x-hidden lg:shrink-0 lg:grow-0 lg:w-80 lg:min-w-80"
  transition:persist="chat"
>
```

Line 13 — `id="js-chat-owner-wrap"` → `data-chat="owner-wrap"`:
```html
      <span class="flex items-center gap-1" data-chat="owner-wrap" title="Site owner: offline">
```

Line 15 — `id="js-chat-status-dot"` → `data-chat="owner-status-dot"`:
```html
          data-chat="owner-status-dot"
```
Note: keep the existing classes. Full element:
```html
        <span
          data-chat="owner-status-dot"
          class="inline-block self-center shrink-0 w-1.5 h-1.5 rounded-full bg-muted/50 data-online:bg-neon/70"></span>
```

Line 17 — `id="js-chat-owner-status"` → `data-chat="owner-status"`:
```html
        <span data-chat="owner-status" class="text-admin">offline</span>
```

Line 20 — `id="js-chat-user-count"` → `data-chat="user-count"`:
```html
      <span data-chat="user-count" title="0 online"
```

Line 24 — `id="chat-overlay-close"` → `data-chat="overlay-close"`:
```html
    <button data-chat="overlay-close" class="hidden" type="button" aria-label="Close chat">
```

Line 30 — `id="js-chat-messages"` → `data-chat="messages"`:
```html
    <div data-chat="messages" class="flex-1 text-sm text-text overflow-y-auto min-h-0"></div>
```

Lines 31-45 — `id="js-chat-username-row"` → use `<label>` wrapping for accessibility (removes need for `for`/`id`):
```html
    <label data-chat="username-row" class="flex items-center gap-1.5">
      <span class="whitespace-nowrap uppercase tracking-widest font-body text-2xs text-muted">
        chatting as
      </span>
      <input
        data-chat="username-input"
        class="chat-username-input flex-1 py-0.5 px-1 text-xs font-body bg-transparent text-text min-w-0 focus:outline-none"
        type="text"
        autocomplete="off"
        minlength="2"
        maxlength="20"
        pattern="[a-z0-9_.-]+"
        title="2-20 characters: lowercase letters, numbers, hyphens, underscores, dots. No spaces."
      />
    </label>
```

Line 48 — `id="js-chat-input"` → `data-chat="input"`:
```html
        data-chat="input"
```

Line 55 — `id="js-chat-send"` → `data-chat="send"`:
```html
        data-chat="send"
```

Line 63 — `id="chat-msg-tpl"` → `data-chat="msg-tpl"`:
```html
<template data-chat="msg-tpl">
```

Line 98 — `id="chat-notice-tpl"` → `data-chat="notice-tpl"`:
```html
<template data-chat="notice-tpl">
```

**Step 2: Update Chat.astro `<style>` block**

Replace the entire `<style>` block (lines 113-133):
```css
<style>
  .chat-username-input {
    border: none;
    border-bottom: 1px dashed var(--color-border);
    border-radius: 0;
    box-shadow: none;
  }
  .chat-username-input:focus {
    border-bottom-color: var(--color-teal);
  }
  .chat-username-input:read-only {
    border-bottom: none;
    cursor: default;
  }
  .chat-delete-confirm {
    color: #f87171;
  }
  .chat-flag-confirm {
    color: #facc15;
  }
</style>
```

Note: `data-confirm` state was using nonexistent CSS vars (`--color-red-400`, `--color-yellow-400`) with hardcoded fallbacks. The new class-based approach uses the fallback colors directly.

**Step 3: Update chat-client.ts**

Replace all `getElementById` calls (lines 84-92):
```ts
const usernameInput = document.querySelector<HTMLInputElement>('[data-chat="username-input"]')!;
const usernameRow = document.querySelector<HTMLLabelElement>('[data-chat="username-row"]')!;
const messagesEl = document.querySelector<HTMLDivElement>('[data-chat="messages"]')!;
const inputEl = document.querySelector<HTMLInputElement>('[data-chat="input"]')!;
const sendBtn = document.querySelector<HTMLButtonElement>('[data-chat="send"]')!;
const statusDotEl = document.querySelector<HTMLSpanElement>('[data-chat="owner-status-dot"]')!;
const ownerStatusEl = document.querySelector<HTMLSpanElement>('[data-chat="owner-status"]')!;
const ownerWrapEl = document.querySelector<HTMLSpanElement>('[data-chat="owner-wrap"]')!;
const userCountEl = document.querySelector<HTMLSpanElement>('[data-chat="user-count"]')!;
```

Replace template element queries (lines 106-107):
```ts
const msgTpl = document.querySelector<HTMLTemplateElement>('[data-chat="msg-tpl"]')!;
const noticeTpl = document.querySelector<HTMLTemplateElement>('[data-chat="notice-tpl"]')!;
```

For the `data-confirm` → class-based approach, search the codebase for where `data-confirm` is set. If it's set in JS (e.g., `el.dataset.confirm = ""`), change it to `el.classList.add("chat-delete-confirm")` / `el.classList.add("chat-flag-confirm")`. If not found, the CSS rules are dead code — keep the new class-based versions for future use.

**Step 4: Update BaseLayout.ts cross-refs**

Line 5 — change `getElementById("js-chat-panel")`:
```ts
  const chatPanel = document.querySelector<HTMLElement>('[data-chat="panel"]');
```

Line 75 — change `getElementById("chat-overlay-close")`:
```ts
  const chatOverlayClose = document.querySelector<HTMLElement>('[data-chat="overlay-close"]');
```

**Step 5: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add app/src/components/Chat/ app/src/layouts/BaseLayout/BaseLayout.ts
git commit -m "refactor: migrate Chat IDs to data-chat attributes and class selectors"
```

---

### Task 4: Migrate BaseLayout component (HTML + CSS + TS + cross-refs)

Migrate all BaseLayout-owned IDs to data attributes.

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro`
- Modify: `app/src/layouts/BaseLayout/BaseLayout.ts`
- Modify: `app/src/components/CommandPalette/CommandPalette.ts` (line 324 — `toolbar-search-btn` ref)

**Step 1: Update BaseLayout.astro HTML**

Line 68 — `id="toolbar-search-btn"` → `data-layout="search-btn"`:
```html
        <button
          data-layout="search-btn"
          class="bg-transparent border-none p-2 text-muted hover:text-neon"
          type="button"
          aria-label="Search"
        >
```

Line 76 — `id="js-toolbar-menu-btn"` → `data-layout="menu-btn"`:
```html
        <button
          data-layout="menu-btn"
          class="bg-transparent border-none p-2 text-muted hover:text-neon"
          type="button"
          aria-label="Open navigation"
        >
```

Line 86 — `id="nav-backdrop"` → `data-layout="nav-backdrop" class="layout-nav-backdrop ..."`:
```html
    <div
      data-layout="nav-backdrop"
      class="layout-nav-backdrop hidden fixed top-12 left-0 right-0 lg:right-80 h-[calc(100svh-48px)] z-40 bg-midnight/70 backdrop-blur-xs xl:hidden"
    >
```

Line 90 — `id="chat-overlay-backdrop"` → `data-layout="chat-overlay-backdrop" class="layout-chat-overlay-backdrop ..."`:
```html
    <div data-layout="chat-overlay-backdrop" class="layout-chat-overlay-backdrop hidden fixed inset-0 z-40 bg-midnight/70 backdrop-blur-xs lg:hidden"></div>
```

Line 92 — `id="nav-panel"` → `data-layout="nav-panel" class="layout-nav-panel ..."`:
```html
    <div
      data-layout="nav-panel"
      class="layout-nav-panel fixed top-12 left-0 right-0 lg:right-80 max-h-[calc(100svh-3rem)] overflow-y-auto bg-midnight/95 backdrop-blur-md border-b border-border z-50 -translate-y-[calc(100%+4px)] transition-[translate] duration-300 ease-in-out xl:hidden"
    >
```

Line 107 — `id="js-mobile-chat-fab"` → `data-layout="chat-fab"`:
```html
    <button
      data-layout="chat-fab"
      class="fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-teal text-midnight flex items-center justify-center shadow-lg lg:hidden hover:bg-neon"
      type="button"
      aria-label="Open chat"
    >
```

Line 115 — `id="chat-overlay"` → `data-layout="chat-overlay" class="layout-chat-overlay ..."`:
```html
    <div
      data-layout="chat-overlay"
      class="layout-chat-overlay fixed bottom-0 left-0 w-full h-[85vh] bg-midnight border-t border-border z-50 translate-y-full transition-[translate] duration-300 ease-in-out lg:hidden flex flex-col px-4 pt-2 pb-4"
    >
```

Line 118 — `id="js-chat-overlay-content"` → `data-layout="chat-overlay-content"`:
```html
      <div data-layout="chat-overlay-content" class="flex flex-col flex-1 min-h-0 font-body gap-2"></div>
```

**Step 2: Update BaseLayout.astro `<style is:global>` block**

Replace the entire `<style is:global>` block (lines 125-150):
```css
<style is:global>
  .layout-nav-backdrop.visible,
  .layout-chat-overlay-backdrop.visible {
    @apply block;
  }

  .layout-nav-panel.open {
    translate: 0;
  }

  .layout-chat-overlay.open {
    translate: 0;
  }

  .layout-chat-overlay .layout-chat-overlay-close {
    @apply block bg-transparent border-none p-1 text-muted;
  }

  .layout-chat-overlay .layout-chat-overlay-close:hover {
    @apply text-neon;
  }
</style>
```

Note: The close button inside Chat.astro also needs the `.layout-chat-overlay-close` class. Add it to the button in Chat.astro:
```html
    <button data-chat="overlay-close" class="layout-chat-overlay-close hidden" type="button" aria-label="Close chat">
```

**Step 3: Update BaseLayout.ts**

Replace all `getElementById` calls and `style.overflow` assignments. Full rewrite of lines 1-9:
```ts
function initResponsiveUI() {
  const menuBtn = document.querySelector<HTMLElement>('[data-layout="menu-btn"]');
  const navPanel = document.querySelector<HTMLElement>('[data-layout="nav-panel"]');
  const navBackdrop = document.querySelector<HTMLElement>('[data-layout="nav-backdrop"]');
  const chatPanel = document.querySelector<HTMLElement>('[data-chat="panel"]');
  const chatFab = document.querySelector<HTMLElement>('[data-layout="chat-fab"]');
  const chatOverlay = document.querySelector<HTMLElement>('[data-layout="chat-overlay"]');
  const chatOverlayBackdrop = document.querySelector<HTMLElement>('[data-layout="chat-overlay-backdrop"]');
  const chatOverlayContent = document.querySelector<HTMLElement>('[data-layout="chat-overlay-content"]');
```

Replace all `document.body.style.overflow` occurrences:

Line 14 — `document.body.style.overflow = "";` → `document.body.classList.remove("overflow-hidden");`
Line 35 — `document.body.style.overflow = "";` → `document.body.classList.remove("overflow-hidden");`
Line 50 — `document.body.style.overflow = "hidden";` → `document.body.classList.add("overflow-hidden");`
Line 68 — `document.body.style.overflow = "hidden";` → `document.body.classList.add("overflow-hidden");`
Line 99 — `document.body.style.overflow = "";` → `document.body.classList.remove("overflow-hidden");`

Line 75 — already updated in Task 3 (chat-overlay-close → data-chat="overlay-close").

Lines 97, 102 — already updated in Task 2 (site-nav → data-nav="root").

**Step 4: Update CommandPalette.ts cross-ref**

Line 324 — change `getElementById("toolbar-search-btn")`:
```ts
  const tabletSearchBtn = document.querySelector<HTMLElement>('[data-layout="search-btn"]');
```

**Step 5: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add app/src/layouts/BaseLayout/ app/src/components/CommandPalette/CommandPalette.ts app/src/components/Chat/Chat.astro
git commit -m "refactor: migrate BaseLayout IDs to data-layout attributes and class selectors"
```

---

### Task 5: Migrate CommandPalette component (HTML + CSS + TS)

All cross-component refs already updated in previous tasks. This task handles CommandPalette's own elements.

**Files:**
- Modify: `app/src/components/CommandPalette/CommandPalette.astro`
- Modify: `app/src/components/CommandPalette/CommandPalette.ts`

**Step 1: Update CommandPalette.astro HTML**

Line 19 — `id="command-palette"` → `data-cp="overlay" class="cp-overlay ..."`:
```html
<div data-cp="overlay" class="cp-overlay hidden fixed inset-0 z-1000 overflow-hidden" aria-hidden="true">
```

Line 20 — `id="js-cp-backdrop"` → `data-cp="backdrop"`:
```html
  <div data-cp="backdrop" class="absolute inset-0 bg-midnight/70 backdrop-blur-sm"></div>
```

Line 22 — `id="js-cp-dialog"` → `data-cp="dialog" class="cp-dialog ..."`:
```html
    data-cp="dialog"
    class="cp-dialog relative w-full bg-surface overflow-hidden font-body flex flex-col shadow-dialog"
```

Line 29 — `id="js-cp-collection-select"` → `data-cp="collection-select"`:
```html
        data-cp="collection-select"
```

Line 37 — `id="js-cp-input"` → `data-cp="input"`:
```html
        data-cp="input"
```

Line 44 — `id="cp-results"` → `data-cp="results" class="cp-results ..."`:
```html
    <div class="cp-results overflow-y-auto flex-1 p-2" data-cp="results"></div>
```

Line 104 — `id="cp-row-tpl"` → `data-cp="row-tpl"`:
```html
<template data-cp="row-tpl">
```

Line 129 — `id="cp-row-external-tpl"` → `data-cp="row-external-tpl"`:
```html
<template data-cp="row-external-tpl">
```

Line 164 — `id="cp-empty-tpl"` → `data-cp="empty-tpl"`:
```html
<template data-cp="empty-tpl">
```

**Step 2: Update CommandPalette.astro `<style>` blocks**

Replace scoped `<style>` block (lines 61-81):
```css
<style>
  .cp-overlay.cp-overlay--open {
    @apply flex items-center justify-center;
  }
  .cp-dialog {
    max-width: calc(100% - 2rem);
    @apply rounded-lg;
    max-height: calc(100svh - 6rem);
  }
  @media (min-width: 768px) {
    .cp-dialog {
      max-width: 32rem;
      max-height: 60%;
    }
  }
  .cp-input::placeholder {
    color: color-mix(in srgb, var(--color-muted) 60%, transparent);
  }
</style>
```

Replace `<style is:global>` block (lines 82-102):
```css
<style is:global>
  .cp-results .cp-row--selected {
    @apply bg-surface-active text-white;
  }
  .cp-results .cp-row--selected .cp-row__title {
    @apply text-white;
  }
  .cp-results .cp-row__img--empty span {
    @apply gradient-text;
  }
  .cp-results .cp-row__initial {
    @apply gradient-text;
  }
</style>
```

**Step 3: Update CommandPalette.ts**

Replace all remaining `getElementById` calls.

Lines 45-53:
```ts
  const overlay = document.querySelector<HTMLElement>('[data-cp="overlay"]')!;
  const input = document.querySelector<HTMLInputElement>('[data-cp="input"]')!;
  const resultsContainer = document.querySelector<HTMLElement>('[data-cp="results"]')!;
  const collectionSelect = document.querySelector<HTMLSelectElement>('[data-cp="collection-select"]')!;

  if (!overlay || !input || !resultsContainer || !collectionSelect) return;

  const backdrop = document.querySelector<HTMLElement>('[data-cp="backdrop"]');
  const dialog = document.querySelector<HTMLElement>('[data-cp="dialog"]');
```

Lines 171-173:
```ts
  const cpRowTpl = document.querySelector<HTMLTemplateElement>('[data-cp="row-tpl"]')!;
  const cpRowExternalTpl = document.querySelector<HTMLTemplateElement>('[data-cp="row-external-tpl"]')!;
  const cpEmptyTpl = document.querySelector<HTMLTemplateElement>('[data-cp="empty-tpl"]')!;
```

Lines 315, 324 — already updated in Tasks 2 and 4.

**Step 4: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add app/src/components/CommandPalette/
git commit -m "refactor: migrate CommandPalette IDs to data-cp attributes and class selectors"
```

---

### Task 6: Migrate Homepage (index.astro) — JS + CSS cleanup

**Files:**
- Modify: `app/src/pages/index.astro`

**Step 1: Update HTML**

Line 28 — `id="js-greeting"` → `data-home="greeting"`:
```html
        <span data-home="greeting">Hey</span>, I'm&nbsp;Thalida
```

**Step 2: Update inline `<script>`**

Line 116 — change `getElementById("js-greeting")`:
```ts
    const el = document.querySelector<HTMLElement>('[data-home="greeting"]');
```

**Step 3: Update `<style>` block CSS cleanup**

In the `<style>` block, convert raw CSS to `@apply` where possible:

Line 177 — add `@apply` for positioning:
```css
  .home-timeline__track::before {
    content: "";
    @apply absolute border-t border-border top-[35px] left-0 right-0;
  }
```

Lines 190-192 — use theme token:
```css
  .home-timeline__name {
    @apply text-2xs;
  }
```

**Step 4: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "refactor: migrate homepage IDs to data-home and clean up CSS"
```

---

### Task 7: Clean up post page CSS ([...id].astro)

**Files:**
- Modify: `app/src/pages/[collection]/post/[...id].astro`

**Step 1: Convert raw CSS to `@apply` in `<style>` block**

Lines 187-194 — convert `.heading-anchor` raw CSS:
```css
  .post-content :global(.heading-anchor) {
    @apply opacity-0 ml-[0.35rem] text-muted no-underline font-normal transition-opacity duration-150;
  }
```

Lines 216-221 — convert `img`/`video` raw CSS:
```css
  .post-content :global(img),
  .post-content :global(video) {
    @apply max-w-full h-auto rounded-lg;
  }
```

**Step 2: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/src/pages/[collection]/post/
git commit -m "refactor: convert post page raw CSS to @apply"
```

---

### Task 8: Refactor login page onto BaseLayout + Tailwind

**Files:**
- Modify: `app/src/pages/login.astro`

**Step 1: Rewrite login.astro**

Replace the entire file. The page now uses BaseLayout and Tailwind:

```astro
---
const wsUrl = import.meta.env.PUBLIC_CHAT_WS_URL || "ws://localhost:8787/ws";
const LS_ADMIN_TOKEN_KEY = "admin_token";
const apiBase = wsUrl.replace(/^ws(s?):/, "http$1:").replace(/\/ws$/, "");
---

<BaseLayout title="login · thalida">
  <div class="flex items-center justify-center min-h-[calc(100vh-6rem)]">
    <div class="max-w-[360px] w-full p-8">
      <h1 class="m-0 mb-6 font-display font-bold text-neon text-2xl">Login</h1>
      <form data-login="form" class="flex flex-col gap-3">
        <input
          data-login="secret"
          type="password"
          placeholder="Enter password..."
          autocomplete="current-password"
          required
          class="py-2.5 px-3 border border-border rounded-md bg-surface text-text font-body text-sm focus:outline-none focus:border-teal"
        />
        <button
          type="submit"
          class="py-2.5 px-5 border-none rounded-md bg-teal text-midnight font-heading font-bold text-sm cursor-pointer hover:bg-neon transition-colors"
        >
          Log in
        </button>
        <p data-login="error" class="login-error m-0 text-error text-sm" hidden></p>
      </form>
      <p class="mt-6">
        <a href="/" class="text-teal text-sm no-underline hover:text-neon">&larr; back to chat</a>
      </p>
    </div>
  </div>
</BaseLayout>

<script is:inline define:vars={{ apiBase, LS_ADMIN_TOKEN_KEY }}>
  const form = document.querySelector('[data-login="form"]');
  const input = document.querySelector('[data-login="secret"]');
  const errorEl = document.querySelector('[data-login="error"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const secret = input.value.trim();
    if (!secret) return;

    errorEl.hidden = true;
    form.querySelector("button").disabled = true;

    try {
      const resp = await fetch(`${apiBase}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: secret }),
      });
      if (!resp.ok) {
        errorEl.textContent = "Invalid password.";
        errorEl.hidden = false;
        return;
      }
    } catch {
      errorEl.textContent = "Could not reach the API. Is the server running?";
      errorEl.hidden = false;
      return;
    } finally {
      form.querySelector("button").disabled = false;
    }

    localStorage.setItem(LS_ADMIN_TOKEN_KEY, secret);
    window.location.href = "/";
  });
</script>
```

Note: Add import for BaseLayout at the top of the frontmatter:
```ts
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
```

**Step 2: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/src/pages/login.astro
git commit -m "refactor: migrate login page to BaseLayout with Tailwind"
```

---

### Task 9: Refactor logout page onto BaseLayout + Tailwind

**Files:**
- Modify: `app/src/pages/logout.astro`

**Step 1: Rewrite logout.astro**

```astro
---
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
const LS_ADMIN_TOKEN_KEY = "admin_token";
---

<BaseLayout title="logging out… · thalida">
  <div class="flex items-center justify-center min-h-[calc(100vh-6rem)]">
    <p class="font-body text-text text-sm">Logging out&hellip;</p>
  </div>

  <script is:inline define:vars={{ LS_ADMIN_TOKEN_KEY }}>
    localStorage.removeItem(LS_ADMIN_TOKEN_KEY);
    window.location.href = "/";
  </script>

  <noscript>
    <p class="font-body text-text text-sm">JavaScript is required to log out. <a href="/" class="text-teal">Go back</a>.</p>
  </noscript>
</BaseLayout>
```

**Step 2: Build to verify**

Run: `just app::build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add app/src/pages/logout.astro
git commit -m "refactor: migrate logout page to BaseLayout with Tailwind"
```

---

### Task 10: Final build and typecheck verification

**Step 1: Run typecheck**

Run: `just app::typecheck`
Expected: No type errors.

**Step 2: Run full build**

Run: `just app::build`
Expected: Build succeeds with no errors or warnings.

**Step 3: Verify no remaining IDs**

Search for any remaining `id=` attributes in app source (excluding node_modules, dist):

```bash
grep -rn 'id=' app/src/ --include='*.astro' --include='*.ts' | grep -v 'data-' | grep -v 'clientId' | grep -v 'node_modules' | grep -v 'itemId' | grep -v 'msg.id' | grep -v 'data.id' | grep -v 'result.id' | grep -v '\.id ' | grep -v 'className'
```

Expected: No HTML `id=` attributes remain on elements (some `.id` property accesses in TS are fine — those are data properties, not HTML IDs).

**Step 4: Verify no remaining inline styles**

```bash
grep -rn 'style=' app/src/ --include='*.astro' | grep -v 'node_modules' | grep -v '<style' | grep -v 'is:global' | grep -v 'CardCover'
```

Expected: Only `CardCover.astro` (runtime-computed, approved exception) should have `style=`.

**Step 5: Verify no remaining `getElementById`**

```bash
grep -rn 'getElementById' app/src/ --include='*.ts' | grep -v 'node_modules'
```

Expected: No results.

**Step 6: Verify no remaining `document.body.style`**

```bash
grep -rn 'document.body.style' app/src/ --include='*.ts' | grep -v 'node_modules'
```

Expected: No results.
