---
title: Remove @apply — Implementation Plan
description: >-
  Replace all `@apply` directives with inline Tailwind utility classes on
  elements, delete separate CSS files, and keep only minimal `<style>` blocks
  for non-inlineable CSS.
publishedOn: 2026-02-28T03:51:29.000Z
planType: implementation
topic: remove-apply
category: code-quality
---

# Remove @apply — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all `@apply` directives with inline Tailwind utility classes on elements, delete separate CSS files, and keep only minimal `<style>` blocks for non-inlineable CSS.

**Architecture:** Component-by-component migration from simplest to most complex. Each task is one component. Inline Tailwind classes replace `@apply` rules. Remaining CSS (pseudo-elements, vendor prefixes, custom cursors) stays in scoped `<style>` blocks. The `@theme` block and Tailwind imports remain in BaseLayout.css.

**Tech Stack:** Astro, Tailwind CSS v4.2, TypeScript

**Design doc:** `docs/plans/2026-02-27-remove-apply-design.md`

---

## Verification approach

There are no visual regression tests. After each task:
1. Run `just app::build` to verify no compilation errors
2. Visually confirm via dev server if desired (`just app::serve`)

---

### Task 1: SpotifyPlayer

**Files:**
- Modify: `app/src/components/SpotifyPlayer/SpotifyPlayer.astro`

**Step 1: Replace class with inline Tailwind + style attribute**

The `.spotify-player` class maps to `@apply mt-auto pt-3` plus three non-inlineable properties. Move the Tailwind utilities inline and use a `style` attribute for the rest.

Replace the entire file content with:

```astro
---
import { SPOTIFY_PLAYLIST_ID } from "@lib/site-config";
---

<div class="mt-auto pt-3" style="transform: scale(0.88); transform-origin: bottom left; margin-right: -12%;">
  <iframe
    data-testid="embed-iframe"
    title="Spotify playlist"
    src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`}
    width="100%"
    height="152"
    frameBorder="0"
    allowfullscreen=""
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    loading="lazy"
    style="border-radius:12px;"></iframe>
</div>
```

The `<style>` block and `@reference` import are removed entirely.

**Step 2: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/src/components/SpotifyPlayer/SpotifyPlayer.astro
git commit -m "refactor(SpotifyPlayer): replace @apply with inline Tailwind classes"
```

---

### Task 2: Chat

**Files:**
- Modify: `app/src/components/Chat/Chat.astro`
- Delete: `app/src/components/Chat/Chat.css`

**Step 1: Inline all classes onto Chat.astro elements**

Replace each element's `class`/`id` with the corresponding Tailwind utilities from Chat.css. Key mappings:

| Element | Current | New classes |
|---------|---------|-------------|
| `#chat-panel` (aside) | — | `hidden lg:flex lg:flex-col lg:border-l lg:border-border lg:p-4 font-body gap-1 overflow-y-auto overflow-x-hidden lg:shrink-0 lg:grow-0 lg:w-80 lg:min-w-80` |
| `#chat-header` | — | `flex flex-col gap-0.5 m-0` |
| `#chat-header-top` | — | `flex items-center gap-1.5` |
| `h2` inside header | — | `m-0 font-heading text-base font-semibold text-teal tracking-tight` |
| `#chat-status-dot` | — | `inline-block shrink-0 w-2 h-2 rounded-full bg-muted data-[online=true]:bg-neon` |
| `#chat-owner-status` | — | `flex-1 text-xs text-muted data-[online=true]:text-neon` |
| `#chat-user-count` | — | `text-xs text-muted` |
| `#chat-overlay-close` | — | `hidden` |
| `#chat-username-bar` | — | `flex items-center gap-1.5` |
| `label` inside username-bar | — | `whitespace-nowrap uppercase tracking-widest font-body text-2xs text-muted` |
| `#chat-username` | — | `flex-1 py-0.5 px-1 text-xs font-body bg-transparent text-text min-w-0 focus:outline-none` |
| `#chat-room` | — | `flex flex-col gap-2 flex-1 min-h-0` |
| `#chat-messages` | — | `flex-1 text-sm text-text overflow-y-auto min-h-0` |
| `#chat-input-bar` | — | `flex items-center gap-1` |
| `#chat-input` | — | `flex-1 py-2 px-3 border border-border rounded-md text-sm font-body bg-midnight text-text min-w-0 focus:outline-none focus:border-teal` |
| `#chat-send` | — | `p-2 border-none bg-transparent text-muted text-sm hover:text-neon transition-colors` |

