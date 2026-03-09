---
title: Stars Layer Design
description: >-
  Add a stars layer to the live window that displays varied, realistic stars at
  night. Stars gradually appear during dusk and fade during dawn, synced to the
  existing 16-phase sky system. Star positions are seeded-random (consistent
  within a day, fresh each day).
publishedOn: 2026-03-02T05:20:22.000Z
subcategory: stars-layer
category: live-window
tags: [design]
---

# Stars Layer Design

## Summary

Add a stars layer to the live window that displays varied, realistic stars at night. Stars gradually appear during dusk and fade during dawn, synced to the existing 16-phase sky system. Star positions are seeded-random (consistent within a day, fresh each day).

## Architecture

### New `StarsLayer` SceneComponent

Follows the same `SceneComponent` interface as `GradientLayer` and `WeatherLayer`. Added to `SkyComponent.children` between gradient and weather layers:

```
SkyComponent.children = [GradientLayer, StarsLayer, WeatherLayer]
```

Stars render behind clouds/rain/snow since `WeatherLayer` sits above in z-order.

### Star Generation (`utils/stars.ts`)

**Seeded PRNG**: mulberry32 hash seeded with today's date as `YYYYMMDD` integer. Produces deterministic star positions that change daily.

**~40 stars** generated with randomized properties:
- `x`: 0-100% horizontal position
- `y`: 0-70% vertical position (stars concentrate in upper sky)
- `size`: determined by tier
- `opacity`: base opacity before phase scaling
- `twinkleDuration`: 2-5s (randomized per star)
- `twinkleDelay`: 0-5s (randomized per star)

**Three star tiers:**

| Tier | Proportion | Size | Base opacity | Glow |
|------|-----------|------|-------------|------|
| Dim | ~60% | 1-1.5px | 0.4-0.6 | None |
| Medium | ~30% | 1.5-2.5px | 0.6-0.8 | Subtle box-shadow (2-4px blur) |
| Bright | ~10% | 2.5-3.5px | 0.8-1.0 | Larger box-shadow (4-8px blur, warm white) |

### Phase-Based Visibility

The `.stars` container opacity is derived from `phaseIndex` + interpolation factor `t`:

| Phase | Name | Stars opacity |
|-------|------|--------------|
| 0 | night | 1.0 |
| 1 | astronomical dawn | 0.7 |
| 2 | nautical dawn | 0.4 |
| 3 | civil dawn | 0.1 |
| 4-12 | daytime | 0 |
| 13 | civil dusk | 0.1 |
| 14 | nautical dusk | 0.4 |
| 15 | astronomical dusk | 0.7 |

Smooth interpolation within phases using the existing `t` factor (0-1). CSS `transition: opacity 1s ease` on the container for smooth visual changes.

### Twinkling Animation

CSS `@keyframes twinkle` animates opacity between the star's base opacity and a reduced value:

```css
@keyframes twinkle {
  0%, 100% { opacity: var(--star-opacity); }
  50% { opacity: calc(var(--star-opacity) * 0.3); }
}
```

Each star gets randomized `animation-duration` (2-5s) and `animation-delay` (0-5s) via inline styles for natural variation.

## Files

| Action | File | Purpose |
|--------|------|---------|
| New | `components/sky/StarsLayer.ts` | SceneComponent: mount, update, destroy |
| New | `utils/stars.ts` | Seeded PRNG, star generation (pure functions) |
| Edit | `components/SkyComponent.ts` | Add StarsLayer to children array |
| Edit | `live-window.css` | `.stars` styles, `@keyframes twinkle` |
| New | `__tests__/components/layers/stars.test.ts` | Star generation + phase opacity tests |

## Out of Scope

- Moon rendering
- Constellations or shooting stars
- Star-weather interaction (clouds naturally occlude via z-order)
