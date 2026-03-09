---
title: "Home Page Styling & Bug Fixes Implementation Plan"
description: "Theme-match the live-window component on the home page, fix a font-loading bug with View Transitions, expose clock text color as a customizable property, center home content, and update the weather font."
publishedOn: 2026-02-22
planType: "implementation"
topic: "home-styling"
status: "completed"
---

# Home Page Styling & Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Theme-match the live-window component on the home page, fix a font-loading bug with View Transitions, expose clock text color as a customizable property, center home content, and update the weather font.

**Architecture:** CSS custom property overrides on `<live-window>` from the home page, a small fix in the web component's lifecycle for font loading, and layout adjustments in the home page styles.

**Tech Stack:** Astro, CSS custom properties, Web Components (Shadow DOM)

---

### Task 1: Expose `--clock-text-color` in live-window component

**Files:**
- Modify: `app/src/scripts/live-window/live-window.css:1-17` (`:host` block)
- Modify: `app/src/scripts/live-window/live-window.css:572` (`.clock` color)
- Modify: `app/src/scripts/live-window/live-window.css:625` (`.clock-ampm .active` color)

**Step 1: Add `--clock-text-color` to `:host` defaults**

In `app/src/scripts/live-window/live-window.css`, add the new property to the `:host` block after `--color-text-red`:

```css
:host {
  display: inline-block;
  --live-window-height: 385px;
  --live-window-width: 256px;
  --live-window-blinds-width-scale: 1.4;
  --live-window-collapsed-slat-height-scale: 0.05;
  --live-window-rod-height-scale: 0.75;

  --window-color: #ffffff;
  --blinds-color: #6b4226;
  --window-clock-bg: #1a1a2e;
  --window-sky-color-default: #0e1a3a;
  --color-text-red: #e74c3c;
  --clock-text-color: var(--color-text-red);
  --weather-text-color: #1a1a2e;
  --primary-font: system-ui, -apple-system, sans-serif;
  --clock-font: "Squada One", sans-serif;
}
```

**Step 2: Use `--clock-text-color` in `.clock`**

Change line 572 from:
```css
color: var(--color-text-red);
```
to:
```css
color: var(--clock-text-color);
```

**Step 3: Use `--clock-text-color` in `.clock-ampm .active`**

Change line 625 from:
```css
color: var(--color-text-red);
```
to:
```css
color: var(--clock-text-color);
```

**Step 4: Verify build**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/live-window.css
git commit -m "feat(live-window): expose --clock-text-color as customizable CSS property"
```

---

### Task 2: Fix clock font not loading on back-navigation

**Files:**
- Modify: `app/src/scripts/live-window/live-window.ts:80-89` (static block → connectedCallback)

**Step 1: Remove the static block**

Remove lines 81-89 (the `static { ... }` block that loads the font).

**Step 2: Add font loading to `connectedCallback`**

In `connectedCallback()` (currently at line 139), add the font check at the top:

```ts
connectedCallback() {
  if (!document.querySelector("link[data-live-window-font]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Squada+One&display=swap";
    link.setAttribute("data-live-window-font", "");
    document.head.appendChild(link);
  }

  if (!this.shadow.querySelector(".scene")) {
    this.buildDOM();
  }
  this.startUpdates();
}
```

**Step 3: Verify build**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/live-window.ts
git commit -m "fix(live-window): re-check font link on connectedCallback for View Transitions"
```

---

### Task 3: Theme the window + center home content + weather font

**Files:**
- Modify: `app/src/pages/index.astro` (styles + markup)

**Step 1: Add CSS overrides for `<live-window>`**

In the `<style>` block of `index.astro`, add at the top (before `.home-hero`):

```css
live-window {
  --window-color: #ffffff;
  --blinds-color: #ffffff;
  --clock-text-color: #39ff14;
  --weather-text-font: "Space Grotesk", sans-serif;
  --weather-text-color: var(--color-text);
}
```

Note: `var(--color-text)` references the Tailwind theme token `#e8f0f8` defined in BaseLayout.css. Since custom properties inherit through the document, this works even though the Shadow DOM uses it — because `--weather-text-color` is set on the host element.

**Step 2: Center home page content horizontally**

Wrap the existing content area in a flex column with center alignment. Update the `<style>` block — the page content (live-window + hero) should be centered. The simplest approach: target the content wrapper already provided by `#content-viewer` via page-level styles, or wrap home content in a centering container.

Add a wrapper div in the markup:

```astro
<BaseLayout activePage="">
  <div class="home-content">
    <live-window openweather-key={openweatherKey} ipregistry-key={ipregistryKey} theme="dark"></live-window>
    <div class="home-hero">
      <h1 class="home-hero__title">Work &amp; Play</h1>
      <p class="home-hero__subtitle">A creative's catalog</p>
      <p class="home-hero__body">Designer, developer, maker of things. Browse my projects, guides, gallery, and more.</p>
      <div class="home-hero__tags">
        <a href="/projects" class="home-hero__tag">Projects</a>
        <a href="/guides" class="home-hero__tag">Guides</a>
        <a href="/gallery" class="home-hero__tag">Gallery</a>
      </div>
    </div>
  </div>
</BaseLayout>
```

And add the centering style:

```css
.home-content {
  @apply flex flex-col items-center text-center;
}
```

**Step 3: Verify build**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "feat: theme live-window, center home content, set weather font to Space Grotesk"
```

---

### Task 4: Final visual verification

**Step 1: Run dev server and verify**

Run: `just app::serve`

Check:
- Home page: window frame is white, blinds are white
- Clock text is neon green (#39ff14)
- Weather text uses Space Grotesk font
- Content is horizontally centered
- Navigate to another page and back — clock font (Squada One) loads correctly
