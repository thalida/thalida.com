---
title: "Sidebar Redesign: Two-Level Navigation with Command Palette"
description: "The current IDE-style file-tree sidebar has several usability issues:"
publishedOn: 2026-02-20
planType: "design"
topic: "sidebar-redesign"
status: "completed"
---

# Sidebar Redesign: Two-Level Navigation with Command Palette

## Problem

The current IDE-style file-tree sidebar has several usability issues:

- **Overwhelming scroll**: 60+ items across collapsible sections
- **No search or filtering**: users can only browse linearly
- **Flat visual hierarchy**: hard to distinguish between collection types or find specific items
- **Context loss**: expanding/collapsing sections makes it hard to scan across collections
- **Poor mobile UX**: hamburger drawer with the same problems at a smaller viewport

## Solution

A two-level sidebar with a unified command palette search.

## Design

### Level 1 — Overview

The default sidebar view. Compact and scannable.

- **Search trigger** at top: styled as an input, but clicking it or pressing `Cmd+K` opens the command palette modal. Shows placeholder text ("Search...") and the `⌘K` shortcut hint.
- **Standalone page links**: About, Links. Navigate directly on click. No count badge.
- **Collection rows**: Projects (33), Guides (8), Gallery (7), Recipes (1), Versions (14). Each shows label on the left, count badge on the right. Clicking anywhere on the row transitions to Level 2.
- **Active state**: the current page or collection gets an indigo highlight (background + left border accent).

### Level 2 — Collection View

Shown when a user clicks into a collection from Level 1.

- **Back button**: "← Collection Name" at the top. Clicking returns to Level 1 with a horizontal slide animation.
- **Search trigger**: same as Level 1, but opens the command palette pre-filtered to the current collection.
- **Tag/category filter chips**: derived from the `tags` and `category` fields on content items. "All" is selected by default. Multiple chips can be active (OR logic). Chips are horizontally scrollable if they overflow.
- **Item rows**: small cover thumbnail (~40-44px square, rounded) on the left, title (bold) + date (e.g., "Jun 2024") stacked on the right. Items without a cover image skip the thumbnail (no empty placeholder). Active item gets indigo highlight.
- **Sort order**: newest first by `publishedOn` date.

### Command Palette Modal

A unified search experience accessible from anywhere in the sidebar.

**Opening behavior:**
- From Level 1 or via `Cmd+K`: opens with no pre-selected filter (global search).
- From Level 2: opens with the current collection pre-selected as a filter chip (e.g., `[Projects ✕]`). Clicking `✕` clears the filter to search globally.

**Layout:**
- **Desktop**: centered overlay modal with backdrop dimming, ~500px wide.
- **Mobile**: full-screen overlay.

**Behavior:**
- Live type-ahead filtering as the user types.
- Results grouped by collection when searching globally (2-3 top matches per group).
- Results shown as a flat list when filtered to a single collection.
- Keyboard navigation: arrow keys to move, Enter to select, Escape to close.
- Clicking outside the modal or pressing Escape dismisses it.

### Transitions & State

- **Level 1 ↔ Level 2**: CSS transform slide animation (~200-300ms ease). Level 2 slides in from the right when drilling in, slides out to the right when going back.
- **Sidebar scroll position**: preserved across Astro view transitions using `astro:before-swap` / `astro:after-swap` events (same as current approach).
- **Selected collection and filter state**: maintained in client-side JS. Reset when navigating to a non-collection page.

### Mobile (< 640px)

- **Top bar**: hamburger icon (opens sidebar drawer), search icon (opens command palette), chat icon (opens chat drawer).
- **Sidebar drawer**: slides in from the left, 85vw wide, with backdrop dimming. Contains the same two-level navigation.
- **Command palette**: opens as full-screen overlay with touch-friendly, larger result rows.
- **Navigation**: selecting a content item closes the drawer and navigates to the page.

### Styling

- Hand-written scoped CSS (Astro `<style>` tags). No new libraries.
- Clean, minimal aesthetic: light backgrounds, subtle borders (`#e0e0e0`), indigo accent for active states (`#a5b4fc` border, `#eef2ff` background).
- Smooth transitions (200-300ms ease).
- System font stack (`system-ui, -apple-system, sans-serif`).

## Content Structure Reference

| Collection | Count | Has Cover Images | Has Tags/Categories |
|------------|-------|------------------|---------------------|
| Projects   | ~33   | Yes              | Yes                 |
| Guides     | ~8    | Yes              | Yes                 |
| Gallery    | ~7    | Yes              | Yes                 |
| Recipes    | ~1    | Yes              | Yes                 |
| Versions   | ~14   | Yes              | Yes                 |

Standalone pages: About, Links (not part of collections in the sidebar sense).
