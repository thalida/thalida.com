---
title: Spotify Player in Sidebar — Design
description: >-
  Embed a compact Spotify playlist player in the left sidebar so visitors can
  listen to music while browsing the site. No autoplay.
publishedOn: 2026-02-23T01:57:13.000Z
subcategory: spotify-player
category: layout
tags: [design]
---

# Spotify Player in Sidebar — Design

## Goal

Embed a compact Spotify playlist player in the left sidebar so visitors can listen to music while browsing the site. No autoplay.

## Approach

Use Spotify's official compact iframe embed (80px height, dark theme) placed at the bottom of the ProjectTree sidebar. Playlist ID stored in a centralized config file for easy swapping.

## New Files

- `app/src/components/SpotifyPlayer/SpotifyPlayer.astro` — Compact Spotify iframe embed component
- `app/src/lib/site-config.ts` — Centralized site config with `SPOTIFY_PLAYLIST_ID`

## Modified Files

- `app/src/components/ProjectTree/ProjectTree.astro` — Add SpotifyPlayer below nav-container
- `app/src/components/ProjectTree/ProjectTree.css` — Spacing styles for the player

## Component: SpotifyPlayer

- iframe src: `https://open.spotify.com/embed/playlist/{ID}?theme=0&utm_source=generator`
- `theme=0` for dark mode (matches midnight/neon aesthetic)
- 80px height, full width, border-radius 12px
- `allow="encrypted-media"` (required by Spotify, no autoplay)
- Wrapped in container with `transition:persist="spotify-player"` so playback survives page transitions

## Placement

Inside `ProjectTree.astro`, after `.nav-container`:

```
#site-nav
  h2 (brand)
  search trigger
  .nav-container (nav links)
  ← spacer (mt-auto) →
  SpotifyPlayer          ← pinned to bottom
```

## Persistence

`transition:persist` on the player container keeps the iframe alive across Astro View Transitions — same pattern as the Chat panel.

## Mobile

Player visible inside the slide-out nav drawer, at the bottom of the nav list. No special handling needed — `#site-nav` already has `overflow-y: auto`.

## Config

`site-config.ts` exports `SPOTIFY_PLAYLIST_ID`. Change the playlist by editing one value.
