---
title: Sun & Moon Layers — Design
description: >-
  Add sun and moon celestial bodies to the live window sky, using simple
  geometric CSS shapes that move realistically across the sky based on time of
  day and lunar phase.
publishedOn: 2026-03-03T03:08:52.000Z
subcategory: sun-moon-layers
category: live-window
tags: [design]
---

# Sun & Moon Layers — Design

## Goal

Add sun and moon celestial bodies to the live window sky, using simple geometric CSS shapes that move realistically across the sky based on time of day and lunar phase.

## Model: Celestial Circle

Both the sun and moon sit on the same conceptual 360° circle that rotates once per 24 hours. A body is visible when its angle places it in the upper arc (above the horizon).

- **Sun angle** = time of day (noon → top/0°, midnight → bottom/180°)
- **Moon angle** = sun angle − (moonPhase × 360°)

The moon's offset from the sun is determined by the synodic lunar phase (0 = new moon, 0.5 = full moon). This naturally produces correct rise/set behavior:

| Phase | Offset | Rises | Zenith | Sets |
|---|---|---|---|---|
| New moon (0.0) | 0° | ~Sunrise | ~Noon | ~Sunset |
| First quarter (0.25) | 90° | ~Noon | ~Sunset | ~Midnight |
| Full moon (0.5) | 180° | ~Sunset | ~Midnight | ~Sunrise |
| Last quarter (0.75) | 270° | ~Midnight | ~Sunrise | ~Noon |

## Rendering

When a body is in the visible arc, its position within that arc maps to window coordinates:

- **x**: `10% + arcProgress × 80%` (left-to-right across window)
- **y**: `70% - sin(arcProgress × π) × 60%` (parabolic arc, peaks near top)

Both sun and moon use the same positioning math — only their arc timing differs.

## Components

### `utils/celestial.ts`

Shared utility for both layers:

- `getMoonPhase(now: number): number` — returns 0–1 using synodic period relative to a known new moon epoch
- `getSunAngle(now: number, sunrise: number, sunset: number): number` — returns 0–2π, where 0 = noon (top), π = midnight (bottom)
- `getMoonAngle(sunAngle: number, moonPhase: number): number` — returns `sunAngle - moonPhase × 2π`
- `getArcPosition(angle: number): { x: number, y: number, visible: boolean }` — maps an angle to window coordinates; `visible` is true when angle is in the upper semicircle (above horizon)

### `components/sky/SunLayer.ts`

- Implements `SceneComponent`
- Renders a single `<div class="sun">` — ~20px golden circle with CSS `box-shadow` radial glow
- On `update()`: computes sun angle → arc position → sets `left`/`top` styles
- Sets container opacity to 0 when not visible, smooth CSS transition

### `components/sky/MoonLayer.ts`

- Implements `SceneComponent`
- Renders `<div class="moon">` (~16px circle) with inner `<div class="moon-shadow">` for phase rendering
- **Phase rendering:** Shadow overlay uses `border-radius: 50%` and `transform: scaleX(v)` where `v` ranges from -1 to 1 based on the illumination. At new moon, shadow covers entire circle; at full moon, shadow is hidden
- On `update()`: computes moon angle → arc position → sets position + phase shape
- Container opacity 0 when not visible

### CSS additions to `live-window.css`

```css
/* Sun */
.sun-layer { z-index: 1; transition: opacity 1s ease; pointer-events: none; }
.sun {
  position: absolute;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #FFD700;
  box-shadow: 0 0 15px 8px rgba(255,215,0,0.4), 0 0 30px 15px rgba(255,165,0,0.2);
  transform: translate(-50%, -50%);
}

/* Moon */
.moon-layer { z-index: 1; transition: opacity 1s ease; pointer-events: none; }
.moon {
  position: absolute;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #E8E8D0;
  box-shadow: 0 0 8px 4px rgba(232,232,208,0.3);
  overflow: hidden;
  transform: translate(-50%, -50%);
}
.moon-shadow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--window-sky-color-default);
}
```

### SkyComponent wiring

```typescript
private children: SceneComponent[] = [
  new GradientLayer(),
  new StarsLayer(),
  new SunLayer(),
  new MoonLayer(),
  new WeatherLayer(),
];
```

Sun and moon render at z-index 1 (same as stars), below weather effects (z-index 2).

## Tests

Following the `StarsLayer.test.ts` pattern:

- `celestial.test.ts` — verifies sun angle calculation, moon phase against known dates, arc position mapping, visibility boundaries
- `SunLayer.test.ts` — mount creates element, position updates with phase, hidden at night
- `MoonLayer.test.ts` — position updates, phase shape rendering, hidden when below horizon

## Visual style

- Simple geometric CSS circles with box-shadow glow
- Consistent with existing star dots
- Sun: golden (#FFD700) with warm radial glow
- Moon: pale cream (#E8E8D0) with soft white glow, shadow overlay for phase
