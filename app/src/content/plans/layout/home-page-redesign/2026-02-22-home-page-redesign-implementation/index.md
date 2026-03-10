---
title: Home Page Redesign Implementation Plan
description: 'Replace the current minimal home page with a three-section
  "Terminal Portfolio" layout: conversational hero, featured projects strip, and
  site evolution timeline.'
publishedOn: 2026-02-23T00:00:14.000Z
tags:
  - implementation
---

# Home Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current minimal home page with a three-section "Terminal Portfolio" layout: conversational hero, featured projects strip, and site evolution timeline.

**Architecture:** Single-file change to `app/src/pages/index.astro`. The frontmatter fetches data from Astro content collections using the existing `getNavData()` helper. All styling uses existing CSS variables and Tailwind utilities via `@apply`. No new components or dependencies.

**Tech Stack:** Astro, Tailwind CSS v4 (with `@apply`, `@reference`, `@theme`), existing design tokens from `BaseLayout.css`

---

### Task 1: Add data fetching to the frontmatter

**Files:**
- Modify: `app/src/pages/index.astro:1-6`

**Step 1: Update the frontmatter to import and call `getNavData()`**

Replace the current frontmatter (lines 1-6) with:

```astro
---
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
import { getNavData } from "@lib/nav-data";

const openweatherKey = import.meta.env.PUBLIC_OPENWEATHER_KEY || "";
const ipregistryKey = import.meta.env.PUBLIC_IPREGISTRY_KEY || "";

const navData = await getNavData();

// Featured projects: 3 most recent with cover images
const featuredProjects = navData.projects.items
  .filter((p) => p.coverImageSrc)
  .slice(0, 3);

// Timeline: all versions sorted chronologically (oldest first)
const versions = [...navData.versions.items].reverse();
---
```

Note: `getNavData()` already sorts projects by `publishedOn` descending and optimizes cover images at 400px width. Versions are sorted by category (year) descending, so `.reverse()` gives us chronological order.

**Step 2: Verify the build works**

Run: `just app::build`
Expected: Build succeeds (data is fetched but not yet rendered)

**Step 3: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "feat(home): add data fetching for projects and versions"
```

---

### Task 2: Replace the hero section HTML

**Files:**
- Modify: `app/src/pages/index.astro:8-24` (the template section)

**Step 1: Replace the template HTML**

Replace everything between `<BaseLayout activePage="">` and `</BaseLayout>` with:

```astro
<BaseLayout activePage="">
  {/* ── Hero ── */}
  <section class="home-hero">
    <live-window openweather-key={openweatherKey} ipregistry-key={ipregistryKey} theme="dark"></live-window>
    <div class="home-hero__text">
      <h1 class="home-hero__title">Hey, I'm Thalida.</h1>
      <p class="home-hero__body">
        I've been building things on the internet since 2007 — from quirky side projects to engineering teams. Designer, developer, maker of things<span class="home-hero__cursor">|</span>
      </p>
      <div class="home-hero__nav">
        <a href="/projects" class="home-hero__pill">Projects</a>
        <a href="/gallery" class="home-hero__pill">Gallery</a>
        <a href="/about" class="home-hero__pill">About</a>
      </div>
    </div>
  </section>

  {/* ── Featured Projects ── */}
  <section class="home-section">
    <div class="home-section__header">
      <span class="home-section__label">SELECTED WORK</span>
      <hr class="home-section__rule" />
      <a href="/projects" class="home-section__link">view all &rarr;</a>
    </div>
    <div class="home-projects">
      {featuredProjects.map((project) => (
        <a href={`/projects/${project.id}`} class="home-project-card">
          <img
            class="home-project-card__image"
            src={project.coverImageSrc}
            alt={project.coverImageAlt ?? project.title}
            loading="lazy"
          />
          <div class="home-project-card__body">
            {project.category && (
              <span class="home-project-card__category">{project.category}</span>
            )}
            <h3 class="home-project-card__title">{project.title}</h3>
            {project.description && (
              <p class="home-project-card__desc">{project.description}</p>
            )}
          </div>
        </a>
      ))}
    </div>
  </section>

  {/* ── Site Timeline ── */}
  <section class="home-section">
    <div class="home-section__header">
      <span class="home-section__label">18 YEARS OF THALIDA.COM</span>
      <hr class="home-section__rule" />
      <a href="/versions" class="home-section__link">view all &rarr;</a>
    </div>
    <div class="home-timeline">
      <div class="home-timeline__track">
        {versions.map((version) => {
          const year = version.category || "";
          const name = version.title.replace(/^\d{4}:\s*/, "");
          const isCurrent = year === "2025";
          return (
            <a
              href={`/versions/${version.id}`}
              class:list={["home-timeline__item", { "home-timeline__item--current": isCurrent }]}
            >
              <div class="home-timeline__thumb">
                {version.coverImageSrc ? (
                  <img
                    src={version.coverImageSrc}
                    alt={version.coverImageAlt ?? version.title}
                    loading="lazy"
                  />
                ) : (
                  <div class="home-timeline__thumb-placeholder" />
                )}
              </div>
              <span class="home-timeline__year">{year}</span>
              <span class="home-timeline__name">{name}</span>
            </a>
          );
        })}
      </div>
    </div>
  </section>
