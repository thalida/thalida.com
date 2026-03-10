---
title: Meta Tags & SEO Implementation Plan
description: Add comprehensive meta tags, OpenGraph, Twitter Cards, structured
  data, favicons, sitemap, and robots.txt so thalida.com shows up well in search
  and looks great when shared.
publishedOn: 2026-03-01T22:56:29.000Z
tags:
  - implementation
---

# Meta Tags & SEO Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive meta tags, OpenGraph, Twitter Cards, structured data, favicons, sitemap, and robots.txt so thalida.com shows up well in search and looks great when shared.

**Architecture:** A reusable `<SEO>` Astro component encapsulates all meta/OG/Twitter/canonical logic. BaseLayout receives SEO props and renders the component in `<head>`. Each page passes its specific metadata. Static assets (favicons, OG card) are ported from the v-2025 branch.

**Tech Stack:** Astro 5, @astrojs/sitemap, JSON-LD structured data

---

### Task 1: Install @astrojs/sitemap

**Files:**
- Modify: `app/package.json`
- Modify: `app/astro.config.mjs:22` (integrations array)

**Step 1: Install the package**

Run: `cd app && npm install @astrojs/sitemap`

**Step 2: Add sitemap integration to Astro config**

In `app/astro.config.mjs`, add the import at the top:

```js
import sitemap from "@astrojs/sitemap";
```

Then add `sitemap()` to the `integrations` array (before `pagefind()`):

```js
integrations: [
    sitemap(),
    astroExpressiveCode({ /* existing config */ }),
    pagefind(),
],
```

**Step 3: Verify the build still works**

Run: `cd app && npx astro check 2>&1 | tail -20` (just check for config errors)

**Step 4: Commit**

```bash
git add app/package.json app/package-lock.json app/astro.config.mjs
git commit -m "feat: add @astrojs/sitemap integration"
```

---

### Task 2: Port static assets from v-2025

**Files:**
- Create: `app/public/favicon.ico` (from v-2025)
- Create: `app/public/favicon.svg` (from v-2025)
- Create: `app/public/favicon-16x16.png` (from v-2025)
- Create: `app/public/favicon-32x32.png` (from v-2025)
- Create: `app/public/apple-touch-icon.png` (from v-2025)
- Create: `app/public/android-chrome-192x192.png` (from v-2025)
- Create: `app/public/android-chrome-512x512.png` (from v-2025)
- Create: `app/public/card-512x512.png` (from v-2025)
- Create: `app/public/robots.txt`
- Create: `app/public/site.webmanifest`

**Step 1: Extract favicon and OG assets from v-2025 branch**

```bash
cd /Users/thalida/Documents/Repos/thalida.com
git show v-2025:public/favicon.ico > app/public/favicon.ico
git show v-2025:public/favicon.svg > app/public/favicon.svg
git show v-2025:public/favicon-16x16.png > app/public/favicon-16x16.png
git show v-2025:public/favicon-32x32.png > app/public/favicon-32x32.png
git show v-2025:public/apple-touch-icon.png > app/public/apple-touch-icon.png
git show v-2025:public/android-chrome-192x192.png > app/public/android-chrome-192x192.png
git show v-2025:public/android-chrome-512x512.png > app/public/android-chrome-512x512.png
git show v-2025:public/card-512x512.png > app/public/card-512x512.png
```

**Step 2: Create robots.txt**

Write `app/public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://thalida.com/sitemap-index.xml
```

**Step 3: Create site.webmanifest**

Write `app/public/site.webmanifest`:

```json
{
  "name": "thalida.com",
  "short_name": "thalida",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#1be48c",
  "background_color": "#030a12",
  "display": "standalone"
}
```

