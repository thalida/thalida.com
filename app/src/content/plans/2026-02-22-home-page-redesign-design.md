---
title: "Home Page Redesign — \"The Terminal Portfolio\""
description: "Redesign the home page content to be compelling and engaging while keeping the live-window component. Replace the current minimal hero (\"Work & Play\" / \"A creative's catalog\") with three sections: a conversational hero, a featured projects strip, and a visual site evolution timeline."
publishedOn: 2026-02-22
planType: "design"
topic: "home-page-redesign"
status: "completed"
---

# Home Page Redesign — "The Terminal Portfolio"

## Overview

Redesign the home page content to be compelling and engaging while keeping the live-window component. Replace the current minimal hero ("Work & Play" / "A creative's catalog") with three sections: a conversational hero, a featured projects strip, and a visual site evolution timeline.

Vibe: techy + warm + explorative. Mix of hacker terminal aesthetics, creative showcase, and interactive playground.

## Section 1: Hero

The live-window stays. All surrounding content changes.

**Layout:** Horizontal on desktop (live-window left, text right), stacked on mobile (live-window top, text below). Centered alignment.

**Content:**
- **Heading:** "Hey, I'm Thalida." — Bricolage Grotesque, bold, neon green, display size
- **Body:** "I've been building things on the internet since 2007 — from quirky side projects to engineering teams. Designer, developer, maker of things." — IBM Plex Mono, muted color, with a decorative blinking cursor `|` at the end (CSS animation)
- **Nav pills:** [Projects] [Gallery] [About] — small monospace pills, teal border, same hover treatment as current tags

**Removed:** "Work & Play" title, "A creative's catalog" subtitle, current body copy.

## Section 2: Featured Projects

A horizontal row of 3 project cards, auto-selected (most recent projects with cover images).

**Section header:** "SELECTED WORK" — IBM Plex Mono, uppercase, small, muted, with a horizontal rule extending right. "view all →" link at far right in teal, linking to `/projects`.

**Cards (3 across on desktop, 1 column on mobile):**
- Cover image (top, aspect-ratio constrained)
- Category label (IBM Plex Mono, small, muted, uppercase)
- Title (Space Grotesk, white/text color)
- Description (IBM Plex Mono, muted, truncated to 2 lines)

**Card styling:**
- Background: `--color-surface`
- Border: `--color-border`
- Hover: `--shadow-card-hover` glow + slight upward translate
- Links to the project detail page

**Selection logic:** Query projects collection, filter to non-draft items with cover images, sort by `publishedOn` descending, take first 3.

## Section 3: Site Evolution Timeline

Horizontal scrollable strip showing all 13 versions of thalida.com (2007–2025) with cover image thumbnails.

**Section header:** "18 YEARS OF THALIDA.COM" — same style as Section 2 header. "view all →" link to `/versions`.

**Timeline layout:**
- Horizontal scrollable container
- Each version is a small thumbnail card (cover image) with year and version name below
- Cards connected by a horizontal line running through them
- Current version (2025) highlighted with neon green border
- Edge fade effect to hint at scrollability
- Chronological order (2007 left → 2025 right)

**Thumbnail card:**
- Small cover image (~80-100px wide, aspect-ratio preserved)
- Year label below (IBM Plex Mono, small)
- Version name below year (IBM Plex Mono, smaller, muted)

**Responsive:** Horizontally scrollable on all screen sizes. Touch-friendly.

## Design Tokens

All existing — no new dependencies:
- Colors: `--color-midnight`, `--color-surface`, `--color-neon`, `--color-teal`, `--color-text`, `--color-muted`, `--color-border`
- Fonts: Bricolage Grotesque (display), Space Grotesk (headings), IBM Plex Mono (body/labels)
- Effects: `--shadow-card-hover`

## Data Sources

- **Projects:** `getCollection('projects')` filtered to non-draft, has cover image, sorted by publishedOn desc, take 3
- **Versions:** `getCollection('versions')` sorted by category (year) ascending for timeline order
- Reuse `getNavData()` from `app/src/lib/nav-data.ts` for optimized images

## Files Changed

- `app/src/pages/index.astro` — complete content overhaul (keep live-window, replace everything else)
