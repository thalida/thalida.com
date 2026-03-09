---
title: Spotify Player Implementation Plan
description: >-
  Add a compact Spotify playlist player to the left sidebar that persists across
  page transitions.
publishedOn: 2026-02-23T01:57:46.000Z
planType: implementation
topic: spotify-player
category: layout
---

# Spotify Player Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a compact Spotify playlist player to the left sidebar that persists across page transitions.

**Architecture:** A new `SpotifyPlayer` Astro component renders Spotify's compact iframe embed. The playlist ID lives in a centralized `site-config.ts` file. The component is placed at the bottom of the `ProjectTree` sidebar and uses `transition:persist` to keep playback alive during Astro View Transitions.

**Tech Stack:** Astro, Tailwind CSS v4, Spotify oEmbed iframe

---

### Task 1: Create site config

**Files:**
- Create: `app/src/lib/site-config.ts`

**Step 1: Create the config file**

```ts
export const SPOTIFY_PLAYLIST_ID = "37i9dQZF1DXcBWIGoYBM5M";
```

This is Spotify's "Today's Top Hits" as a sensible placeholder. The user will replace it with their own playlist ID.

**Step 2: Commit**

```bash
git add app/src/lib/site-config.ts
git commit -m "feat(config): add site config with Spotify playlist ID"
```

---

### Task 2: Create SpotifyPlayer component

**Files:**
- Create: `app/src/components/SpotifyPlayer/SpotifyPlayer.astro`

**Step 1: Create the component**

```astro
---
import { SPOTIFY_PLAYLIST_ID } from "@lib/site-config";
---

<div class="spotify-player" transition:persist="spotify-player">
  <iframe
    title="Spotify playlist"
    src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?theme=0&utm_source=generator`}
    width="100%"
    height="80"
    allow="encrypted-media"
    loading="lazy"
    style="border:0; border-radius:12px;"
  ></iframe>
</div>

<style>
  .spotify-player {
    @apply mt-auto pt-3;
  }
</style>
```

Key details:
- `transition:persist="spotify-player"` keeps the iframe alive across page transitions (same pattern as Chat panel in `Chat.astro`)
- `theme=0` = Spotify dark mode
- `loading="lazy"` so it doesn't block initial page render
- `mt-auto` pushes it to the bottom of the flex sidebar; `pt-3` adds spacing above
- `title` attribute for accessibility

**Step 2: Commit**

```bash
git add app/src/components/SpotifyPlayer/SpotifyPlayer.astro
git commit -m "feat(spotify): add compact Spotify player component"
```

---

### Task 3: Add SpotifyPlayer to sidebar

**Files:**
- Modify: `app/src/components/ProjectTree/ProjectTree.astro:1-7` (add import)
- Modify: `app/src/components/ProjectTree/ProjectTree.astro:65` (add component after nav-container)
- Modify: `app/src/components/ProjectTree/ProjectTree.css:4-6` (make nav a flex column)

**Step 1: Add import to ProjectTree.astro**

At the top of the frontmatter, add the import:

```astro
---
import { NAV_ORDER, getNavData } from "@lib/nav-data";
import SpotifyPlayer from "@components/SpotifyPlayer/SpotifyPlayer.astro";
```

**Step 2: Add SpotifyPlayer after the nav-container div**

After the closing `</div>` of `.nav-container` (line 65), before the closing `</nav>`:

```astro
  </div>

  <SpotifyPlayer />
</nav>
```

**Step 3: Make #site-nav a flex column**

In `ProjectTree.css`, update the `#site-nav` rule so `mt-auto` on the player works:

```css
#site-nav {
  @apply font-body flex flex-col;
}
```

This makes the nav a flex column container so the player's `mt-auto` pushes it to the bottom.

**Step 4: Verify visually**

Run: `just app::serve`

Check:
- Desktop: player appears at bottom of left sidebar, below nav links
- Mobile: player appears at bottom of slide-out nav drawer
- Navigate between pages: music should keep playing (transition:persist)
- Player should not autoplay

**Step 5: Commit**

```bash
git add app/src/components/ProjectTree/ProjectTree.astro app/src/components/ProjectTree/ProjectTree.css
git commit -m "feat(spotify): add Spotify player to sidebar"
```