</BaseLayout>
```

Keep the `<script>` tag and `<style>` tag below (we'll update the style in the next task).

**Step 2: Verify the build works**

Run: `just app::build`
Expected: Build succeeds (HTML renders but styling is not yet updated)

**Step 3: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "feat(home): replace hero with three-section terminal portfolio layout"
```

---

### Task 3: Replace the CSS styles

**Files:**
- Modify: `app/src/pages/index.astro` (the `<style>` block)

**Step 1: Replace the entire `<style>` block**

Replace the existing `<style>...</style>` with:

```astro
<style>
  @reference "../layouts/BaseLayout/BaseLayout.css";

  /* ── Live-window overrides ── */
  live-window {
    --window-color: #030a12;
    --blinds-color: #030a12;
    --clock-text-color: #39ff14;
    --weather-text-font: "Space Grotesk", sans-serif;
    --weather-text-color: var(--color-text);
  }

  /* ── Hero ── */
  .home-hero {
    @apply flex flex-col items-center text-center gap-8;
  }

  @media (min-width: 768px) {
    .home-hero {
      @apply flex-row text-left items-start gap-10;
    }
  }

  .home-hero__text {
    @apply max-w-lg;
  }

  .home-hero__title {
    @apply m-0 font-display font-bold text-neon text-display-lg tracking-tighter leading-none;
  }

  .home-hero__body {
    @apply m-0 mt-4 font-body text-muted leading-relaxed text-sm;
  }

  .home-hero__cursor {
    @apply text-neon;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .home-hero__nav {
    @apply flex flex-wrap gap-2 mt-6;
  }

  @media (min-width: 768px) {
    .home-hero__nav {
      @apply justify-start;
    }
  }

  .home-hero__pill {
    @apply bg-transparent border border-teal text-teal no-underline font-body transition-colors text-xs rounded py-1 px-3 tracking-wider;
  }

  .home-hero__pill:hover {
    @apply bg-teal/10 text-teal;
  }

  /* ── Shared section header ── */
  .home-section {
    @apply mt-16;
  }

  .home-section__header {
    @apply flex items-center gap-3 mb-6;
  }

  .home-section__label {
    @apply font-body text-2xs text-muted uppercase tracking-widest whitespace-nowrap;
  }

  .home-section__rule {
    @apply grow border-t border-border my-0;
  }

  .home-section__link {
    @apply font-body text-2xs text-teal no-underline whitespace-nowrap tracking-wider;
  }

  .home-section__link:hover {
    @apply text-neon;
  }

  /* ── Featured Projects ── */
  .home-projects {
    @apply grid gap-4;
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    .home-projects {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .home-project-card {
    @apply block no-underline bg-surface border border-border rounded-lg overflow-hidden transition-all duration-200;
  }

  .home-project-card:hover {
    @apply -translate-y-1;
    box-shadow: var(--shadow-card-hover);
  }

  .home-project-card__image {
    @apply w-full object-cover;
    aspect-ratio: 16 / 10;
  }

  .home-project-card__body {
    @apply p-4;
  }

  .home-project-card__category {
    @apply font-body text-2xs text-muted uppercase tracking-widest;
  }

  .home-project-card__title {
    @apply m-0 mt-1 font-heading text-text text-sm font-medium;
  }

  .home-project-card__desc {
    @apply m-0 mt-2 font-body text-muted text-xs leading-relaxed;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ── Timeline ── */
  .home-timeline {
    @apply relative overflow-x-auto;
    -webkit-overflow-scrolling: touch;
    mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
  }

  .home-timeline__track {
    @apply flex gap-6 pb-4 relative;
    min-width: max-content;
  }

  .home-timeline__track::before {
    content: "";
    @apply absolute left-0 right-0 border-t border-border;
    top: 40px;
  }

  .home-timeline__item {
    @apply flex flex-col items-center no-underline relative;
    flex: 0 0 auto;
    width: 90px;
  }

  .home-timeline__thumb {
    @apply w-20 h-14 rounded overflow-hidden bg-surface border border-border relative z-10;
  }

  .home-timeline__thumb img {
    @apply w-full h-full object-cover;
  }

  .home-timeline__thumb-placeholder {
    @apply w-full h-full bg-surface;
  }

  .home-timeline__item--current .home-timeline__thumb {
    @apply border-neon;
    box-shadow: 0 0 8px rgba(57, 255, 20, 0.3);
  }

  .home-timeline__year {
    @apply font-body text-2xs text-text mt-2 font-medium;
  }

  .home-timeline__name {
    @apply font-body text-muted mt-0.5 text-center leading-tight;
    font-size: 0.6rem;
  }

  .home-timeline__item:hover .home-timeline__thumb {
    @apply border-teal;
  }

  .home-timeline__item:hover .home-timeline__year {
    @apply text-teal;
  }
</style>
```

