---
title: "Weather Visual Fixes Design"
description: "Six visual bugs/improvements for the live-window weather effects."
publishedOn: 2026-03-07
planType: "design"
topic: "weather-visual-fixes"
status: "completed"
---

# Weather Visual Fixes Design

Six visual bugs/improvements for the live-window weather effects.

## Files

- `app/src/scripts/live-window/components/sky/WeatherLayer.ts` — all weather config + HTML generation
- `app/src/scripts/live-window/live-window.css` — all CSS keyframes & styling

## 1. Tornado rain: reduce intensity

**Problem:** Tornado (781) uses `extremeRain` — too much visual noise with debris + atmosphere.
**Fix:** Change to `heavyRain`. One-line config change.

## 2. Atmosphere particles: differentiated by weather type

**Problem:** Mist, fog, and smoke all render as identical round blobs with 4px blur.
**Fix:** Give each weather type a unique visual treatment.

### New `AtmosphereParticleConfig` fields

- `aspectRatio: number` — width/height ratio (default 1). >1 = horizontal elongation.
- `blur: number` — per-config blur in px (replaces hardcoded 4px in CSS).
- `borderRadius: string` — CSS border-radius (replaces hardcoded 50%). Default "50%".

### Mist wisps (701) — thin horizontal bands

- `aspectRatio: 4` (wide and thin, e.g. 80×20px)
- `blur: 30` (edges dissolve into nothing)
- `sizeRange: [40, 80]` (medium-large)
- `opacityRange: [8, 20]` (very subtle)
- `drift: "float"`, `speed: "16s"` (slow horizontal drift)
- Positioned in lower 60%: top capped at 40-80% range

### Fog banks (741) — huge diffuse blobs that merge

- `aspectRatio: 1.3` (slightly wide)
- `blur: 50` (no visible edges at all)
- `sizeRange: [100, 160]` (massive, overlap each other)
- `opacityRange: [20, 40]` (higher — fog is thick)
- `drift: "float"`, `speed: "22s"` (barely perceptible movement)
- Positioned across full height

### Smoke wisps (711) — rising billowing puffs

- `aspectRatio: 0.8` (slightly tall)
- `blur: 25` (soft but with some visible form)
- `sizeRange: [35, 65]`
- `opacityRange: [15, 35]`
- `drift: "rise"` (new animation type — upward movement)
- New `atmo-rise` keyframe: translates upward ~30% with slight horizontal wobble

### Other atmosphere particles (dust, sand, ash, debris, ice)

Keep as-is — small visible specks are appropriate for these effects. Only update to use
the new `blur` field (defaulting to their current 1-4px values).

## 3. Atmosphere layer: fix positioning + subtle pulse

**Problem:** Layer is 120% wide with translate(-20%, 0%) animation, leaving a visible gap
on the right edge. Horizontal animation not desired.

**Fix:**
- Set `width: 100%` (not 120%)
- Replace `atmosphere-roll` animation with `atmosphere-pulse`: gentle `scale(1) → scale(1.05)` and `opacity` ±10% over ~6s, ease-in-out, alternate
- Add `transform-origin: center bottom` so scaling grows upward from the base

## 4. Cloud + weather animation stutter: skip redundant re-renders

**Problem:** `update()` rebuilds `innerHTML` on every call. This destroys all DOM elements
and restarts every CSS animation from scratch.

**Fix:** Track `lastWeatherId` and `lastCloudColor` as instance properties. In `update()`:
- If weather ID hasn't changed AND cloud color hasn't changed → skip innerHTML rebuild entirely
- If only cloud color changed → update the CSS variable `--cloud-color` without touching innerHTML
- Only rebuild innerHTML when weather ID changes

## 5. Tilted rain loop stutter: use skewX instead of X translation

**Problem:** Wind animations translate X from -15% to +15%. On loop reset, X jumps 30%
horizontally — visible snap/stutter.

**Fix:**
- Remove `precipitate-light-wind`, `precipitate-wind`, `precipitate-strong-wind` keyframes
- All precipitation uses the base `precipitate` animation (Y-only, seamless loop)
- Apply a constant `skewX()` transform on the `.droplets` container based on wind level:
  - `light`: `skewX(3deg)`
  - `moderate`: `skewX(8deg)`
  - `strong`: `skewX(15deg)`
- The skew makes vertical movement appear diagonal without affecting the loop point

## 6. Clouds left-biased: golden-ratio distribution

**Problem:** Knuth hash with `% 110` produces left-biased positions for small cloud counts
(e.g. 9 storm clouds: 16%, 11%, 32%, 27%, 22%, 43%, 38%, 59%, 54%).

**Fix:** Use golden-ratio spacing for horizontal position:
```
left = ((i * 0.618033 + 0.3) % 1) * 110 - 5
```
This guarantees even distribution for any count. Keep the hash for other properties (size,
opacity, animation delay, etc.).
