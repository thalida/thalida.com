---
title: CSS Audit Design
description: "Establish clear separation of concerns across HTML, CSS, and JS:"
publishedOn: 2026-03-01T18:32:53.000Z
tags:
  - design
---

# CSS Audit Design

## Goal

Establish clear separation of concerns across HTML, CSS, and JS:

- **Tailwind classes** for all styling (no hardcoded inline styles)
- **`data-*` attributes** for JS targeting only (no IDs)
- **CSS classes** for custom styling in `<style>` blocks (not data-attr selectors, not IDs)
- **No IDs** anywhere in the codebase
- **No hardcoded `style.*` in JS** — use class toggling instead

## Scope

All files in `app/src/` **except** the `<live-window>` web component (`scripts/live-window/`), which uses Shadow DOM isolation and runtime-computed styles by design.

## Decisions

- **Data attribute convention:** Component-namespaced (`data-layout`, `data-nav`, `data-cp`, `data-chat`, `data-login`, `data-home`)
- **Tailwind data variants:** Keep as-is (`data-own:text-accent`, `data-admin:text-admin`, `data-online:bg-neon/70`, `data-active:*`) — this is Tailwind's intended pattern
- **Scroll locking:** Replace `document.body.style.overflow` with `classList.add/remove("overflow-hidden")`
- **Login/logout pages:** Refactor onto `BaseLayout` + Tailwind

---

## Section 1: Data Attribute Namespaces & ID Migration

### Namespace mapping

| Component | Namespace |
|-----------|-----------|
| BaseLayout | `data-layout` |
| ProjectTree/Nav | `data-nav` |
| CommandPalette | `data-cp` |
| Chat | `data-chat` |
| Login page | `data-login` |
| Homepage | `data-home` |

### BaseLayout (`data-layout`)

| Old ID | New data attr | CSS class |
|--------|--------------|-----------|
| `js-toolbar-menu-btn` | `data-layout="menu-btn"` | — |
| `nav-panel` | `data-layout="nav-panel"` | `.layout-nav-panel` |
| `nav-backdrop` | `data-layout="nav-backdrop"` | `.layout-nav-backdrop` |
| `chat-overlay` | `data-layout="chat-overlay"` | `.layout-chat-overlay` |
| `chat-overlay-backdrop` | `data-layout="chat-overlay-backdrop"` | `.layout-chat-overlay-backdrop` |
| `chat-overlay-close` | `data-layout="chat-overlay-close"` | `.layout-chat-overlay-close` |
| `js-chat-overlay-content` | `data-layout="chat-overlay-content"` | — |
| `js-mobile-chat-fab` | `data-layout="chat-fab"` | — |
| `toolbar-search-btn` | `data-layout="search-btn"` | — |

### ProjectTree/Nav (`data-nav`)

| Old ID | New data attr | CSS class |
|--------|--------------|-----------|
| `site-nav` | `data-nav="root"` | `.nav-root` |
| `js-nav-search-btn` | `data-nav="search-btn"` | — |
| `js-admin-link` | `data-nav="admin-link"` | — |

### Chat (`data-chat`)

| Old ID | New data attr | CSS class | Notes |
|--------|--------------|-----------|-------|
| `js-chat-panel` | `data-chat="panel"` | — | |
| `js-chat-owner-wrap` | `data-chat="owner-wrap"` | — | |
| `js-chat-status-dot` | `data-chat="owner-status-dot"` | — | Avoids collision with template `data-chat="status-dot"` |
| `js-chat-owner-status` | `data-chat="owner-status"` | — | |
| `js-chat-user-count` | `data-chat="user-count"` | — | No collision with template `data-chat="viewer-count"` |
| `js-chat-messages` | `data-chat="messages"` | — | |
| `js-chat-username-row` | `data-chat="username-row"` | — | |
| `chat-username` | `data-chat="username-input"` | `.chat-username-input` | Avoids collision with template `data-chat="username"` |
| `js-chat-input` | `data-chat="input"` | — | |
| `js-chat-send` | `data-chat="send"` | — | |
| `chat-msg-tpl` | `data-chat="msg-tpl"` | — | |
| `chat-notice-tpl` | `data-chat="notice-tpl"` | — | |

**CSS selector migration:**

| Current | New |
|---------|-----|
| `[data-chat="delete-btn"][data-confirm]` | `.chat-delete-confirm` (JS toggles class) |
| `[data-chat="flag-btn"][data-confirm]` | `.chat-flag-confirm` (JS toggles class) |

### CommandPalette (`data-cp`)

| Old ID | New data attr | CSS class |
|--------|--------------|-----------|
| `command-palette` | `data-cp="overlay"` | `.cp-overlay` |
| `js-cp-backdrop` | `data-cp="backdrop"` | — |
| `js-cp-dialog` | `data-cp="dialog"` | `.cp-dialog` |
| `js-cp-collection-select` | `data-cp="collection-select"` | — |
| `js-cp-input` | `data-cp="input"` | — |
| `cp-results` | `data-cp="results"` | `.cp-results` |
| `cp-row-tpl` | `data-cp="row-tpl"` | — |
| `cp-row-external-tpl` | `data-cp="row-external-tpl"` | — |
| `cp-empty-tpl` | `data-cp="empty-tpl"` | — |

### Login page (`data-login`)

