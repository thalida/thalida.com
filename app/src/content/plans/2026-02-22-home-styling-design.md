---
title: Home Page Styling & Bug Fixes Design
description: >-
  Five changes to the home page: theme-match the live-window component, fix a
  font-loading bug, expose a new CSS custom property, center content, and update
  the weather font.
publishedOn: 2026-02-22T23:48:51.000Z
planType: design
topic: home-page-redesign
status: completed
category: layout
---

# Home Page Styling & Bug Fixes Design

## Overview

Five changes to the home page: theme-match the live-window component, fix a font-loading bug, expose a new CSS custom property, center content, and update the weather font.

## Changes

### 1. Window theme overrides

Override CSS custom properties on `<live-window>` in `index.astro`:

- `--window-color: #ffffff` (white frame)
- `--blinds-color: #ffffff` (white blinds)
- `--clock-text-color: #39ff14` (neon green — uses new property from task 3)
- `--weather-text-font: "Space Grotesk", sans-serif` (task 5)
- `--weather-text-color: var(--color-text)` (match site text color)

### 2. Fix clock font not loading on back-navigation

**Root cause**: Squada One font link is added in `static` block (runs once per class definition). With Astro View Transitions, navigating away removes the `<link>` from `<head>`, and the static block won't re-run on return.

**Fix**: Move font-loading check from `static` block to `connectedCallback()`.

### 3. Expose `--clock-text-color`

Add `--clock-text-color: #e74c3c` to `:host` defaults in `live-window.css`. Use it in:

- `.clock` color
- `.clock-ampm .active` color

### 4. Center home content horizontally

Add flexbox column + `align-items: center` + `text-align: center` to home page content area.

### 5. Weather font

Handled via `--weather-text-font` override in task 1. Space Grotesk already loaded by BaseLayout.

## Files changed

- `app/src/scripts/live-window/live-window.css` — add + use `--clock-text-color`
- `app/src/scripts/live-window/live-window.ts` — move font loading to `connectedCallback`
- `app/src/pages/index.astro` — CSS overrides + centering
