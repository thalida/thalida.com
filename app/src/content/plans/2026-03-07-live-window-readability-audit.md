---
title: "Live Window Readability Audit — Implementation Plan"
description: "Fix all 85 readability issues (magic numbers, unclear names, missing comments, type safety gaps, duplicated logic, stale docs) to make the live-window codebase approachable for a junior engineer."
publishedOn: 2026-03-07
planType: "implementation"
topic: "live-window-readability-audit"
status: "completed"
---

# Live Window Readability Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 85 readability issues (magic numbers, unclear names, missing comments, type safety gaps, duplicated logic, stale docs) to make the live-window codebase approachable for a junior engineer.

**Architecture:** Pure refactoring — bottom-up from utils to weather sub-module to components to LiveWindow orchestrator. No behavioral changes. Existing tests must pass throughout.

**Tech Stack:** TypeScript, Vitest, Web Components (Shadow DOM)

---

### Task 1: Expand constants.ts with shared constants

**Files:**
- Modify: `app/src/scripts/live-window/utils/constants.ts:1-15`

**Step 1: Add new shared constants**

Add these after line 15 of `constants.ts`:

```ts
/** Thirty minutes in milliseconds. */
export const THIRTY_MINUTES_MS = 30 * 60_000;

/** Ninety minutes in milliseconds. */
export const NINETY_MINUTES_MS = 90 * 60_000;

/** Minimum tick speed multiplier for the virtual clock. */
export const MIN_TICK_SPEED = 1;

/** Maximum tick speed multiplier for the virtual clock. */
export const MAX_TICK_SPEED = 1000;

/** Default temperature in Celsius when weather data is unavailable. */
export const DEFAULT_TEMP_CELSIUS = 20;

/** Default background color (black) when no bg-color attribute or computed style is available. */
export const DEFAULT_BG_COLOR: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 };

/** Fallback sky color for night when no gradient data is available. Matches SKY_PHASES[0]. */
export const FALLBACK_NIGHT_SKY_RGB = "rgb(14,26,58)";

/** Moon glow color (warm cream) as CSS rgba channel values. Matches #e8e8d0. */
export const MOON_GLOW_COLOR_RGB = "232, 232, 208";

/** Moon glow blur radius in pixels. */
export const MOON_GLOW_BLUR_PX = 10;
```

Note: Import `RGB` type if available, or inline the type for `DEFAULT_BG_COLOR`. Check if `RGB` is exported from `types.ts` — it is, but importing it into constants would create a circular dependency risk. Use inline type instead.

**Step 2: Run tests to verify nothing broke**

Run: `just app::test`
Expected: All tests pass (no behavioral changes)

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/utils/constants.ts
git commit -m "refactor(live-window): add shared constants for magic numbers"
```

---

### Task 2: Add getSunTimesWithDefaults helper to deduplicate sun time fallback

**Files:**
- Modify: `app/src/scripts/live-window/utils/sky-gradient.ts:288-299`
- Modify: `app/src/scripts/live-window/utils/phase.ts:27-34`
- Modify: `app/src/scripts/live-window/components/sky/SunLayer.ts:17-20`
- Modify: `app/src/scripts/live-window/components/sky/MoonLayer.ts:29-32`

**Step 1: Add the helper to sky-gradient.ts**

Add after `getDefaultSunTimes()` (after line 177):

```ts
/**
 * Returns sunrise/sunset timestamps with fallback to defaults.
 * Consolidates the null-check-and-fallback pattern used by multiple consumers.
 */
