---
title: "Neon Glow Cursor Design"
description: "Add a custom neon glow cursor with a soft fading trail to the site. The cursor replaces the default browser cursor everywhere, shifting color on interactive elements, and is disabled on touch devices."
publishedOn: 2026-02-22
planType: "design"
topic: "neon-cursor"
status: "completed"
---

# Neon Glow Cursor Design

## Summary

Add a custom neon glow cursor with a soft fading trail to the site. The cursor replaces the default browser cursor everywhere, shifting color on interactive elements, and is disabled on touch devices.

## Approach

**Pure CSS cursor dot + Canvas trail** (no dependencies).

- A small fixed-position `<div>` acts as the visible cursor dot with a neon glow via `box-shadow`
- A full-viewport `<canvas>` overlay renders the fading trail using per-frame alpha decay
- ~50-80 lines of vanilla JS in an Astro component's `<script>` tag

## Design

### Cursor Dot

- 8px diameter circle, `position: fixed`, `pointer-events: none`
- `background: var(--color-neon)` (#39ff14)
- Multi-layer `box-shadow` for glow: inner bright core + outer soft spread
- Positioned via `mousemove` listener using `requestAnimationFrame`
- `z-index: 9999` to float above all content

### Trail Canvas

- Full-viewport `<canvas>`, `position: fixed`, `pointer-events: none`, `z-index: 9998` (below the dot)
- Each frame: draw a small glowing circle at cursor position with radial gradient
- Apply a semi-transparent fill over the whole canvas each frame to fade older points
- Trail length effectively ~20 frames before fully faded
- Canvas context created with `willReadFrequently: true` hint

### Interactive Element Behavior

When hovering clickable elements (`a`, `button`, `input`, `select`, `textarea`, `[role="button"]`, or anything with `cursor-pointer`):

- Dot shifts to teal (`var(--color-teal)`, #00e5a0)
- Dot scales up to 12px diameter
- Transition is smooth via CSS `transition` on the dot element

Detection: JS `mouseover`/`mouseout` event delegation on `document`, checking `element.closest()` against the interactive selectors.

### Touch Device Handling

- Detect via `matchMedia('(pointer: coarse)')` on load
- If touch device: do not render the cursor dot or canvas, do not set `cursor: none`
- This preserves the native mobile experience entirely

### Page Transition Support

- Listen for Astro's `astro:page-load` event to re-initialize after client-side navigation
- Clean up previous listeners/animation frames on `astro:before-preparation`

### CSS Changes

- Add `cursor: none` to `html` in `BaseLayout.css` (scoped to non-touch via JS class toggle)
- The JS adds a `.has-custom-cursor` class to `<html>` and the CSS rule targets that class

## File Structure

- `app/src/components/NeonCursor/NeonCursor.astro` — new component (HTML + client-side `<script>`)
- `app/src/layouts/BaseLayout/BaseLayout.css` — add `html.has-custom-cursor { cursor: none; }` and `html.has-custom-cursor * { cursor: none !important; }`
- `app/src/layouts/BaseLayout/BaseLayout.astro` — import and render `<NeonCursor />`

## Performance

- Single `requestAnimationFrame` loop for both dot positioning and canvas trail
- Canvas fade uses `fillRect` with low alpha rather than per-point tracking
- No dependencies, no DOM mutations per frame (except dot transform)
- Disabled entirely on touch devices