Note: The `#chat-panel` element gets overflow + sizing classes merged from both Chat.css and BaseLayout.css (since we'll remove the BaseLayout `#chat-panel` rule in Task 9).

**Step 2: Add minimal scoped `<style>` for non-inlineable CSS**

Replace the `<style is:global>` block with a scoped `<style>` block for the dashed border on `#chat-username`:

```astro
<style>
  #chat-username {
    border: none;
    border-bottom: 1px dashed var(--color-border);
    border-radius: 0;
    box-shadow: none;
  }
  #chat-username:focus {
    border-bottom-color: var(--color-teal);
  }
</style>
```

**Step 3: Delete Chat.css**

Delete `app/src/components/Chat/Chat.css`.

**Step 4: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add app/src/components/Chat/Chat.astro
git rm app/src/components/Chat/Chat.css
git commit -m "refactor(Chat): replace @apply with inline Tailwind, delete Chat.css"
```

---

### Task 3: ProjectTree

**Files:**
- Modify: `app/src/components/ProjectTree/ProjectTree.astro`
- Delete: `app/src/components/ProjectTree/ProjectTree.css`

**Step 1: Inline all classes onto ProjectTree.astro elements**

Key mappings from ProjectTree.css:

| Element | New classes |
|---------|-------------|
| `nav#site-nav` | `font-body relative xl:flex xl:flex-col min-h-full overflow-y-auto overflow-x-hidden hidden xl:block xl:shrink-0 xl:grow-0 xl:basis-1/5 xl:max-w-64 xl:py-3 xl:pl-3 xl:pr-0` |
| `h2` | `hidden xl:block m-0 mb-3 font-display text-xl font-bold text-neon` |
| `.nav-heading-link` (a inside h2) | `no-underline text-neon` |
| `.nav-search-trigger` button | `hidden xl:flex items-center gap-2 w-full py-2 px-3 mb-3 border border-border rounded-lg bg-surface text-muted text-sm font-body transition-colors hover:border-muted/50` |
| `span` inside search trigger | `flex-1 text-left` |
| `.nav-search-shortcut` kbd | `text-xs py-0.5 px-2 border border-border rounded bg-surface-active text-muted font-body` |
| `.nav-container` div | `bg-surface border border-border rounded-lg p-3` |
| `.nav-list` ul | `list-none p-0 m-0 flex flex-col gap-0.5` |
| `.nav-dot` span | `shrink-0 w-1.25 h-1.25 rounded-full bg-current` |
| `.nav-row` a | `flex items-center gap-2 w-full no-underline text-muted font-body font-medium transition-colors text-sm tracking-wider py-2 px-3 rounded-md hover:bg-surface-active hover:text-text data-[active]:bg-surface-active data-[active]:text-teal` |
| `.nav-row__label` span | `flex-1` |
| `.nav-row__count` span | `text-xs font-normal bg-midnight py-0.5 px-2 rounded-full text-muted` |

**Step 2: Handle the data-active count color change**

The rule `.nav-row[data-active] .nav-row__count` changes the count badge style when the parent row is active. Use Tailwind's `group` pattern:

- Add `group` to each `.nav-row` anchor element
- On `.nav-row__count` span, add: `group-data-[active]:bg-teal/15 group-data-[active]:text-teal`

**Step 3: Handle `#nav-panel #site-nav` context**

The `#nav-panel #site-nav` rule sets `flex flex-col block p-3` when ProjectTree is inside the nav panel. Since ProjectTree is rendered in two places (sidebar and panel), keep a minimal `<style>` block:

```astro
<style>
  :global(#nav-panel) #site-nav {
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
  }
</style>
```

**Step 4: Delete ProjectTree.css**

Delete `app/src/components/ProjectTree/ProjectTree.css`.

**Step 5: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add app/src/components/ProjectTree/ProjectTree.astro
git rm app/src/components/ProjectTree/ProjectTree.css
git commit -m "refactor(ProjectTree): replace @apply with inline Tailwind, delete ProjectTree.css"
```

---

### Task 4: CommandPalette

**Files:**
- Modify: `app/src/components/CommandPalette/CommandPalette.astro`
- Modify: `app/src/components/CommandPalette/CommandPalette.ts`
- Delete: `app/src/components/CommandPalette/CommandPalette.css`

**Step 1: Inline classes on CommandPalette.astro template elements**

| Element | Current class | New classes |
|---------|--------------|-------------|
| `#command-palette` div | `cp-overlay` | `hidden fixed top-0 left-0 w-full h-full z-1000` |
| `.cp-backdrop` div | `cp-backdrop` | `absolute inset-0 bg-midnight/70 backdrop-blur-sm` |
| `.cp-dialog` div | `cp-dialog` | `relative w-full max-w-full mt-12 rounded-none md:max-w-lg md:mt-0 md:rounded-lg bg-surface overflow-hidden font-body flex flex-col max-h-1/2 md:max-h-3/5 shadow-dialog` |
| `.cp-header` div | `cp-header` | `flex items-center gap-2 py-3 px-4 border-b border-border` |
| `#cp-collection-select` | `cp-select` | `py-2 px-3 border border-border rounded-md text-xs font-body bg-midnight text-text outline-none min-w-24 hover:border-muted/50 focus:border-teal focus:ring-2 focus:ring-teal/20` |
| `#cp-input` | `cp-input` | `flex-1 border-none outline-none text-sm py-0.5 font-body bg-transparent text-text` |
| `.cp-results` div | `cp-results` | `overflow-y-auto flex-1 p-2` |
| `.cp-footer` div | `cp-footer` | `hidden md:flex gap-4 py-2 px-4 border-t border-border text-xs text-muted` |
| `span` inside footer | — | `flex items-center gap-1` |
| `kbd` inside footer | — | `text-xs py-0.5 px-2 border border-border rounded-sm bg-midnight font-body text-muted` |

**Step 2: Update JS-generated HTML in CommandPalette.ts**

The `renderResults` function creates DOM via innerHTML strings. Update the class attributes in the template literals:

| Old class | New inline classes |
|-----------|-------------------|
| `cp-empty` | `py-8 px-4 text-center text-muted text-sm` |
| `cp-row__tags` | `flex flex-wrap gap-1` |
| `cp-row__tag` | `py-0.5 px-2 bg-transparent border border-teal text-xs text-teal capitalize rounded` |
| `cp-row` | `cp-row flex items-center justify-between gap-3 py-2 px-3 rounded-md no-underline text-muted transition-colors hover:bg-midnight hover:text-text` |
| `cp-row__img` | `w-8 h-8 rounded object-cover shrink-0 bg-midnight` |
| `cp-row__img cp-row__img--empty` | `w-8 h-8 rounded object-cover shrink-0 bg-midnight flex items-center justify-center text-xs font-semibold uppercase font-display border border-border` |
| `cp-row__img--empty span` (inner) | `gradient-text` (keep using the global utility from BaseLayout.css) |
| `cp-row__content` | `flex-1 min-w-0 flex flex-col gap-1` |
| `cp-row__title` | `cp-row__title text-sm font-heading font-medium truncate text-text` |
| `cp-row__meta` | `text-xs text-muted shrink-0` |
| `cp-group-label` | `cp-group-label py-3 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted first:pt-1` |

**Important:** Keep `cp-row` as a class on the row elements because the JS uses `querySelectorAll(".cp-row")` for keyboard navigation and selection toggling. Keep `cp-row__title` too since the selected state targets it.

**Step 3: Handle open/close toggle classes in JS**

The JS adds/removes `cp-overlay--open`. Change this to toggle the specific classes instead:

In the `open()` function, instead of `overlay.classList.add("cp-overlay--open")`, add individual classes:
```ts
overlay.classList.add("flex", "items-start", "md:items-center", "justify-center");
overlay.classList.remove("hidden");
```

In the `close()` function, instead of `overlay.classList.remove("cp-overlay--open")`:
```ts
overlay.classList.remove("flex", "items-start", "md:items-center", "justify-center");
overlay.classList.add("hidden");
```

Update `isOpen()` to check `!overlay.classList.contains("hidden")`.

**Step 4: Handle selected state in JS**

The `updateSelection` function toggles `cp-row--selected`. Change to toggle individual Tailwind classes:

```ts
function updateSelection() {
  const items = resultsContainer.querySelectorAll(".cp-row");
  items.forEach((el, i) => {
    const isSelected = i === selectedIndex;
    el.classList.toggle("bg-surface-active", isSelected);
    el.classList.toggle("text-teal", isSelected);
    // Update title color
    const title = el.querySelector(".cp-row__title");
    if (title) title.classList.toggle("text-teal", isSelected);
    // Update tag styles
    el.querySelectorAll(".cp-row__tag").forEach((tag) => {
      tag.classList.toggle("bg-teal/10", isSelected);
    });
    if (isSelected) el.scrollIntoView({ block: "nearest" });
  });
}
```

Note: `bg-teal/10` as a class toggle may not work with Tailwind JIT since it uses `/` syntax. Instead, handle the selected row tag styles differently — either use a data attribute approach or keep a small CSS rule. The cleanest approach: add `data-selected` to the row, and use a tiny `<style>` block for tag selected state. Or, simply keep the `.cp-row--selected .cp-row__tag` in CSS.

Revised approach for selection: Keep `cp-row--selected` as a toggle class, and add a small `<style>` block:

```astro
<style>
  .cp-input::placeholder {
    color: color-mix(in srgb, var(--color-muted) 60%, transparent);
  }
  .cp-group-label:first-child {
    padding-top: 0.25rem;
  }
  .cp-row--selected {
    background-color: var(--color-surface-active);
    color: var(--color-teal);
  }
  .cp-row--selected .cp-row__title {
    color: var(--color-teal);
  }
  .cp-row--selected .cp-row__tag {
    background-color: color-mix(in srgb, var(--color-teal) 10%, transparent);
    border-color: var(--color-teal);
    color: var(--color-teal);
  }
  .cp-row__img--empty span {
    background: linear-gradient(135deg, var(--color-neon) 0%, var(--color-teal) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
</style>
```

Keep `cp-row--selected`, `cp-row__title`, `cp-row__tag`, and `cp-row__img--empty` as class names in the JS-generated HTML since the CSS targets them.

**Step 5: Remove CSS import from .astro file, delete CommandPalette.css**

Remove `import "./CommandPalette.css"` from the frontmatter.
Delete `app/src/components/CommandPalette/CommandPalette.css`.

**Step 6: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 7: Commit**

```bash
git add app/src/components/CommandPalette/CommandPalette.astro app/src/components/CommandPalette/CommandPalette.ts
git rm app/src/components/CommandPalette/CommandPalette.css
git commit -m "refactor(CommandPalette): replace @apply with inline Tailwind, delete CSS file"
```

---

### Task 5: about.astro

**Files:**
- Modify: `app/src/pages/about.astro`

**Step 1: Inline classes onto elements**

| Element | Current class | New classes |
|---------|--------------|-------------|
| `article` | `about-page` | `font-body max-w-3xl mx-auto` |
| `h2` | — | `m-0 mb-2 font-display font-bold text-neon text-display-sm tracking-tighter leading-none` |
| Each `h3` | — | `font-heading text-xl font-semibold text-teal mt-6 mb-2 tracking-tight` |
| Each `p` | — | `text-text mb-4 leading-relaxed` |
| Each `ul` | — | `text-text mb-4 pl-4 list-disc` |
| Each `li` | — | `mb-2 leading-relaxed` |
| `.about-photos` div | `about-photos` | `grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6` |
| Each `Image` | `about-photo` | `w-full h-auto border border-border rounded-lg` |

**Step 2: Handle link hover styles**

The rule `.about-page a { text-teal hover:text-neon }` targets all links inside the article. Since there are multiple `<a>` tags in the markup, add `text-teal hover:text-neon` to each link element. The global `a { text-teal }` from BaseLayout.css already covers the base color, so we only need to ensure `hover:text-neon` is present (which is also global). We can simply remove this rule — the global styles already handle it.

**Step 3: Remove the entire `<style>` block**

The `<style>` block (including `@reference`) is removed entirely since all rules are now inline.

**Step 4: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add app/src/pages/about.astro
git commit -m "refactor(about): replace @apply with inline Tailwind, remove style block"
```

---

### Task 6: [collection]/[...id].astro (Post page)

**Files:**
- Modify: `app/src/pages/[collection]/[...id].astro`

**Step 1: Inline classes onto template elements**

| Element | Current class | New classes |
|---------|--------------|-------------|
| `article` | `post-page` | `font-body max-w-3xl mx-auto` |
| `.post-breadcrumb` p | `post-breadcrumb` | `m-0 mb-3 font-body uppercase text-neon font-semibold text-2xs tracking-widest` |
| `a` inside breadcrumb | — | `text-neon no-underline hover:text-teal` |
| `.post-header` header | `post-header` | `mb-6` |
| `h1` inside header | — | `m-0 mb-3 font-display font-bold text-neon text-display tracking-tighter leading-display` |
| `.post-description` p | `post-description` | `m-0 mb-3 font-heading font-semibold text-teal text-subtitle tracking-tight` |
| `.post-meta` div | `post-meta` | `flex flex-wrap items-center gap-3` |
| `.post-date` time | `post-date` | `text-sm text-muted` |
| `.post-content` div | `post-content prose prose-invert prose-sm max-w-none text-text font-body` |

**Step 2: Keep `:global()` rules in scoped `<style>`**

The `:global()` rules for markdown-rendered content must stay. Replace the `<style>` block with only the `:global()` rules (no `@reference` needed since we're using plain CSS properties, not `@apply`):

```astro
<style>
  .post-content :global(h2),
  .post-content :global(h3),
  .post-content :global(h4) {
    font-family: var(--font-heading);
    color: var(--color-text);
  }
  .post-content :global(h2) {
    color: var(--color-teal);
  }
  .post-content :global(.expressive-code) {
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .post-content :global(code:not(pre code)) {
    font-family: var(--font-body);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-teal);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
  }
  .post-content :global(a) {
    color: var(--color-teal);
  }
  .post-content :global(a):hover {
    color: var(--color-neon);
  }
  .post-content :global(img) {
    border-radius: 0.5rem;
  }
</style>
```

Note: We can't use `@apply` inside `:global()` rules without `@reference`, and we're removing `@reference`. So we use plain CSS property values referencing the theme vars. Alternatively, we could keep `@reference` and `@apply` only for the `:global()` rules since those truly can't be inlined. The simpler approach: **keep `@reference` and `@apply` only for the `:global()` rules**.

Revised `<style>` block:

```astro
<style>
  @reference "../../layouts/BaseLayout/BaseLayout.css";

  .post-content :global(h2),
  .post-content :global(h3),
  .post-content :global(h4) {
    @apply font-heading text-text;
  }
  .post-content :global(h2) {
    @apply text-teal;
  }
  .post-content :global(.expressive-code) {
    @apply my-6;
  }
  .post-content :global(code:not(pre code)) {
    @apply font-body bg-surface border border-border text-teal px-1.5 py-0.5 rounded text-xs;
  }
  .post-content :global(a) {
    @apply text-teal hover:text-neon;
  }
  .post-content :global(img) {
    @apply rounded-lg;
  }
</style>
```

This is the one place where `@apply` with `@reference` is justified — these `:global()` selectors cannot be inlined.

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add "app/src/pages/[collection]/[...id].astro"
git commit -m "refactor(post-page): replace @apply with inline Tailwind where possible, keep :global() rules"
```

---

### Task 7: index.astro (Home page)

**Files:**
- Modify: `app/src/pages/index.astro`

**Step 1: Inline classes onto template elements**

| Element | Current class | New classes |
|---------|--------------|-------------|
| `.home-hero` section | `home-hero` | `flex flex-col items-center text-center gap-8` |
| `.home-hero__text` div | `home-hero__text` | `max-w-lg` |
| `.home-hero__title` h1 | `home-hero__title` | `m-0 font-display font-bold text-neon text-display-lg tracking-tighter leading-none` |
| `.home-hero__body` p | `home-hero__body` | `m-0 mt-4 font-heading text-muted leading-relaxed text-subtitle tracking-tight` |
| `.home-section` section (×2) | `home-section` | `mt-16` |
| `.home-section__header` div (×2) | `home-section__header` | `flex items-center gap-3 mb-6` |
| `.home-section__label` span (×2) | `home-section__label` | `font-body text-2xs text-muted uppercase tracking-widest whitespace-nowrap` |
| `.home-section__rule` hr (×2) | `home-section__rule` | `grow border-t border-border my-0` |
| `.home-section__link` a (×2) | `home-section__link` | `font-body text-xs text-teal no-underline whitespace-nowrap tracking-wider inline-flex items-center gap-1 hover:text-neon` |
| `.home-section__arrow` svg (×2) | `home-section__arrow` | `inline-block` (plus `style="width:0.55em;height:0.55em"`) |
| `.home-projects` div | `home-projects` | `grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| `.home-project-card` a (×N) | `home-project-card` | `group block no-underline bg-surface border border-border rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover` |
| `.home-project-card__image` img | `home-project-card__image` | `w-full object-cover` (plus `style="aspect-ratio:16/10"`) |
| `.home-project-card__body` div | `home-project-card__body` | `p-4` |
| `.home-project-card__category` span | `home-project-card__category` | `font-body text-2xs text-muted uppercase tracking-widest` |
| `.home-project-card__title` h3 | `home-project-card__title` | `m-0 mt-1 font-heading text-text text-sm font-medium` |
| `.home-project-card__desc` p | `home-project-card__desc` | `m-0 mt-2 font-body text-muted text-xs leading-relaxed line-clamp-2` |

Note: Tailwind v4 has `line-clamp-2` which handles the webkit line clamp prefixes. The `hover:shadow-card-hover` uses the custom shadow token defined in `@theme`.

For the timeline section:

| Element | New classes |
|---------|-------------|
| `.home-timeline` div | `home-timeline relative overflow-x-auto` |
| `.home-timeline__track` div | `home-timeline__track flex gap-6 pb-4 relative` (plus `style="min-width:max-content"`) |
| `.home-timeline__item` a | `group home-timeline__item flex flex-col items-center no-underline relative` (plus `style="flex:0 0 auto;width:90px"`) |
| `.home-timeline__thumb` div | `w-20 h-14 rounded overflow-hidden bg-surface border border-border relative z-10 group-hover:border-teal` |
| `img` inside thumb | `w-full h-full object-cover` |
| `.home-timeline__thumb-placeholder` div | `w-full h-full bg-surface` |
| `.home-timeline__year` span | `font-body text-2xs text-text mt-2 font-medium group-hover:text-teal` |
| `.home-timeline__name` span | `home-timeline__name font-body text-muted mt-0.5 text-center leading-tight` |

For `.home-timeline__item--current`, use `class:list` conditional to add `[&_.home-timeline__thumb]:border-neon` or handle via a scoped style.

**Step 2: Keep minimal `<style>` block for non-inlineable CSS**

```astro
<style>
  @reference "../layouts/BaseLayout/BaseLayout.css";

  /* Web component overrides */
  live-window {
    --window-color: var(--color-midnight);
    --blinds-color: var(--color-midnight);
    --clock-text-color: #e74c3c;
    --weather-text-font: "Space Grotesk", sans-serif;
    --weather-text-color: var(--color-teal);
    --weather-text-margin: 12px 0;
    --weather-text-size: 14px;
    --weather-text-transform: uppercase;
    --weather-text-letter-spacing: 0.08em;
  }

  /* Timeline: horizontal scroll fade */
  .home-timeline {
    -webkit-overflow-scrolling: touch;
    mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
  }

  /* Timeline: track line pseudo-element */
  .home-timeline__track::before {
    content: "";
    @apply absolute left-0 right-0 border-t border-border;
    top: 40px;
  }

  /* Timeline: current version glow */
  .home-timeline__item--current .home-timeline__thumb {
    @apply border-neon;
    box-shadow: 0 0 8px rgba(57, 255, 20, 0.3);
  }

  /* Timeline: name font size */
  .home-timeline__name {
    font-size: 0.6rem;
  }
</style>
```

Note: We keep `@reference` here because the `::before` and `.home-timeline__item--current` rules use `@apply`.

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "refactor(home): replace @apply with inline Tailwind, keep minimal style block"
```

---

### Task 8: CollectionGrid

**Files:**
- Modify: `app/src/components/CollectionGrid/CollectionGrid.astro`
- Delete: `app/src/components/CollectionGrid/CollectionGrid.css`

This is the largest component. It has multiple card variants (stacked, gallery, link, flag) with parent-child hover effects.

**Step 1: Inline classes on page-level elements**

| Element | Current class | New classes |
|---------|--------------|-------------|
| `.collection-page` div | `collection-page` | `font-body max-w-5xl mx-auto` |
| `.collection-hero` header | `collection-hero` | `mb-6` |
| `h1` inside hero | — | `m-0 mb-3 font-display font-bold text-neon text-display tracking-tighter leading-display` |
| `.collection-subtitle` p | `collection-subtitle` | `m-0 mb-3 font-heading font-semibold text-teal text-subtitle tracking-tight` |
| `.collection-count` p | `collection-count` | `m-0 font-body text-muted text-sm` |
| `.filter-section` div | `filter-section` | `mb-6` |
| `.filter-tags` div | `filter-tags` | `flex flex-wrap gap-2` |

**Step 2: Inline filter tag classes**

For `.filter-tag` anchors, use `class:list`:

```astro
<a
  href={`/${collection}`}
  class:list={[
    "bg-transparent border border-teal text-teal font-body transition-colors no-underline capitalize text-xs rounded-sm py-1 px-3 tracking-wide hover:bg-teal/10 hover:text-teal",
    { "bg-teal/15 text-teal border-teal": !activeCategory }
  ]}
>
```

**Step 3: Inline grid classes**

The `.items-grid` div uses `class:list` already. Update:

```astro
<div class:list={[
  "items-grid grid gap-4 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3",
  { "grid-cols-2 gap-4": useGallery }
]}>
```

Keep `items-grid` as a class name since the JS masonry code uses `querySelector(".items-grid")`.

**Step 4: Inline stacked card classes**

Add `group` to the card for parent-child hover effects:

```astro
<a href={href} class="group item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover flex flex-col overflow-hidden">
```

Keep `item-card` as a class since the masonry JS iterates `.item-card` children.

Child elements:
| Element | New classes |
|---------|-------------|
| `.item-card__image-wrapper` div | `overflow-hidden bg-midnight border-b border-border h-24 rounded-t-sm` |
| `.item-card__image-wrapper--color` variant | Add `relative` when using color placeholder |
| `.item-card__image` img | `w-full h-full object-cover transition-transform duration-300 group-hover:scale-105` |
| `.item-card__body` div (stacked) | `flex flex-col gap-1 p-3` |
| `.item-card__meta` p | `m-0 font-body uppercase text-neon font-semibold text-2xs tracking-widest` |
| `.item-card__title` h3 (stacked) | `m-0 font-heading font-bold text-text leading-snug text-base` |
| `.item-card__description` p | `m-0 font-body text-muted leading-relaxed text-xs line-clamp-2` |
| `.item-tags` div | `flex flex-wrap gap-1 mt-3` |
| `.item-tag` span | `bg-transparent border border-teal text-teal capitalize text-2xs rounded-sm py-0.5 px-2 tracking-wide` |

**Step 5: Inline gallery card classes**

```astro
<a href={href} class="group item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover overflow-hidden flex flex-col max-h-80">
```

| Element | New classes |
|---------|-------------|
| `.item-card__gallery-image-wrapper` | `overflow-hidden flex-1` |
| `.item-card__gallery-image` | `w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105` |
| `.item-card__gallery-placeholder` | `w-full h-full aspect-4/3` |
| `.item-card__gallery-body` | `p-3 flex flex-col gap-0.5` |
| `.item-card__gallery-title` | `m-0 font-heading font-bold text-text text-sm leading-snug` |
| `.item-card__gallery-category` | `font-body uppercase text-neon font-semibold text-2xs tracking-widest` |

**Step 6: Inline link card classes**

```astro
<a href={href} class="item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover flex flex-col gap-1 p-3" target="_blank" rel="noopener">
```

| Element | New classes (link variant) |
|---------|--------------------------|
| `.item-card__meta` p (link) | `m-0 text-muted flex items-center gap-1 text-2xs normal-case` |
| `.item-card__external-icon` svg | `text-muted opacity-60` |
| `.item-card__title` h3 (link) | `m-0 font-heading font-bold text-text leading-snug flex items-center gap-2 text-base` |
| `.item-card__favicon` img | `shrink-0 inline-block rounded-sm align-middle` |
| `.item-card__favicon-placeholder` span | `shrink-0 font-display font-bold uppercase text-xs w-4 text-center` |
| `.item-card__description` p (link) | `m-0 font-body text-muted leading-relaxed text-xs` |

**Step 7: Inline flag card classes**

```astro
<a href={href} class="group item-card bg-surface border border-border no-underline text-inherit transition-all rounded-lg hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-card-hover flex flex-row items-center p-3 gap-4">
```

| Element | New classes (flag variant) |
|---------|--------------------------|
| `.item-card__flag-image` div | `shrink-0 flex items-center justify-center bg-midnight border border-border overflow-hidden w-16 h-16 rounded-sm` |
| `.item-card__image` img (flag) | `w-full h-full object-cover` |
| `.item-card__placeholder` span | `font-display font-bold uppercase text-2xl` |
| `.item-card__body` div (flag) | `flex-1 min-w-0 flex flex-col gap-1` |
| `.item-card__title` h3 (flag) | `m-0 font-heading font-bold text-text leading-snug text-base` |
| `.item-card__description` p (flag) | `m-0 font-body text-muted leading-relaxed text-xs` |

**Step 8: Add minimal `<style>` for masonry**

Replace the `@import` style block with:

```astro
<style>
  .items-grid.masonry-ready {
    gap: 0 1rem;
    grid-auto-rows: 10px;
  }
  .items-grid.masonry-ready > .item-card {
    margin-bottom: 1rem;
  }
</style>
```

**Step 9: Delete CollectionGrid.css**

Delete `app/src/components/CollectionGrid/CollectionGrid.css`.

**Step 10: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 11: Commit**

```bash
git add app/src/components/CollectionGrid/CollectionGrid.astro
git rm app/src/components/CollectionGrid/CollectionGrid.css
git commit -m "refactor(CollectionGrid): replace @apply with inline Tailwind, delete CSS file"
```

---

### Task 9: BaseLayout

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.css`
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro`

**Step 1: Inline layout element classes onto BaseLayout.astro**

| Element | Current ID/class | New classes to add |
|---------|-----------------|-------------------|
| `#toolbar` div | — | `flex items-center justify-between fixed top-0 left-0 right-0 lg:right-80 h-12 px-3 bg-surface border-b border-border z-60 xl:hidden` |
| `#toolbar-title` a | — | `font-display font-bold text-base text-neon no-underline` |
| `#toolbar-nav` nav | `flex xl:hidden` | `flex xl:hidden items-center gap-1 overflow-x-auto` |
| `.toolbar-nav-link` a (×N) | `toolbar-nav-link` | `font-body text-xs text-muted no-underline whitespace-nowrap py-1 px-2 rounded-md hover:text-text hover:bg-surface-active transition-colors data-[active]:text-teal` |
| `#toolbar-menu-btn` button | — | `bg-transparent border-none p-2 text-muted hover:text-neon` |
| `#toolbar-search-btn` button | — | `bg-transparent border-none p-1 text-muted hover:text-neon transition-colors` |
| `#nav-backdrop` div | `xl:hidden` | `hidden fixed top-12 left-0 right-0 lg:right-80 h-[calc(100svh-48px)] z-40 bg-midnight/70 backdrop-blur-xs xl:hidden` |
| `#chat-overlay-backdrop` div | `lg:hidden` | `hidden fixed inset-0 z-40 bg-midnight/70 backdrop-blur-xs lg:hidden` |
| `#nav-panel` div | `xl:hidden` | `fixed top-12 left-0 right-0 lg:right-80 max-h-[60vh] overflow-y-auto bg-midnight/95 backdrop-blur-md border-b border-border z-50 -translate-y-[calc(100%+4px)] transition-transform duration-300 ease-in-out xl:hidden` |
| `#layout` div | — | `flex flex-col lg:flex-row w-screen h-svh` |
| `#content-viewer` div | — | `grow shrink basis-0 min-w-0 pt-16 pb-4 px-4 sm:px-6 sm:pb-6 xl:pt-6 xl:pb-6 overflow-y-auto overflow-x-hidden` |
| `#mobile-chat-fab` button | — | `fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-neon text-midnight flex items-center justify-center shadow-lg lg:hidden hover:bg-teal` |
| `#chat-overlay` div | `lg:hidden` | `fixed bottom-0 left-0 w-full h-[85vh] bg-midnight border-t border-border z-50 translate-y-full transition-transform duration-300 ease-in-out lg:hidden flex flex-col px-4 pt-2 pb-4` |
| `#chat-overlay-content` div | — | `flex flex-col flex-1 min-h-0 font-body gap-2` |

Note: The JS in BaseLayout.ts toggles `.visible` on backdrops and `.open` on panels. These need to stay as toggleable classes. Keep them in CSS.

**Step 2: Shrink BaseLayout.css**

Remove all rules that are now inlined. The file keeps only:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";

@theme {
  /* ... all existing theme tokens, unchanged ... */
}

/* ---- Global resets ---- */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--color-midnight);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.625;
}