export function getSunTimesWithDefaults(
  sunrise: number | null | undefined,
  sunset: number | null | undefined,
): { sunrise: number; sunset: number } {
  if (sunrise != null && sunset != null) {
    return { sunrise, sunset };
  }
  return getDefaultSunTimes();
}
```

**Step 2: Update getCurrentSkyGradient to use the helper**

Replace lines 288-299 of `sky-gradient.ts`:

```ts
export function getCurrentSkyGradient(now: number, sunrise: number | null, sunset: number | null): SkyGradient {
  const { sunrise: sr, sunset: ss } = getSunTimesWithDefaults(sunrise, sunset);
  const { phaseIdx, nextIdx, t } = findPhasePosition(now, sr, ss);
  return lerpGradient(SKY_PHASES[phaseIdx].gradient, SKY_PHASES[nextIdx].gradient, t);
}
```

**Step 3: Update phase.ts to use the helper**

Replace lines 27-34 of `phase.ts`:

```ts
export function buildPhaseInfo(state: StoreState, now: number): PhaseInfo {
  const { sunrise: sr, sunset: ss } = getSunTimesWithDefaults(state.weather.sunrise, state.weather.sunset);
```

Update import to include `getSunTimesWithDefaults`:
```ts
import { getSunTimesWithDefaults, findPhasePosition } from "./sky-gradient";
```

Remove the `getDefaultSunTimes` import since it's no longer used directly.

**Step 4: Update SunLayer.ts to use the helper**

Replace lines 17-20 of `SunLayer.ts`:

```ts
    const { sunrise, sunset, now } = state.computed.phase;
    const { sunrise: sr, sunset: ss } = getSunTimesWithDefaults(sunrise, sunset);
```

Update import:
```ts
import { getSunTimesWithDefaults } from "../../utils/sky-gradient";
```

Remove the `getDefaultSunTimes` import.

**Step 5: Update MoonLayer.ts to use the helper**

Replace lines 29-32 of `MoonLayer.ts`:

```ts
    const { sunrise, sunset, now } = state.computed.phase;
    const { sunrise: sr, sunset: ss } = getSunTimesWithDefaults(sunrise, sunset);
```

Update import:
```ts
import { getSunTimesWithDefaults } from "../../utils/sky-gradient";
```

Remove the `getDefaultSunTimes` import.

**Step 6: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add app/src/scripts/live-window/utils/sky-gradient.ts app/src/scripts/live-window/utils/phase.ts app/src/scripts/live-window/components/sky/SunLayer.ts app/src/scripts/live-window/components/sky/MoonLayer.ts
git commit -m "refactor(live-window): deduplicate sun time fallback into getSunTimesWithDefaults"
```

---

### Task 3: Clean up sky-gradient.ts — remove duplicate time constants and IIFE

**Files:**
- Modify: `app/src/scripts/live-window/utils/sky-gradient.ts:159-161, 263-270`

**Step 1: Replace local time constants with imports**

Replace lines 159-161:

```ts
// Before:
const MIN30 = 30 * 60_000;
const MIN60 = 60 * 60_000;
const MIN90 = 90 * 60_000;
```

With imports from constants.ts and rename usages:

```ts
import { THIRTY_MINUTES_MS, ONE_HOUR_MS, NINETY_MINUTES_MS } from "./constants";
```

Then update all references in `calculatePhaseTimestamps`:
- `MIN30` → `THIRTY_MINUTES_MS`
- `MIN60` → `ONE_HOUR_MS`
- `MIN90` → `NINETY_MINUTES_MS`

Note: `ONE_HOUR_MS` is already defined in constants.ts. The existing import on line ~2-3 should already have it — verify and add if needed.

**Step 2: Replace IIFE-in-ternary with pre-computed variable**

Replace lines 263-270 in `findPhasePosition`:

```ts
  // Before:
  const phaseEnd =
    nextIdx === 0
      ? (() => {
          const eod = new Date(now);
          eod.setHours(23, 59, 59, 999);
          return eod.getTime();
        })()
      : timestamps[nextIdx];
```

With:

```ts
  let phaseEnd: number;
  if (nextIdx === 0) {
    // Last phase wraps to end of day
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    phaseEnd = endOfDay.getTime();
  } else {
    phaseEnd = timestamps[nextIdx];
  }
```

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/utils/sky-gradient.ts
git commit -m "refactor(live-window): use shared time constants, replace IIFE with readable conditional"
```

---

### Task 4: Clean up celestial.ts — rename variables, add comments

**Files:**
- Modify: `app/src/scripts/live-window/utils/celestial.ts:32, 42, 82-98`

**Step 1: Add comment to ARC_Y_AMPLITUDE**

```ts
// Before (line 32):
const ARC_Y_AMPLITUDE = 42;

// After:
/** Maximum vertical travel from horizon to zenith, in percent of container height. */
const ARC_Y_AMPLITUDE = 42;
```

**Step 2: Add inline comment to getSunAngle**

After line 41 (the `const elapsed` line), the angle calculation on line 42:

```ts
  // Map elapsed time since solar noon to a full rotation (one day = 2π)
  const angle = ((elapsed / ONE_DAY_MS) * TWO_PI) % TWO_PI;
```

**Step 3: Rename variables and add comments in getArcPosition**

Replace lines 82-98:

```ts
export function getArcPosition(angle: number): ArcPosition {
  // Normalize angle to [0, 2π)
  const normalizedAngle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const visible = normalizedAngle <= HALF_PI || normalizedAngle >= THREE_HALF_PI;

  if (!visible) {
    return { x: DEFAULT_ARC_X, y: DEFAULT_ARC_Y, visible: false };
  }

  // Rotate so the visible arc [3π/2 → 0 → π/2] maps to [0 → π]
  // This makes the rising edge (3π/2) map to 0 and setting edge (π/2) map to π
  let rotatedAngle = normalizedAngle + HALF_PI;
  if (rotatedAngle >= TWO_PI) rotatedAngle -= TWO_PI;
  const progress = rotatedAngle / Math.PI;

  const x = ARC_X_MIN + progress * ARC_X_RANGE;
  const y = ARC_Y_BASE - Math.sin(progress * Math.PI) * ARC_Y_AMPLITUDE;

  return { x, y, visible };
}
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/utils/celestial.ts
git commit -m "refactor(live-window): improve celestial.ts readability with better names and comments"
```

---

### Task 5: Add comments and attribution to color.ts and stars.ts

**Files:**
- Modify: `app/src/scripts/live-window/utils/color.ts:36-41, 72, 112`
- Modify: `app/src/scripts/live-window/utils/stars.ts:7-18`

**Step 1: Add WCAG attribution to relativeLuminance**

Replace the docstring at line 32-35:

```ts
/**
 * Calculate the relative luminance of an RGB color per WCAG 2.0.
 * Returns a value between 0 (black) and 1 (white).
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
```

**Step 2: Add comment to RGB-to-HSL conversion**

Before line 72 add:

```ts
    // Standard RGB → HSL conversion
```

**Step 3: Add comment to binary search iterations**

Replace line 108:

```ts
    // Binary search for minimum lightness meeting contrast ratio
    // 16 iterations → precision ~0.002% of lightness range
```

**Step 4: Add Mulberry32 attribution to stars.ts**

Replace lines 6-9 of stars.ts:

```ts
/**
 * Mulberry32 PRNG — deterministic random from a 32-bit seed.
 * Returns a function that produces values in [0, 1).
 * @see https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
```

**Step 5: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/utils/color.ts app/src/scripts/live-window/utils/stars.ts
git commit -m "refactor(live-window): add attribution comments to color.ts and stars.ts"
```

---

### Task 6: Export STORAGE_KEY and add CACHE_VERSION changelog in state.ts

**Files:**
- Modify: `app/src/scripts/live-window/state.ts:4-5`
- Modify: `app/src/scripts/live-window/__tests__/state.test.ts:2-4`

**Step 1: Export STORAGE_KEY and add changelog**

Replace lines 4-5 of state.ts:

```ts
/**
 * Cache version — increment when the stored shape changes.
 * v6: Added timezone to location, overrideMoonPhase to attrs.
 */
export const CACHE_VERSION = 6;
export const STORAGE_KEY = "liveWindowStore";
```

**Step 2: Import STORAGE_KEY in test**

Replace lines 2-4 of `__tests__/state.test.ts`:

```ts
import { loadState, saveState, DEFAULT_STORE, CACHE_VERSION, STORAGE_KEY } from "../state";
```

Remove line 4: `const STORAGE_KEY = "liveWindowStore";`

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/state.ts app/src/scripts/live-window/__tests__/state.test.ts
git commit -m "refactor(live-window): export STORAGE_KEY, add CACHE_VERSION changelog"
```

---

### Task 7: Update api.ts to use shared time constant

**Files:**
- Modify: `app/src/scripts/live-window/api.ts:1-3`

**Step 1: Replace local constant with import**

Replace line 3:

```ts
// Before:
export const WEATHER_RATE_LIMIT = 30 * 60_000;

// After:
import { THIRTY_MINUTES_MS } from "./utils/constants";

export const WEATHER_RATE_LIMIT = THIRTY_MINUTES_MS;
```

**Step 2: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/api.ts
git commit -m "refactor(live-window): use shared THIRTY_MINUTES_MS in api.ts"
```

---

### Task 8: Type safety for weather-types.ts and weather-configs.ts

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/weather/weather-types.ts:69-72`
- Modify: `app/src/scripts/live-window/components/sky/weather/weather-configs.ts:16, 179, 193, 298-311, 313-335`

**Step 1: Create PrecipType union and fix PrecipLayer.type**

In `weather-types.ts`, add before the `PrecipLayer` interface (before line 69):

```ts
/** Valid precipitation config keys — must match PRECIP_CONFIG object keys. */
export type PrecipType =
  | "lightRain" | "rain" | "snow" | "sleet" | "drizzle" | "showerRain"
  | "freezingRain" | "lightSnow" | "heavySnow" | "showerSnow"
  | "drizzleLight" | "drizzleHeavy" | "showerDrizzle" | "heavyRain"
  | "extremeRain" | "showerSleet";
```

Then update `PrecipLayer`:

```ts
export interface PrecipLayer {
  type: PrecipType;
  intensityScale: number;
}
```

**Step 2: Fix Record<string, ...> types in weather-configs.ts**

Replace line 16:
```ts
export const PRECIP_CONFIG: Record<PrecipType, PrecipConfig> = {
```

Add import for `PrecipType` in the import block at top:
```ts
import type {
  PrecipConfig,
  PrecipType,
  ...
} from "./weather-types";
```

Replace line 179:
```ts
export const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
```
Keep as `Record<string, AtmosphereConfig>` — the keys are varied enough that a union type adds little value. But add a type comment:
```ts
/** Atmosphere overlay configs keyed by weather condition name. */
export const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
```

Same for `ATMO_PARTICLE_CONFIG` on line 193 — keep `Record<string, ...>` with a descriptive comment.

Replace lines 298-303:
```ts
export const CLOUD_COLORS: Record<Exclude<CloudDensity, "none">, [string, string]> = {
```

Replace lines 306-311:
```ts
export const SKY_TINT_STRENGTH: Record<Exclude<CloudDensity, "none">, number> = {
```

**Step 3: Rename fx and p to readable names**

Replace lines 313-335:

```ts
/** Helper to construct a WeatherEffectConfig with sensible defaults. */
function createWeatherEffect(
  clouds: WeatherEffectConfig["clouds"],
  precip: PrecipLayer[],
  opts?: {
    lightning?: LightningVariant;
    atmosphere?: AtmosphereConfig;
    wind?: WindLevel;
    atmosphereParticles?: AtmosphereParticleConfig;
  },
): WeatherEffectConfig {
  return {
    clouds,
    precip,
    lightning: opts?.lightning ?? false,
    atmosphere: opts?.atmosphere ?? null,
    wind: opts?.wind ?? "none",
    atmosphereParticles: opts?.atmosphereParticles ?? null,
  };
}

/** Helper to construct a PrecipLayer entry. */
function precipLayer(type: PrecipType, intensityScale = 1.0): PrecipLayer {
  return { type, intensityScale };
}
```

Then find-and-replace all usages in `WEATHER_EFFECTS`:
- `fx(` → `createWeatherEffect(`
- `p(` → `precipLayer(`

Make sure to not accidentally replace `p.` or other occurrences — these are only called as function calls `fx(` and `p(` at the start of expressions in the WEATHER_EFFECTS object.

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 5: Run typecheck**

Run: `just app::typecheck`
Expected: No type errors

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/components/sky/weather/weather-types.ts app/src/scripts/live-window/components/sky/weather/weather-configs.ts
git commit -m "refactor(live-window): add PrecipType union, rename fx/p, tighten Record types"
```

---

### Task 9: Type safety and dedup in weather-colors.ts

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/weather/weather-colors.ts:20-28, 74-78, 96-100`

**Step 1: Tighten Record types**

Replace lines 20-25:
```ts
import type { CloudDensity, LightningVariant } from "./weather-types";

const CLOUD_DARKEN: Record<Exclude<CloudDensity, "none">, number> = {
  light: 0.05,
  medium: 0.12,
  heavy: 0.22,
  storm: 0.28,
};
```

Replace line 28:
```ts
const LIGHTNING_DARKEN: Record<LightningVariant, number> = { intense: 0.16, distant: 0.06, standard: 0.12 };
```

Add imports for `CloudDensity` and `LightningVariant` to the import block.

**Step 2: Extract averageSkyBands helper**

Add before `getCloudColor` (before line 59):

```ts
/** Average the upper and lower sky gradient bands — gives the dominant sky color at cloud altitude. */
function averageSkyBands(skyGradient: SkyGradient): string {
  return rgbToHex({
    r: Math.round((skyGradient.upper.r + skyGradient.lower.r) / 2),
    g: Math.round((skyGradient.upper.g + skyGradient.lower.g) / 2),
    b: Math.round((skyGradient.upper.b + skyGradient.lower.b) / 2),
  });
}
```

Then replace lines 74-78 in `getCloudColor`:
```ts
      const warmColor = averageSkyBands(skyGradient);
```

And replace lines 96-100 in `getAtmosphereColor`:
```ts
      const warmColor = averageSkyBands(skyGradient);
```

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/weather/weather-colors.ts
git commit -m "refactor(live-window): tighten weather-colors types, extract averageSkyBands helper"
```

---

### Task 10: Clean up weather-html.ts — extract animation constants, add comments

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/weather/weather-html.ts:1-98`

**Step 1: Add animation timing constants at top of file**

After the imports (after line 3), add:

```ts
// --- Deterministic animation timing ranges ---
// Each element gets a pseudo-random duration and a negative delay
// (negative delays start the animation mid-cycle so elements aren't synchronized)

/** Cloud floating animation: duration 4.0s–9.9s */
const CLOUD_BASE_DURATION = 4;
const CLOUD_DURATION_JITTER = 6; // range in seconds (via hash % 60 / 10)
/** Cloud animation negative delay: 0.0s to -7.9s */
const CLOUD_MAX_NEGATIVE_DELAY = 8; // (via hash % 80 / 10)

/** Precipitation sway: duration 2.0s–3.7s */
const SWAY_BASE_DURATION = 2;
const SWAY_DURATION_JITTER = 1.8; // (via hash % 18 / 10)
/** Precipitation sway negative delay: 0.0s to -3.9s */
const SWAY_MAX_NEGATIVE_DELAY = 4; // (via hash % 40 / 10)

/** Atmosphere particle jitter added to base speed: 0.0s–2.9s */
const ATMO_DURATION_JITTER = 3; // (via hash % 30 / 10)
/** Atmosphere particle negative delay: 0.0s to -7.9s */
const ATMO_MAX_NEGATIVE_DELAY = 8; // (via hash % 80 / 10)

/** Atmosphere particles are constrained to the top 80% of the scene. */
const ATMO_Y_RANGE = 80;

/** Golden ratio conjugate — produces evenly-spaced distribution across [0, 1) when used as (i * φ) % 1. */
const GOLDEN_RATIO = 0.618033;
/** Initial offset for golden ratio cloud distribution. */
const GOLDEN_RATIO_OFFSET = 0.3;
/** Cloud X range: -5% to 105% of container width (allows clouds to partially overflow). */
const CLOUD_X_SCALE = 110;
const CLOUD_X_OFFSET = -5;

/** Second hash constant for Y-position, decorrelated from Knuth hash. */
const Y_HASH_MULTIPLIER = 1597334677;
/** Prime multiplier for decorrelating Y positions from X positions. */
const POSITION_DECORRELATION_PRIME = 37;
```

**Step 2: Update cloudHTML to use the constants**

Replace lines 20-28:

```ts
    const yHash = ((i + 1) * Y_HASH_MULTIPLIER) >>> 0;
    const left = ((i * GOLDEN_RATIO + GOLDEN_RATIO_OFFSET) % 1) * CLOUD_X_SCALE + CLOUD_X_OFFSET;
    const top = config.yRange[0] + (yHash % (ySpan + 1));
    const size = config.sizeRange[0] + (h % (sizeRange + 1));
    const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;

    const floatName = FLOAT_NAMES[i % 3];
    const dur = (CLOUD_BASE_DURATION + ((h >>> 12) % (CLOUD_DURATION_JITTER * 10)) / 10).toFixed(1);
    const delay = (-((h >>> 16) % (CLOUD_MAX_NEGATIVE_DELAY * 10)) / 10).toFixed(1);
```

**Step 3: Update particleHTML to use the constants**

Replace lines 56, 64-65:

```ts
    const top = ((h >>> 8) ^ (i * POSITION_DECORRELATION_PRIME)) % 100;
    ...
      const dur = (SWAY_BASE_DURATION + ((h >>> 12) % (SWAY_DURATION_JITTER * 10)) / 10).toFixed(1);
      const delay = (-((h >>> 16) % (SWAY_MAX_NEGATIVE_DELAY * 10)) / 10).toFixed(1);
```

**Step 4: Update atmosphereParticleHTML to use the constants**

Replace lines 86, 89-90:

```ts
    const top = ((h >>> 8) ^ (i * POSITION_DECORRELATION_PRIME)) % ATMO_Y_RANGE;
    ...
    const dur = parseFloat(config.speed) + ((h >>> 12) % (ATMO_DURATION_JITTER * 10)) / 10;
    const delay = -((h >>> 16) % (ATMO_MAX_NEGATIVE_DELAY * 10)) / 10;
```

**Step 5: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/components/sky/weather/weather-html.ts
git commit -m "refactor(live-window): extract animation constants in weather-html.ts, add comments"
```

---

### Task 11: Remove duplicate barrel exports from WeatherLayer.ts

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:7-27`

**Step 1: Check if any file imports from WeatherLayer.ts instead of weather/index.ts**

Search for imports from `"./WeatherLayer"` or `"../WeatherLayer"` or similar. The barrel in `weather/index.ts` already exports everything. The re-exports on lines 7-27 of `WeatherLayer.ts` are redundant.

**Step 2: Remove the re-exports**

Delete lines 7-27 (the `export type {...}` and `export {...}` blocks). Keep the comment on line 7 only if someone was importing from this path — in which case, update their imports to use `./weather` or `./weather/index` instead.

After removal, lines 1-6 should look like:

```ts
import type { SceneComponent, LiveWindowState } from "../../types";
import type { CloudDensity } from "./weather/weather-types";
import { WEATHER_EFFECTS, CLOUD_CONFIGS, PRECIP_CONFIG } from "./weather/weather-configs";
import { getCloudColor, getAtmosphereColor, getSkyDarkenOpacity } from "./weather/weather-colors";
import { cloudHTML, particleHTML, atmosphereParticleHTML, lightningHTML } from "./weather/weather-html";
```

**Step 3: Verify no broken imports**

Run: `just app::typecheck`
Expected: No errors. If there are broken imports, update them to point at `./weather` or `./weather/weather-types` etc.

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "refactor(live-window): remove duplicate barrel re-exports from WeatherLayer.ts"
```

---

### Task 12: Extract constants and add types in WeatherLayer.ts

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:128-130, 139, 155-157, 163`

**Step 1: Add constants before the class definition**

```ts
/** Fraction of clouds rendered behind precipitation/lightning (rest go in front). */
const BACK_CLOUD_RATIO = 0.4;

/** Wind skew angle in degrees per wind level. */
const WIND_SKEW_DEG: Record<import("./weather/weather-types").WindLevel, number> = {
  strong: 15,
  moderate: 8,
  light: 3,
  none: 0,
};

/** CSS size classes for atmosphere layers, applied in order. */
const ATMOSPHERE_SIZES = ["lg", "md", "sm"] as const;
```

Or import `WindLevel` at the top and use it directly.

**Step 2: Replace magic numbers in update()**

Lines 128-130 (back clouds) and 155-157 (front clouds):
```ts
      const total = CLOUD_CONFIGS[config.clouds as Exclude<CloudDensity, "none">].count;
      const backCount = Math.ceil(total * BACK_CLOUD_RATIO);
```

Line 139:
```ts
    const skewDeg = WIND_SKEW_DEG[config.wind];
```

Line 163:
```ts
      const sizes = ATMOSPHERE_SIZES;
```

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "refactor(live-window): extract BACK_CLOUD_RATIO, WIND_SKEW_DEG, ATMOSPHERE_SIZES in WeatherLayer"
```

---

### Task 13: MoonLayer.ts — use shared constants and add phase math comments

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/MoonLayer.ts:1-86`

**Step 1: Import shared constants**

Add to imports:
```ts
import { FALLBACK_NIGHT_SKY_RGB, MOON_GLOW_COLOR_RGB, MOON_GLOW_BLUR_PX } from "../../utils/constants";
```

**Step 2: Use FALLBACK_NIGHT_SKY_RGB on line 65**

```ts
      const skyColor = g ? this.sampleSkyAt(g, pos.y / 100) : FALLBACK_NIGHT_SKY_RGB;
```

**Step 3: Add comments to phase shadow math (lines 67-73)**

```ts
      // Shadow displacement: maps phase 0–1 to a sliding shadow across the moon disc.
      // phase 0 (new moon): dx = 0, shadow covers the full moon
      // phase 0.25: dx = -MOON_DIAMETER/2, half lit (first quarter)
      // phase 0.5 (full moon): dx = -MOON_DIAMETER, shadow fully off-screen
      // phase 0.75: dx = MOON_DIAMETER/2, half lit (last quarter)
      let dx: number;
```

**Step 4: Add comment to lit amount (line 82) and use constants for glow**

```ts
      // Lit fraction: 0 at new moon (phase 0), 1 at full moon (0.5), 0 at next new (1)
      const litAmount = moonPhase <= 0.5 ? moonPhase * 2 : (1 - moonPhase) * 2;
      const glowOpacity = (MOON_GLOW_OPACITY * litAmount).toFixed(2);
      const glowSpread = Math.round(MOON_GLOW_SPREAD_MIN + MOON_GLOW_SPREAD_RANGE * litAmount);
      this.moon.style.boxShadow = `0 0 ${MOON_GLOW_BLUR_PX}px ${glowSpread}px rgba(${MOON_GLOW_COLOR_RGB}, ${glowOpacity})`;
```

**Step 5: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/components/sky/MoonLayer.ts
git commit -m "refactor(live-window): use shared constants and add phase math comments in MoonLayer"
```

---

### Task 14: BlindsComponent.ts — add comments to complex code

**Files:**
- Modify: `app/src/scripts/live-window/components/BlindsComponent.ts:14-15, 162, 217-236`

**Step 1: Add comment to collapse ratio range**

Replace lines 14-15:
```ts
// Final collapse ratio: between MIN_COLLAPSE_RATIO and MIN_COLLAPSE_RATIO + COLLAPSE_RATIO_RANGE
// (e.g., 0.7 to 0.95 = 70–95% of blinds collapse upward when opened)
const MIN_COLLAPSE_RATIO = 0.7;
const COLLAPSE_RATIO_RANGE = 0.25;
```

**Step 2: Add comment to double rAF (line 162)**

```ts
    // Double requestAnimationFrame ensures the browser has fully computed layout
    // before we measure element positions for the string height calculation
    requestAnimationFrame(() => requestAnimationFrame(() => this.updateStrings()));
```

**Step 3: Add comments to skew calculation (lines 217-239)**

```ts
  /**
   * Compute the skew + rotation transform for an individual open blind slat.
   * The total skew is distributed linearly across open blinds, creating a
   * perspective-like fan effect. blindIndex counts from the top (0 = topmost open slat).
   */
  private getSkewAndRotateTransform(blindIndex: number): string {
    const state = this.blindsState;
    // Count from bottom: currBlind = 1 for the bottom slat
    const currBlind = NUM_BLINDS - blindIndex;
    const numOpen = NUM_BLINDS - state.numBlindsCollapsed;
    // Each open slat gets an equal fraction of the total skew
    const skewSteps = numOpen > 0 ? state.blindsSkewDeg / numOpen : 0;

    let skewDeg = 0;
    if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
      // Linearly distribute skew: topmost open slat gets full skew, bottom gets zero
      skewDeg = state.blindsSkewDeg - (currBlind - state.numBlindsCollapsed - 1) * skewSteps;
    }

    const rot = state.blindsOpenDeg;
    return `rotateX(${rot}deg) skewY(${skewDeg * state.skewDirection}deg)`;
  }

  private getSkewOnlyTransform(): string {
    const state = this.blindsState;
    let skewDeg = 0;
    if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
      // Collapsed group and slat bar sit at the midpoint of the total skew
      skewDeg = state.blindsSkewDeg / 2;
    }
    return `skewY(${skewDeg * state.skewDirection}deg)`;
  }
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/BlindsComponent.ts
git commit -m "refactor(live-window): add explanatory comments to BlindsComponent animation math"
```

---

### Task 15: ClockComponent.ts — use padStart, add midnight comment

**Files:**
- Modify: `app/src/scripts/live-window/components/ClockComponent.ts:57, 72-73`

**Step 1: Add midnight edge case comment (line 57)**

```ts
      // Intl.DateTimeFormat returns 24 for midnight in hour12:false mode in some locales
      if (raw === 24) raw = 0;
