---
title: Live Window Readability Audit — Design
description: Make the live-window codebase easily readable, maintainable, and
  approachable for a junior engineer. Fix all magic numbers, unclear names,
  missing comments, type safety gaps, duplicated logic, and stale docs.
publishedOn: 2026-03-07T16:47:50.000Z
tags:
  - design
---

# Live Window Readability Audit — Design

**Date**: 2026-03-07
**Goal**: Make the live-window codebase easily readable, maintainable, and approachable for a junior engineer. Fix all magic numbers, unclear names, missing comments, type safety gaps, duplicated logic, and stale docs.

## Audit Summary

85 issues found across 29 files. Full cleanup, bottom-up by layer.

## Approach

**Bottom-up**: Fix utils first, then weather sub-module, then components, then `LiveWindow.ts` last. This lets shared helpers/constants be created first and consumed by higher layers.

## Phase 1: Utils Layer

### 1a. `constants.ts` — Add shared constants

New constants needed:
- `MIN_TICK_SPEED = 1`, `MAX_TICK_SPEED = 1000` (from `LiveWindow.ts:230`)
- `DEFAULT_TEMP_CELSIUS = 20` (from `LiveWindow.ts:311`)
- `THIRTY_MINUTES_MS = 30 * 60_000` (consolidates `WEATHER_RATE_LIMIT` in `api.ts` and `MIN30` in `sky-gradient.ts`)
- `NINETY_MINUTES_MS = 90 * 60_000` (from `sky-gradient.ts:161`)
- `DEFAULT_BG_COLOR: RGB = { r: 0, g: 0, b: 0 }` (from `LiveWindow.ts:327`)
- `FALLBACK_NIGHT_SKY_COLOR = "rgb(14,26,58)"` (from `MoonLayer.ts:65`)
- `MOON_GLOW_COLOR = "232, 232, 208"` (from `MoonLayer.ts:85`)
- `MOON_GLOW_BLUR_PX = 10` (from `MoonLayer.ts:85`)

### 1b. `celestial.ts` — Naming and comments

- Rename `a` → `normalizedAngle` (line 83)
- Rename `shifted` → `rotatedAngle` (line 90)
- Add inline comment to `getSunAngle` explaining elapsed-to-angle mapping
- Add comment to `getArcPosition` explaining the coordinate rotation purpose

### 1c. `color.ts` — Attribution and naming

- Add `// WCAG 2.0 sRGB linearization (https://www.w3.org/TR/WCAG20/#relativeluminancedef)` to `relativeLuminance`
- Add `// Standard RGB↔HSL conversion` comment to `rgbToHsl` and `hslToRgb`
- Add comment on binary search iterations: `// 16 iterations → precision ~0.002% of lightness range`

### 1d. `phase.ts` + `sky-gradient.ts` + `SunLayer.ts` + `MoonLayer.ts` — Deduplicate sun time fallback

Extract shared helper:
```ts
// utils/sun-times.ts or add to celestial.ts
export function getSunTimesWithDefaults(state: { sunrise: number | null; sunset: number | null }): { sunrise: number; sunset: number } {
  if (state.sunrise != null && state.sunset != null) {
    return { sunrise: state.sunrise, sunset: state.sunset };
  }
  return getDefaultSunTimes();
}
```
Replace all 4 instances.

### 1e. `sky-gradient.ts` — Constants and clarity

- Remove `MIN30`, `MIN60`, `MIN90`; import from `constants.ts` instead
- Replace IIFE-in-ternary (lines 274-280) with a pre-computed variable:
  ```ts
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const phaseEnd = nextIdx === 0 ? endOfDay.getTime() : timestamps[nextIdx];
  ```

### 1f. `stars.ts` — Attribution

- Add `// Mulberry32 PRNG — see https://gist.github.com/tommyettinger/46a874533244883189143505d203312c` comment

### 1g. `timezone.ts` — Clarity

- Add a brief comment at the export site explaining that downstream consumers should be aware timestamps are "fake local" shifted values

### 1h. `state.ts` — Export and changelog

- Export `STORAGE_KEY` so tests can import it
- Add inline changelog comment to `CACHE_VERSION`

## Phase 2: Weather Sub-module

### 2a. `weather-types.ts` — Type safety

- Create `PrecipType` union from `PRECIP_CONFIG` keys
- Change `PrecipLayer.type` from `string` to `PrecipType`

### 2b. `weather-configs.ts` — Type safety and naming

- Create union types: `PrecipType`, `AtmosphereType`, `AtmoParticleType`
- Replace all `Record<string, ...>` with properly keyed records
- Rename `fx` → `createWeatherEffect`
- Rename `p` → `precipLayer`
- Type `CLOUD_COLORS` as `Record<Exclude<CloudDensity, "none">, [string, string]>`
- Type `SKY_TINT_STRENGTH` similarly

### 2c. `weather-colors.ts` — Type safety and dedup

- Type `CLOUD_DARKEN` as `Record<Exclude<CloudDensity, "none">, number>`
- Type `LIGHTNING_DARKEN` as `Record<LightningVariant, number>`
- Extract `averageSkyBands(gradient)` helper to replace duplicated warm color averaging (lines 74-78 and 96-100)

### 2d. `weather-html.ts` — Magic numbers and hash consistency

Extract animation timing configs:
```ts
const CLOUD_ANIM = { baseDuration: 4, jitterRange: 6 };  // 4.0–9.9s
const CLOUD_DELAY = { maxNegative: 8 };                    // -0.0 to -7.9s
const PRECIP_SWAY = { baseDuration: 2, jitterRange: 1.8 }; // 2.0–3.7s
const PRECIP_DELAY = { maxNegative: 4 };                    // -0.0 to -3.9s
const ATMO_DELAY = { maxNegative: 8 };                      // -0.0 to -7.9s
const ATMO_JITTER = { range: 3 };                           // 0.0–2.9s
```