Note: `background_color` uses `--color-midnight` (#030a12) from the current theme, not #ffffff from v-2025.

**Step 4: Commit**

```bash
git add app/public/
git commit -m "feat: add favicons, OG card, robots.txt, and web manifest"
```

---

### Task 3: Create the `<SEO>` component

**Files:**
- Create: `app/src/components/SEO/SEO.astro`

**Step 1: Create the SEO component**

Write `app/src/components/SEO/SEO.astro`:

```astro
---
interface Props {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  url?: string;
  publishedOn?: Date;
  updatedOn?: Date;
  tags?: string[];
  noindex?: boolean;
}

const SITE_NAME = "thalida.com";
const DEFAULT_DESCRIPTION =
  "Thalida Noel's corner of the internet since 2007 — projects, guides, experiments, and the occasional recipe from a creative technologist in New York.";
const TWITTER_HANDLE = "@thalida";

const {
  title = "thalida",
  description = DEFAULT_DESCRIPTION,
  image,
  type = "website",
  publishedOn,
  updatedOn,
  tags,
  noindex = false,
} = Astro.props;

const siteUrl = Astro.site?.toString().replace(/\/$/, "") ?? "https://thalida.com";
const canonicalUrl = Astro.props.url ?? new URL(Astro.url.pathname, siteUrl).toString();
const ogImage = image ?? `${siteUrl}/card-512x512.png`;
---

{/* Basic meta */}
<meta name="description" content={description} />
<meta name="author" content="Thalida Noel" />
<meta name="theme-color" content="#1be48c" />
{noindex && <meta name="robots" content="noindex, nofollow" />}

{/* Canonical */}
<link rel="canonical" href={canonicalUrl} />

{/* OpenGraph */}
<meta property="og:site_name" content={SITE_NAME} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content={type} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:image" content={ogImage} />

{/* Article-specific OG */}
{type === "article" && publishedOn && (
  <meta property="article:published_time" content={publishedOn.toISOString()} />
)}
{type === "article" && updatedOn && (
  <meta property="article:modified_time" content={updatedOn.toISOString()} />
)}
{type === "article" && tags?.map((tag) => (
  <meta property="article:tag" content={tag} />
))}

{/* Twitter Card */}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content={TWITTER_HANDLE} />
<meta name="twitter:creator" content={TWITTER_HANDLE} />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage} />

{/* Favicons */}
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />

{/* Sitemap */}
<link rel="sitemap" href="/sitemap-index.xml" />
```

**Step 2: Verify no syntax errors**

Run: `cd app && npx astro check 2>&1 | tail -10`

**Step 3: Commit**

```bash
git add app/src/components/SEO/SEO.astro
git commit -m "feat: create reusable SEO component with OG/Twitter/canonical tags"
```

---

### Task 4: Integrate SEO component into BaseLayout

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro`

**Step 1: Extend BaseLayout Props and render SEO component**

In `app/src/layouts/BaseLayout/BaseLayout.astro`:

1. Add the import at top of frontmatter:

```js
import SEO from "@components/SEO/SEO.astro";
```

2. Update the `Props` interface:

```typescript
interface Props {
  title?: string;
  activePage?: string;
  activeCollection?: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedOn?: Date;
  updatedOn?: Date;
  tags?: string[];
  noindex?: boolean;
}
```

3. Destructure the new props:

```js
const {
  title = "thalida",
  activePage,
  activeCollection,
  description,
  ogImage,
  ogType,
  publishedOn,
  updatedOn,
  tags,
  noindex,
} = Astro.props;
```

4. Add the `<SEO>` component inside `<head>`, after the `<title>` tag and before the Google Fonts `<link>`:

```astro
<SEO
  title={title}
  description={description}
  image={ogImage}
  type={ogType}
  publishedOn={publishedOn}
  updatedOn={updatedOn}
  tags={tags}
  noindex={noindex}
/>
```

**Step 2: Verify the build still works**

Run: `just app::build 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro
git commit -m "feat: integrate SEO component into BaseLayout"
```

---

### Task 5: Add metadata to collection listing pages

**Files:**
- Modify: `app/src/pages/[collection]/[...page].astro:40`
- Modify: `app/src/pages/[collection]/[category]/[...page].astro:44`

**Step 1: Update collection listing page**

In `app/src/pages/[collection]/[...page].astro`, change the BaseLayout call (line 40) to pass the collection description:

```astro
<BaseLayout
  title={`${title} · thalida`}
  activeCollection={collection}
  description={collectionMeta[collection].description}
>
```

**Step 2: Update category listing page**

In `app/src/pages/[collection]/[category]/[...page].astro`, update the BaseLayout call (line 44) to pass a description:

```astro
<BaseLayout
  title={`${categoryDisplay(category)} · ${title} · thalida`}
  activeCollection={collection}
  description={`${categoryDisplay(category)} ${collectionMeta[collection].description.toLowerCase()}`}
>
```

**Step 3: Verify build**

Run: `just app::build 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add app/src/pages/\[collection\]/
git commit -m "feat: add meta descriptions to collection listing pages"
```

---

### Task 6: Add metadata and Article JSON-LD to post pages

**Files:**
- Modify: `app/src/pages/[collection]/post/[...id].astro`

**Step 1: Add OG image resolution and Article JSON-LD**

In `app/src/pages/[collection]/post/[...id].astro`:

1. After the existing `recipeJsonLd` block (around line 83), add Article JSON-LD for non-recipe posts:

```js
const siteUrl = Astro.site?.toString().replace(/\/$/, "") ?? "https://thalida.com";

// Resolve cover image to absolute URL for OG
let ogImageUrl: string | undefined;
if (entry.data.coverImage) {
  // Astro's image() schema returns an ImageMetadata with a .src property
  ogImageUrl = new URL(entry.data.coverImage.src, siteUrl).toString();
}

// Article JSON-LD for non-recipe posts
let articleJsonLd: string | null = null;
if (collection !== "recipes") {
  articleJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/${collection}/post/${id}`,
    },
    headline: entry.data.title,
    description: entry.data.description,
    keywords: entry.data.tags?.join(", ") ?? "",
    articleSection: collection,
    author: {
      "@type": "Person",
      name: "Thalida Noel",
      url: `${siteUrl}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: "thalida.com",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/android-chrome-192x192.png`,
      },
    },
    datePublished: entry.data.publishedOn?.toISOString(),
    dateModified: (entry.data.updatedOn ?? entry.data.publishedOn)?.toISOString(),
  });
}
```

2. Update the BaseLayout call (line 111) to pass SEO props:

```astro
<BaseLayout
  title={`${pageTitle} · thalida`}
  activeCollection={collection}
  description={entry.data.description}
  ogImage={ogImageUrl}
  ogType="article"
  publishedOn={entry.data.publishedOn}
  updatedOn={entry.data.updatedOn}
  tags={entry.data.tags}
>
```

3. Add the Article JSON-LD script alongside the existing recipe one:

```astro
{recipeJsonLd && <script is:inline slot="head" type="application/ld+json" set:html={recipeJsonLd} />}
{articleJsonLd && <script is:inline slot="head" type="application/ld+json" set:html={articleJsonLd} />}
```

**Step 2: Verify build**

Run: `just app::build 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add app/src/pages/\[collection\]/post/
git commit -m "feat: add OG images, Article JSON-LD, and meta to post pages"
```

---

### Task 7: Add Person JSON-LD to about page

**Files:**
- Modify: `app/src/pages/about.astro`

**Step 1: Add Person schema JSON-LD**

In `app/src/pages/about.astro`, add a JSON-LD script via the `head` slot. After the BaseLayout opening tag, add:

```astro
<script is:inline slot="head" type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Thalida Noel",
  alternateName: "thalida",
  url: "https://thalida.com/about",
  image: "https://thalida.com/card-512x512.png",
  jobTitle: "Engineering Manager, Creative Technologist",
  description: "Queer, first-generation Trinidadian-American engineer based in New York. Building for the web since 2007.",
  worksFor: {
    "@type": "Organization",
    name: "Zapier",
    url: "https://zapier.com",
  },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Capitol Technology University",
    url: "https://www.captechu.edu/",
  },
  sameAs: [
    "https://github.com/thalida",
    "https://linkedin.com/in/thalida/",
  ],
  knowsAbout: [
    "Product Engineering",
    "Creative Technology",
    "Engineering Management",
    "Web Development",
    "Software Architecture",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "New York",
    addressRegion: "NY",
    addressCountry: "US",
  },
})} />
```

Note: Updated from v-2025 to reflect current employer (Zapier, not Tourus).

**Step 2: Verify build**

Run: `just app::build 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add app/src/pages/about.astro
git commit -m "feat: add Person JSON-LD structured data to about page"
```

---

### Task 8: Add noindex to login/logout pages

**Files:**
- Modify: `app/src/pages/login.astro:9`
- Modify: `app/src/pages/logout.astro:6`

**Step 1: Add noindex to login page**

In `app/src/pages/login.astro`, change line 9:

```astro
<BaseLayout title="login · thalida" noindex>
```

**Step 2: Add noindex to logout page**

In `app/src/pages/logout.astro`, change line 6:

```astro
<BaseLayout title="logging out… · thalida" noindex>
```

**Step 3: Commit**

```bash
git add app/src/pages/login.astro app/src/pages/logout.astro
git commit -m "feat: add noindex to login and logout pages"
```

---

### Task 9: Build verification and smoke test

**Step 1: Run full build**

Run: `just app::build`

Expected: Build completes successfully, no errors.

**Step 2: Inspect generated HTML for meta tags**

Check the homepage output:

```bash
cat app/dist/index.html | grep -E 'og:|twitter:|canonical|description|theme-color|favicon|manifest|sitemap' | head -20
```

Expected: All meta tags present (og:title, og:description, og:image, twitter:card, canonical URL, description, favicon links, sitemap link).

**Step 3: Check a post page for Article JSON-LD**

```bash
find app/dist -path '*/post/*' -name 'index.html' | head -1 | xargs grep -c 'application/ld+json'
```

Expected: At least 1 match (Article schema).

**Step 4: Check about page for Person JSON-LD**

```bash
grep 'Person' app/dist/about/index.html
```

Expected: Person schema present.

**Step 5: Check robots.txt and sitemap**

```bash
cat app/dist/robots.txt
ls app/dist/sitemap-*.xml
```

Expected: robots.txt with Allow and Sitemap, sitemap XML files generated.

**Step 6: Check login page for noindex**

```bash
grep 'noindex' app/dist/login/index.html
```

Expected: `<meta name="robots" content="noindex, nofollow" />` present.

**Step 7: Run tests**

Run: `just app::test`

Expected: All existing tests pass (no regressions).

**Step 8: Commit (if any fixes were needed)**

Only if changes were made during verification:

```bash
git add -A
git commit -m "fix: address build verification issues"
```

---

### Task 10: Run typecheck

**Step 1: Run typecheck**

Run: `just app::typecheck`

Expected: No type errors.

**Step 2: Fix any type errors if needed, then commit**

---

## Summary of all files

| File | Action |
|---|---|
| `app/astro.config.mjs` | Modify (add sitemap) |
| `app/package.json` | Modify (add @astrojs/sitemap) |
| `app/public/favicon.ico` | Create (from v-2025) |
| `app/public/favicon.svg` | Create (from v-2025) |
| `app/public/favicon-16x16.png` | Create (from v-2025) |
| `app/public/favicon-32x32.png` | Create (from v-2025) |
| `app/public/apple-touch-icon.png` | Create (from v-2025) |
| `app/public/android-chrome-192x192.png` | Create (from v-2025) |
| `app/public/android-chrome-512x512.png` | Create (from v-2025) |
| `app/public/card-512x512.png` | Create (from v-2025) |
| `app/public/robots.txt` | Create |
| `app/public/site.webmanifest` | Create |
| `app/src/components/SEO/SEO.astro` | Create |
| `app/src/layouts/BaseLayout/BaseLayout.astro` | Modify |
| `app/src/pages/index.astro` | No changes needed (uses default description) |
| `app/src/pages/about.astro` | Modify (add Person JSON-LD) |
| `app/src/pages/[collection]/[...page].astro` | Modify (pass description) |
| `app/src/pages/[collection]/[category]/[...page].astro` | Modify (pass description) |
| `app/src/pages/[collection]/post/[...id].astro` | Modify (OG image, Article JSON-LD, meta) |
| `app/src/pages/login.astro` | Modify (add noindex) |
| `app/src/pages/logout.astro` | Modify (add noindex) |