**Step 2: Verify the build works and visually inspect**

Run: `just app::build`
Expected: Build succeeds

Run: `just app::serve`
Expected: Home page renders with:
- Live-window + "Hey, I'm Thalida." side-by-side on desktop, stacked on mobile
- Blinking cursor after body text
- Three nav pills (Projects, Gallery, About)
- "SELECTED WORK" section with 3 project cards
- "18 YEARS OF THALIDA.COM" horizontal scrollable timeline with thumbnails
- 2025 version highlighted with neon green border

**Step 3: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "feat(home): add terminal portfolio styling for all three sections"
```

---

### Task 4: Visual polish and responsive verification

**Files:**
- Modify: `app/src/pages/index.astro` (style adjustments as needed)

**Step 1: Run the dev server and check all viewports**

Run: `just app::serve`

Check these scenarios:
- Desktop (1200px+): Hero side-by-side, 3 project columns, timeline scrolls
- Tablet (768px-1199px): Hero side-by-side, 3 project columns, timeline scrolls
- Mobile (< 768px): Hero stacked, 1 project column, timeline scrolls

**Step 2: Fix any spacing, overflow, or alignment issues found**

Common things to check:
- Live-window doesn't overflow on small screens
- Project card images aren't stretched
- Timeline edge fade is visible
- Section spacing feels balanced between sections

**Step 3: Run the full build to verify no errors**

Run: `just app::build`
Expected: Clean build, no warnings

**Step 4: Commit any adjustments**

```bash
git add app/src/pages/index.astro
git commit -m "fix(home): responsive polish and spacing adjustments"
```