- Replace ad-hoc hash `((i + 1) * 1597334677) >>> 0` with a call to `knuthHash(i + OFFSET)` or a second `knuthHash` call with a different seed
- Add comment explaining golden ratio spacing for cloud distribution
- Add comments explaining negative CSS animation delays
- Rename `h2` → `yHash`
- Add comment on `% 80` for atmosphere particle Y constraint

### 2e. `weather/index.ts` + `WeatherLayer.ts` — Remove duplicate barrel

Remove the re-exports from `WeatherLayer.ts` lines 7-27. Keep only `weather/index.ts` as the barrel. Update any imports that go through `WeatherLayer` to use the barrel instead.

### 2f. `WeatherLayer.ts` — Extract constants

- Extract `BACK_CLOUD_RATIO = 0.4` with comment `// 40% of clouds render behind precipitation`
- Extract `WIND_SKEW_DEG: Record<WindLevel, number> = { strong: 15, moderate: 8, light: 3, none: 0 }`
- Name the atmosphere size classes: `const ATMOSPHERE_SIZES = ["lg", "md", "sm"] as const`

## Phase 3: Components

### 3a. `MoonLayer.ts`

- Use `MOON_GLOW_COLOR`, `MOON_GLOW_BLUR_PX` from constants
- Use `FALLBACK_NIGHT_SKY_COLOR` from constants
- Add comments to phase shadow displacement math (lines 67-73)
- Add comment to lit amount calculation (line 82)
- Use `getSunTimesWithDefaults()` helper

### 3b. `SunLayer.ts`

- Use `getSunTimesWithDefaults()` helper

### 3c. `BlindsComponent.ts`

- Add comment to `MIN_COLLAPSE_RATIO` / `COLLAPSE_RATIO_RANGE`: `// Final collapse ratio: between 0.7 and 0.95`
- Add comment to double rAF: `// Double rAF ensures browser has computed layout before measuring positions`
- Add comment to skew distribution formula explaining the math
- Comment the `/ 2` on line 236: `// Collapsed group sits at midpoint of total skew`

### 3d. `ClockComponent.ts`

- Replace `h < 10 ? "0" : ""` with `String(h).padStart(2, "0")`
- Add comment to `if (raw === 24) raw = 0`: `// Intl returns 24 for midnight in hour12:false mode`

### 3e. `SkyComponent.ts`

- Add comment above `children` array: `// Order matters: GradientLayer must be first (writes state.ref.currentGradient consumed by later layers)`

### 3f. `InfoPanelComponent.ts`

- Extract `TEMP_SYMBOL: Record<string, string> = { imperial: "°F", metric: "°C" }` (minor, but consistent with the pattern)

## Phase 4: `LiveWindow.ts`

### 4a. Constants

- Extract `FONT_STYLESHEET_URL`
- Extract `FONT_DATA_ATTR = "data-live-window-font"`
- Use `MIN_TICK_SPEED`, `MAX_TICK_SPEED`, `DEFAULT_TEMP_CELSIUS`, `DEFAULT_BG_COLOR` from constants

### 4b. Naming

- Rename `srOverride` → `sunriseOverride`, `ssOverride` → `sunsetOverride`
- Rename `tz` → `timezone` (minor)

### 4c. Weather icon mapping

- Extract weather group-to-icon mapping with descriptive comments:
  ```ts
  /** OpenWeatherMap weather group ID → icon code mapping */
  const WEATHER_GROUP_ICON: Record<number, string> = {
    2: "11", // Thunderstorm → thunderstorm icon
    3: "09", // Drizzle → shower rain icon
    5: "10", // Rain → rain icon
    6: "13", // Snow → snow icon
    7: "50", // Atmosphere (fog/mist) → mist icon
    8: "01", // Clear/Clouds → clear sky (overridden below for specific cloud IDs)
  };
  ```
- Similarly document the cloud coverage ID → icon mapping

### 4d. `refreshComputed` decomposition

Break the 70-line method into:
- `applyWeatherOverrides(store)` — handles override-sunrise/sunset/weather-id
- `deriveWeatherIcon(weatherId, isDay)` — icon mapping logic
- Keep `refreshComputed` as the orchestrator calling these

### 4e. Shadow DOM font comment

- Add comment explaining why font is loaded in host document `<head>` (Shadow DOM can't load external stylesheets for font-face)

### 4f. Virtual clock documentation

- Add a brief comment block above the virtual clock methods explaining the 4 modes:
  1. Real time (no overrides)
  2. Paused virtual time
  3. Playing virtual time (scaled)
  4. Override time (fixed)

### 4g. `attributeChangedCallback` type safety

- Type `name` parameter as a union of `observedAttributes` values

## Phase 5: Documentation

### 5a. `README.md`

- Update file paths table to current structure
- Add missing layers (StarsLayer, SunLayer, MoonLayer)
- Fix "Adding a new layer" instructions to reference `components/sky/`
- Rename `SkyLayer` → `SceneComponent`

## Phase 6: Tests

### 6a. `__tests__/state.test.ts`

- Import `STORAGE_KEY` from `state.ts` instead of redeclaring

## Out of scope

- CSS magic numbers (pixel values in animations are standard CSS practice)
- `color.ts` HSL algorithm variable names (`p`, `q`, `t`) — these match the standard algorithm and renaming would make it harder to compare with references
- `api.ts` endpoint paths — small API surface, not worth abstracting

## Risk

All changes are pure refactoring (renames, extractions, comments, type narrowing). No behavioral changes. Existing tests should continue to pass unchanged (except `state.test.ts` importing the constant). Any test failure indicates an accidental behavior change that must be investigated.