```

**Step 2: Replace ternary zero-padding with padStart (lines 72-73)**

```ts
    if (this.hourEl) this.hourEl.textContent = String(h).padStart(2, "0");
    if (this.minuteEl) this.minuteEl.textContent = String(m).padStart(2, "0");
```

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/ClockComponent.ts
git commit -m "refactor(live-window): use padStart and add midnight comment in ClockComponent"
```

---

### Task 16: SkyComponent.ts — add ordering comment

**Files:**
- Modify: `app/src/scripts/live-window/components/SkyComponent.ts:9-15`

**Step 1: Add ordering contract comment**

```ts
  // Order matters: GradientLayer must be first because it writes state.ref.currentGradient,
  // which MoonLayer and WeatherLayer read during the same update cycle.
  private children: SceneComponent[] = [
    new GradientLayer(),
    new StarsLayer(),
    new SunLayer(),
    new MoonLayer(),
    new WeatherLayer(),
  ];
```

**Step 2: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/components/SkyComponent.ts
git commit -m "refactor(live-window): document layer ordering contract in SkyComponent"
```

---

### Task 17: LiveWindow.ts — extract constants, rename variables, decompose refreshComputed

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts`

**Step 1: Add constants at top of file (after WEATHER_DESCRIPTIONS)**

