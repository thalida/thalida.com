# Syntax Highlighting Redesign

## Problem

Code blocks use Astro's default Shiki `github-dark` theme, which has a gray `#24292e` background and GitHub's color palette. This clashes with the site's neon/teal cyberpunk aesthetic (midnight `#030a12`, neon `#39ff14`, teal `#00e5a0`).

## Solution

Replace Astro's built-in Shiki with `astro-expressive-code` using the **houston** theme. Houston's mint (`#4bf3c8`) and cyan (`#00daef`) accents naturally complement the site's teal/neon palette.

## Features

- **Houston theme** — Astro's own Shiki theme with neon-friendly mint/cyan/blue accents
- **Copy button** — built-in to expressive-code's Frames plugin, appears on every code block
- **Language label** — shown as a frame header tab via Frames plugin
- **Background override** — use site's `--color-surface` / `--color-midnight` instead of houston's default `#17191e`

No line numbers.

## Changes

### 1. Install dependencies

- `astro-expressive-code`

### 2. Update `app/astro.config.mjs`

Add the `astroExpressiveCode` integration with:
- `themes: ['houston']`
- `styleOverrides` to align backgrounds, borders, and frame chrome with site tokens

### 3. Update `app/src/pages/[collection]/[...id].astro`

Adjust `.post-content` CSS to target expressive-code's HTML structure (`.expressive-code` wrapper, `.frame` divs) instead of raw `.astro-code` pre elements.

## Trade-offs

- Replaces Astro's built-in Shiki (no existing custom config to lose)
- Adds one dependency (~expressive-code bundles Shiki internally)
- Existing remark/rehype plugins unaffected (different pipeline stage)