| Old ID | New data attr | CSS class |
|--------|--------------|-----------|
| `js-admin-form` | `data-login="form"` | — |
| `js-admin-secret` | `data-login="secret"` | — |
| `js-admin-error` | `data-login="error"` | `.login-error` |

### Homepage (`data-home`)

| Old ID | New data attr | CSS class |
|--------|--------------|-----------|
| `js-greeting` | `data-home="greeting"` | — |

---

## Section 2: Inline Styles → Tailwind

| File | Current | Tailwind |
|------|---------|----------|
| `index.astro:64` | `style="min-width:max-content"` | `min-w-max` |
| `SpotifyPlayer.astro:5` | `style="transform: scale(0.88); transform-origin: bottom left; margin-right: -12%;"` | `scale-[0.88] origin-bottom-left mr-[-12%]` |
| `SpotifyPlayer.astro:16` | `style="border-radius:12px;"` | `rounded-xl` |
| `SectionHeader.astro:21` | `style="font-size:0.55em"` | `text-[0.55em]` |
| `LinkCard.astro:59` | `style="font-size:10px"` | `text-[10px]` |
| `CommandPalette.astro:157` | `style="font-size:10px"` | `text-[10px]` |

**Keep as inline style** (runtime-computed):
- `CardCover.astro:23` — dynamic `background-color`/`background-image` from server-side computation

---

## Section 3: `<style>` Block CSS Cleanup

### BaseLayout.astro `<style is:global>`

Replace ID selectors with class selectors:
- `#nav-backdrop.visible` → `.layout-nav-backdrop.visible`
- `#chat-overlay-backdrop.visible` → `.layout-chat-overlay-backdrop.visible`
- `#nav-panel.open` → `.layout-nav-panel.open`
- `#chat-overlay.open` → `.layout-chat-overlay.open`
- `#chat-overlay #chat-overlay-close` → `.layout-chat-overlay .layout-chat-overlay-close`

Convert raw CSS to `@apply` where Tailwind equivalents exist.

### CommandPalette.astro `<style>`

- `#command-palette.cp-overlay--open` → `.cp-overlay.cp-overlay--open`
- `#js-cp-dialog` → `.cp-dialog`
- `#cp-results` → `.cp-results`
- `.cp-row__img--empty span` and `.cp-row__initial` gradient rules → `@apply gradient-text`

### Chat.astro `<style>`

- `#chat-username` → `.chat-username-input`
- `[data-chat="delete-btn"][data-confirm]` → `.chat-delete-confirm`
- `[data-chat="flag-btn"][data-confirm]` → `.chat-flag-confirm`

### ProjectTree.astro `<style>`

- `:global(#nav-panel) #site-nav` → `:global(.layout-nav-panel) .nav-root`
- Convert `display: flex; flex-direction: column; padding: 0.75rem` → `@apply flex flex-col p-3`

### index.astro `<style>`

- `.home-timeline__name { font-size: 0.65rem }` → `@apply text-2xs`
- `.home-timeline__track::before` — convert `top: 35px; left: 0; right: 0` → `@apply top-[35px] left-0 right-0`
- Keep `mask-image` rules as-is (no Tailwind equivalent)
- Keep `-webkit-overflow-scrolling: touch` as-is (no Tailwind equivalent)

### login.astro `<style>`

- Replace `#js-admin-error` → `.login-error`
- (Entire page refactored onto BaseLayout in Section 5)

### [...id].astro (post page) `<style>`

- Convert remaining raw CSS to `@apply`: `max-width: 100%` → `@apply max-w-full`, `opacity: 0` → `@apply opacity-0`, etc.

---

## Section 4: JS Hardcoded Styles Cleanup

### BaseLayout.ts

Replace `document.body.style.overflow` with class toggling:
```ts
// Before
document.body.style.overflow = "hidden";
document.body.style.overflow = "";

// After
document.body.classList.add("overflow-hidden");
document.body.classList.remove("overflow-hidden");
```

Replace all `getElementById` with `querySelector('[data-layout="..."]')`.

### CommandPalette.ts

Replace all `getElementById` with `querySelector('[data-cp="..."]')`.

### chat-client.ts

Replace all `getElementById` with `querySelector('[data-chat="..."]')`.

### ProjectTree.ts

Replace `getElementById("site-nav")` with `querySelector('[data-nav="root"]')`.

### login.astro inline script

Replace `getElementById` calls with `querySelector('[data-login="..."]')`.

### index.astro inline script

Replace `getElementById("js-greeting")` with `querySelector('[data-home="greeting"]')`.

---

## Section 5: Login/Logout Page Refactoring

Refactor both pages to use `BaseLayout` + Tailwind:
- Wrap content in `<BaseLayout>` component
- Replace all raw CSS with Tailwind utility classes
- Remove duplicated CSS variable definitions
- Add `--color-error: #ff4444` to theme.css (currently only in login.astro)

---

## Out of Scope

- `<live-window>` web component (Shadow DOM isolation, runtime-computed styles)
- `CardCover.astro` dynamic inline style (server-computed values)
- Tailwind data-* variants (`data-own:text-accent`, etc.) — Tailwind's intended pattern
- `alerts.css` — generated by remark plugin, styles third-party HTML
- `cursors.css` — cursor overrides that extend Tailwind's cursor classes
- `base.css` — `@layer base` element resets (correct approach)