a {
  color: var(--color-teal);
}

a:hover {
  color: var(--color-neon);
}

hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.5rem 0;
}

::selection {
  background-color: var(--color-neon);
  color: var(--color-midnight);
}

/* ---- Custom cursors ---- */
/* ... all cursor rules, unchanged ... */

/* ---- Gradient text utility ---- */
.gradient-text {
  background: linear-gradient(135deg, var(--color-neon) 0%, var(--color-teal) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ---- JS-toggled states ---- */
#nav-backdrop.visible,
#chat-overlay-backdrop.visible {
  display: block;
}

#nav-panel.open {
  transform: translateY(0);
}

#chat-overlay.open {
  transform: translateY(0);
}

#chat-overlay #chat-overlay-close {
  display: block;
  background: transparent;
  border: none;
  padding: 0.25rem;
  color: var(--color-muted);
}

#chat-overlay #chat-overlay-close:hover {
  color: var(--color-neon);
}

/* ---- Content viewer media ---- */
#content-viewer img,
#content-viewer video {
  max-width: 100%;
  height: auto;
}
```

Note: The global resets (`*`, `body`, `a`, `hr`, `::selection`) are converted from `@apply` to plain CSS since they're global rules that should stay in the stylesheet. The cursor rules stay exactly as-is. The `.gradient-text` utility stays. The JS-toggled states (`.visible`, `.open`) stay because they're toggled by BaseLayout.ts.

**Step 3: Build to verify**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro app/src/layouts/BaseLayout/BaseLayout.css
git commit -m "refactor(BaseLayout): inline Tailwind classes on layout elements, shrink CSS to globals-only"
```

---

### Task 10: Final cleanup and verification

**Step 1: Full build**

Run: `just app::build`
Expected: Clean build with no errors or warnings

**Step 2: Grep for leftover @apply usage**

Run: `grep -r "@apply" app/src/ --include="*.css" --include="*.astro" -l`

Expected: Only these files should contain `@apply`:
- `app/src/layouts/BaseLayout/BaseLayout.css` — NO, this file should have plain CSS now
- `app/src/pages/[collection]/[...id].astro` — YES, `:global()` rules
- `app/src/pages/index.astro` — YES, `::before` and nested descendant rules

**Step 3: Grep for leftover @reference usage**

Run: `grep -r "@reference" app/src/ --include="*.css" --include="*.astro" -l`

Expected: Only these files:
- `app/src/pages/[collection]/[...id].astro`
- `app/src/pages/index.astro`

**Step 4: Verify deleted CSS files are gone**

Confirm these no longer exist:
- `app/src/components/Chat/Chat.css`
- `app/src/components/ProjectTree/ProjectTree.css`
- `app/src/components/CommandPalette/CommandPalette.css`
- `app/src/components/CollectionGrid/CollectionGrid.css`

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "refactor: final cleanup after @apply removal"
```