```ts
/** Google Fonts stylesheet URL for the clock font. */
const FONT_STYLESHEET_URL = "https://fonts.googleapis.com/css2?family=Squada+One&display=swap";

/** Data attribute used to detect/mark the font <link> element in the host document. */
const FONT_DATA_ATTR = "data-live-window-font";

/**
 * OpenWeatherMap weather group ID → icon code.
 * The group is derived as Math.floor(weatherId / 100).
 */
const WEATHER_GROUP_ICON: Record<number, string> = {
  2: "11", // Thunderstorm
  3: "09", // Drizzle → shower rain icon
  5: "10", // Rain
  6: "13", // Snow
  7: "50", // Atmosphere (fog/mist)
  8: "01", // Clear/Clouds (overridden below for specific cloud IDs)
};

/**
 * Specific OWM weather IDs for cloud coverage → icon code.
 * These override the group-level mapping above.
 */
const CLOUD_COVERAGE_ICON: Record<number, string> = {
  800: "01", // Clear sky
  801: "02", // Few clouds (11-25%)
  802: "03", // Scattered clouds (25-50%)
  803: "04", // Broken clouds (51-84%)
  804: "04", // Overcast clouds (85-100%)
};
```

**Step 2: Import shared constants**

Add to the imports from `./utils/constants`:

```ts
import { ONE_DAY_MS, ONE_HOUR_MS, CLOCK_INTERVAL_MS, SKY_UPDATE_INTERVAL_MS, MIN_TICK_SPEED, MAX_TICK_SPEED, DEFAULT_TEMP_CELSIUS, DEFAULT_BG_COLOR } from "./utils/constants";
```

**Step 3: Use constants in connectedCallback (lines 122-128)**

```ts
    connectedCallback() {
      if (!document.querySelector(`link[${FONT_DATA_ATTR}]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = FONT_STYLESHEET_URL;
        link.setAttribute(FONT_DATA_ATTR, "");
        // Font loaded in host document <head> because Shadow DOM can't load
        // external @font-face stylesheets internally
        document.head.appendChild(link);
      }
```

**Step 4: Use constants in refreshAttrs (line 230)**

```ts
      const tickSpeed = tickSpeedRaw ? Math.max(MIN_TICK_SPEED, Math.min(MAX_TICK_SPEED, parseFloat(tickSpeedRaw))) : 1;
```

**Step 5: Rename variables in refreshComputed (lines 251, 257-258)**

```ts
      const timezone = this.state.attrs.timezone;
      ...
      const sunriseOverride = overrideSunrise ? this.parseTimeToTimestamp(overrideSunrise) : null;
      const sunsetOverride = overrideSunset ? this.parseTimeToTimestamp(overrideSunset) : null;
```

Update all references to these renamed variables within `refreshComputed`.

**Step 6: Extract icon derivation from refreshComputed**

Add a new private method:

```ts
  /**
   * Derive the OWM icon code from a weather ID + day/night flag.
   * First checks specific cloud-coverage IDs, then falls back to group-level mapping.
   */
  private deriveWeatherIcon(weatherId: number, isDaytime: boolean): string {
    const iconBase = CLOUD_COVERAGE_ICON[weatherId]
      ?? WEATHER_GROUP_ICON[Math.floor(weatherId / 100)]
      ?? "01";
    return iconBase + (isDaytime ? "d" : "n");
  }
```

Then simplify the weather override block in `refreshComputed`:

```ts
      if (overrideWeather) {
        const weatherId = parseInt(overrideWeather, 10);
        const isDaytime = now >= (store.weather.sunrise ?? 0) && now <= (store.weather.sunset ?? 0);

        store = {
          ...store,
          weather: {
            ...store.weather,
            current: {
              id: weatherId,
              main: WEATHER_DESCRIPTIONS[weatherId]?.split(" ")[0] ?? "Unknown",
              description: WEATHER_DESCRIPTIONS[weatherId] ?? "",
              icon: this.deriveWeatherIcon(weatherId, isDaytime),
              temp: store.weather.current?.temp ?? DEFAULT_TEMP_CELSIUS,
            },
          },
        };
      }
```

**Step 7: Use DEFAULT_BG_COLOR in getBgColor (line 327)**

```ts
      return parseComputedColor(computed) ?? DEFAULT_BG_COLOR;
```

**Step 8: Add virtual clock mode documentation (before line 428)**

```ts
  /**
   * Returns the effective "now" timestamp, accounting for overrides and virtual clock.
   *
   * Four modes (checked in order):
   * 1. Virtual clock advancing — virtualTime + scaled elapsed real time, wraps at midnight
   * 2. Static virtual time — frozen at virtualTime (paused virtual clock)
   * 3. Override time attribute — parsed from "HH:MM" string
   * 4. Normal real time — Date.now() with optional timezone shift
   */
```

**Step 9: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 10: Run typecheck**

Run: `just app::typecheck`
Expected: No errors

**Step 11: Commit**

```bash
git add app/src/scripts/live-window/LiveWindow.ts
git commit -m "refactor(live-window): extract constants, rename variables, document virtual clock in LiveWindow"
```

---

### Task 18: Update README.md — fix stale docs

**Files:**
- Modify: `app/src/scripts/live-window/README.md`

**Step 1: Fix SkyLayer → SceneComponent (line 73)**

```md
`.sky` container. Each layer implements the `SceneComponent` interface
```

**Step 2: Update current layers list (lines 78-82)**

```md
Current layers (bottom to top):

1. **GradientLayer** — renders the sky color gradient
2. **StarsLayer** — renders procedurally generated stars with twinkle animation
3. **SunLayer** — positions the sun along a celestial arc
4. **MoonLayer** — positions the moon with lunar phase shadow
5. **WeatherLayer** — renders clouds, rain, snow, lightning, mist
```

**Step 3: Fix adding a new layer instructions (lines 83-87)**

```md
Adding a new layer:

1. Create `components/sky/<Name>Layer.ts` implementing `SceneComponent`
2. Register it in the `children` array in `SkyComponent.ts`
3. Add styles to `live-window.css`
```

**Step 4: Update files table (lines 169-183)**

```md
## Files

| File                                | Purpose                                              |
| ----------------------------------- | ---------------------------------------------------- |
| `LiveWindow.ts`                     | Web Component orchestrator, lifecycle, intervals     |
| `live-window.css`                   | All styles (loaded into Shadow DOM via `<link>`)     |
| `types.ts`                          | Shared interfaces: RGB, SkyGradient, PhaseInfo, etc. |
| `state.ts`                          | localStorage persistence, cache versioning           |
| `api.ts`                            | Location + weather fetch via Worker + rate limiting   |
| `components/ClockComponent.ts`      | Clock rendering + time format logic                  |
| `components/BlindsComponent.ts`     | Blinds animation + rendering                         |
| `components/InfoPanelComponent.ts`  | Location, weather text, and coords display           |
| `components/SkyComponent.ts`        | Sky layer orchestrator (ordering + lifecycle)         |
| `components/sky/GradientLayer.ts`   | Sky color gradient (16 phases)                       |
| `components/sky/StarsLayer.ts`      | Procedural star field with twinkle                   |
| `components/sky/SunLayer.ts`        | Sun positioning along celestial arc                  |
| `components/sky/MoonLayer.ts`       | Moon positioning with lunar phase shadow             |
| `components/sky/WeatherLayer.ts`    | Clouds, rain, snow, lightning, mist                  |
| `utils/celestial.ts`                | Sun/moon angle + arc position math                   |
| `utils/color.ts`                    | WCAG contrast, luminance, hex/RGB conversion         |
| `utils/constants.ts`                | Shared numeric/timing constants                      |
| `utils/math.ts`                     | clamp01, lerp, smoothstep, knuthHash                 |
| `utils/phase.ts`                    | PhaseInfo builder + sun position calculation         |
| `utils/sky-gradient.ts`             | 16-phase sky gradient, phase timestamps              |
| `utils/stars.ts`                    | Star field generation, Mulberry32 PRNG               |
| `utils/timezone.ts`                 | Timezone-shifted timestamp utilities                 |
```

**Step 5: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/README.md
git commit -m "docs(live-window): update README with current file structure and layer list"
```

---

### Task 19: Final verification

**Step 1: Run full test suite**

Run: `just app::test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: No type errors

**Step 3: Run build**

Run: `just app::build`
Expected: Build succeeds

**Step 4: Manual review**

Scan through all modified files to confirm:
- No behavioral changes introduced
- All magic numbers have named constants or inline comments
- All complex math has explanatory comments
- Terse names have been expanded
- Duplicated logic has been consolidated
- Type safety has been improved where noted
