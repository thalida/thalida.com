---
title: Sky Gradient Revamp Implementation Plan
description: Replace the live window's 8-color flat gradient with a 16-phase,
  4-stop vertical gradient that matches real-world sky appearance based on
  sunrise, sunset, and twilight phases.
publishedOn: 2026-03-02T02:17:02.000Z
tags:
  - implementation
---

# Sky Gradient Revamp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the live window's 8-color flat gradient with a 16-phase, 4-stop vertical gradient that matches real-world sky appearance based on sunrise, sunset, and twilight phases.

**Architecture:** Extract all gradient computation into a new pure-function module `sky-gradient.ts` alongside the existing `live-window.ts`. The web component imports from this module. This separation enables unit testing of all gradient math without needing DOM/web component setup.

**Tech Stack:** TypeScript, Vitest (jsdom), CSS linear-gradient

---

### Task 1: Create sky-gradient module with types and phase color data

**Files:**

- Create: `app/src/scripts/live-window/sky-gradient.ts`
- Test: `app/src/scripts/live-window/__tests__/sky-gradient.test.ts`

**Step 1: Create the sky-gradient module with types and phase data**

Create `app/src/scripts/live-window/sky-gradient.ts`:

```typescript
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SkyGradient {
  zenith: RGB;
  upper: RGB;
  lower: RGB;
  horizon: RGB;
}

interface SkyPhase {
  name: string;
  gradient: SkyGradient;
}

// 16 sky phases ordered chronologically from midnight.
// Each defines a 4-stop vertical gradient: zenith (top) → horizon (bottom).
export const SKY_PHASES: SkyPhase[] = [
  {
    name: "night",
    gradient: {
      zenith: { r: 5, g: 5, b: 25 },
      upper: { r: 10, g: 15, b: 40 },
      lower: { r: 10, g: 15, b: 45 },
      horizon: { r: 12, g: 20, b: 50 },
    },
  },
  {
    name: "astronomicalDawn",
    gradient: {
      zenith: { r: 10, g: 15, b: 40 },
      upper: { r: 15, g: 20, b: 55 },
      lower: { r: 25, g: 25, b: 70 },
      horizon: { r: 35, g: 30, b: 80 },
    },
  },
  {
    name: "nauticalDawn",
    gradient: {
      zenith: { r: 15, g: 25, b: 60 },
      upper: { r: 30, g: 40, b: 90 },
      lower: { r: 50, g: 45, b: 100 },
      horizon: { r: 80, g: 60, b: 100 },
    },
  },
  {
    name: "civilDawn",
    gradient: {
      zenith: { r: 40, g: 60, b: 120 },
      upper: { r: 60, g: 80, b: 150 },
      lower: { r: 120, g: 100, b: 160 },
      horizon: { r: 200, g: 130, b: 120 },
    },
  },
  {
    name: "sunrise",
    gradient: {
      zenith: { r: 70, g: 130, b: 200 },
      upper: { r: 130, g: 160, b: 210 },
      lower: { r: 220, g: 160, b: 140 },
      horizon: { r: 255, g: 170, b: 80 },
    },
  },
  {
    name: "goldenHourAm",
    gradient: {
      zenith: { r: 80, g: 150, b: 220 },
      upper: { r: 140, g: 185, b: 225 },
      lower: { r: 230, g: 200, b: 170 },
      horizon: { r: 255, g: 200, b: 100 },
    },
  },
  {
    name: "earlyMorning",
    gradient: {
      zenith: { r: 90, g: 165, b: 230 },
      upper: { r: 140, g: 195, b: 235 },
      lower: { r: 180, g: 210, b: 235 },
      horizon: { r: 210, g: 215, b: 220 },
    },
  },
  {
    name: "lateMorning",
    gradient: {
      zenith: { r: 80, g: 160, b: 235 },
      upper: { r: 120, g: 185, b: 240 },
      lower: { r: 170, g: 210, b: 245 },
      horizon: { r: 200, g: 220, b: 240 },
    },
  },
  {
    name: "midday",
    gradient: {
      zenith: { r: 65, g: 150, b: 240 },
      upper: { r: 110, g: 180, b: 245 },
      lower: { r: 160, g: 210, b: 250 },
      horizon: { r: 200, g: 225, b: 245 },
    },
  },
  {
    name: "earlyAfternoon",
    gradient: {
      zenith: { r: 75, g: 155, b: 235 },
      upper: { r: 115, g: 182, b: 240 },
      lower: { r: 165, g: 205, b: 240 },
      horizon: { r: 205, g: 220, b: 235 },
    },
  },
  {
    name: "lateAfternoon",
    gradient: {
      zenith: { r: 70, g: 140, b: 220 },
      upper: { r: 120, g: 170, b: 225 },
      lower: { r: 180, g: 195, b: 210 },
      horizon: { r: 220, g: 200, b: 180 },
    },
  },
  {
    name: "goldenHourPm",
    gradient: {
      zenith: { r: 60, g: 120, b: 200 },
      upper: { r: 110, g: 140, b: 200 },
      lower: { r: 200, g: 170, b: 140 },
      horizon: { r: 255, g: 190, b: 90 },
    },
  },
  {
    name: "sunset",
    gradient: {
      zenith: { r: 50, g: 60, b: 150 },
      upper: { r: 100, g: 80, b: 160 },
      lower: { r: 220, g: 120, b: 100 },
      horizon: { r: 255, g: 100, b: 50 },
    },
  },
  {
    name: "civilDusk",
    gradient: {
      zenith: { r: 30, g: 40, b: 110 },
      upper: { r: 60, g: 50, b: 130 },
      lower: { r: 140, g: 80, b: 120 },
      horizon: { r: 200, g: 100, b: 80 },
    },
  },
  {
    name: "nauticalDusk",
    gradient: {
      zenith: { r: 15, g: 25, b: 70 },
      upper: { r: 30, g: 30, b: 90 },
      lower: { r: 50, g: 40, b: 90 },
      horizon: { r: 70, g: 45, b: 80 },
    },
  },
  {
    name: "astronomicalDusk",
    gradient: {
      zenith: { r: 10, g: 15, b: 45 },
      upper: { r: 15, g: 20, b: 55 },
      lower: { r: 25, g: 25, b: 65 },
      horizon: { r: 35, g: 28, b: 70 },
    },
  },
];
```

**Step 2: Write the test for phase data validity**

Create `app/src/scripts/live-window/__tests__/sky-gradient.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { SKY_PHASES } from "../sky-gradient";

describe("SKY_PHASES", () => {
  it("has exactly 16 phases", () => {
    expect(SKY_PHASES).toHaveLength(16);
  });

  it("every phase has a name and valid gradient with 4 RGB stops", () => {
    for (const phase of SKY_PHASES) {
      expect(phase.name).toBeTruthy();
      for (const stop of [phase.gradient.zenith, phase.gradient.upper, phase.gradient.lower, phase.gradient.horizon]) {
        expect(stop.r).toBeGreaterThanOrEqual(0);
        expect(stop.r).toBeLessThanOrEqual(255);
        expect(stop.g).toBeGreaterThanOrEqual(0);
        expect(stop.g).toBeLessThanOrEqual(255);
        expect(stop.b).toBeGreaterThanOrEqual(0);
        expect(stop.b).toBeLessThanOrEqual(255);
      }
    }
  });

  it("starts with night and ends with astronomicalDusk", () => {
    expect(SKY_PHASES[0].name).toBe("night");
    expect(SKY_PHASES[15].name).toBe("astronomicalDusk");
  });
});
```

**Step 3: Run test to verify it passes**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/sky-gradient.test.ts`
Expected: 3 tests PASS

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/sky-gradient.ts app/src/scripts/live-window/__tests__/sky-gradient.test.ts
git commit -m "feat(live-window): add sky phase types and 16-phase color palette"
```

---

### Task 2: Implement and test calculatePhaseTimestamps

**Files:**

- Modify: `app/src/scripts/live-window/sky-gradient.ts`
- Test: `app/src/scripts/live-window/__tests__/sky-gradient.test.ts`

**Step 1: Write the failing tests**

Add to `sky-gradient.test.ts`:

```typescript
import { SKY_PHASES, calculatePhaseTimestamps, getDefaultSunTimes } from "../sky-gradient";

describe("getDefaultSunTimes", () => {
  it("returns 6:00 sunrise and 18:00 sunset for today", () => {
    const { sunrise, sunset } = getDefaultSunTimes();
    const sr = new Date(sunrise);
    const ss = new Date(sunset);
    expect(sr.getHours()).toBe(6);
    expect(sr.getMinutes()).toBe(0);
    expect(ss.getHours()).toBe(18);
    expect(ss.getMinutes()).toBe(0);
  });
});

describe("calculatePhaseTimestamps", () => {
  // Use a fixed sunrise (7:00 AM) and sunset (7:00 PM) for test determinism
  const today = new Date();
  today.setHours(7, 0, 0, 0);
  const sunrise = today.getTime();
  today.setHours(19, 0, 0, 0);
  const sunset = today.getTime();

  it("returns exactly 16 timestamps", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps).toHaveLength(16);
  });

  it("timestamps are in strictly ascending order", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
    }
  });

  it("sunrise phase (index 4) matches the sunrise timestamp", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps[4]).toBe(sunrise);
  });

  it("sunset phase (index 12) matches the sunset timestamp", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps[12]).toBe(sunset);
  });

  it("twilight offsets are correct relative to sunrise/sunset", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    const MIN30 = 30 * 60_000;
    const MIN60 = 60 * 60_000;
    const MIN90 = 90 * 60_000;

    // Dawn twilights (before sunrise)
    expect(timestamps[1]).toBe(sunrise - MIN90); // astronomical dawn
    expect(timestamps[2]).toBe(sunrise - MIN60); // nautical dawn
    expect(timestamps[3]).toBe(sunrise - MIN30); // civil dawn

    // Dusk twilights (after sunset)
    expect(timestamps[13]).toBe(sunset + MIN30); // civil dusk
    expect(timestamps[14]).toBe(sunset + MIN60); // nautical dusk
    expect(timestamps[15]).toBe(sunset + MIN90); // astronomical dusk
  });

  it("solar noon (midday, index 8) is midpoint of sunrise and sunset", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps[8]).toBe((sunrise + sunset) / 2);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/sky-gradient.test.ts`
Expected: FAIL — `calculatePhaseTimestamps` and `getDefaultSunTimes` are not exported

**Step 3: Implement the functions**

Add to `app/src/scripts/live-window/sky-gradient.ts`:

```typescript
const MIN30 = 30 * 60_000;
const MIN60 = 60 * 60_000;
const MIN90 = 90 * 60_000;

/**
 * Returns default sunrise (6:00 AM) and sunset (6:00 PM) for today.
 * Used as fallback when weather API data is unavailable.
 */
export function getDefaultSunTimes(): { sunrise: number; sunset: number } {
  const now = new Date();
  const sr = new Date(now);
  sr.setHours(6, 0, 0, 0);
  const ss = new Date(now);
  ss.setHours(18, 0, 0, 0);
  return { sunrise: sr.getTime(), sunset: ss.getTime() };
}

/**
 * Calculates the timestamp for each of the 16 sky phases based on
 * sunrise and sunset times.
 *
 * Phase indices:
 *  0: night           — midnight (start of day)
 *  1: astronomicalDawn — sunrise - 90min
 *  2: nauticalDawn     — sunrise - 60min
 *  3: civilDawn        — sunrise - 30min
 *  4: sunrise          — sunrise
 *  5: goldenHourAm     — sunrise + 30min
 *  6: earlyMorning     — sunrise + 60min (golden AM end)
 *  7: lateMorning      — 1/4 of daylight core
 *  8: midday           — solar noon (midpoint of sunrise & sunset)
 *  9: earlyAfternoon   — 3/4 of daylight core
 * 10: lateAfternoon    — sunset - 60min (golden PM start)
 * 11: goldenHourPm     — sunset - 30min
 * 12: sunset           — sunset
 * 13: civilDusk        — sunset + 30min
 * 14: nauticalDusk     — sunset + 60min
 * 15: astronomicalDusk — sunset + 90min
 */
export function calculatePhaseTimestamps(sunrise: number, sunset: number): number[] {
  const midnight = new Date(sunrise);
  midnight.setHours(0, 0, 0, 0);

  const goldenAmEnd = sunrise + MIN60;   // end of golden hour AM / start of early morning
  const goldenPmStart = sunset - MIN60;  // start of golden hour PM / end of late afternoon
  const solarNoon = (sunrise + sunset) / 2;

  // Daylight core: from goldenAmEnd to goldenPmStart
  const coreStart = goldenAmEnd;
  const coreEnd = goldenPmStart;
  const coreDuration = coreEnd - coreStart;

  return [
    midnight.getTime(),          //  0: night
    sunrise - MIN90,             //  1: astronomicalDawn
    sunrise - MIN60,             //  2: nauticalDawn
    sunrise - MIN30,             //  3: civilDawn
    sunrise,                     //  4: sunrise
    sunrise + MIN30,             //  5: goldenHourAm
    goldenAmEnd,                 //  6: earlyMorning
    coreStart + coreDuration / 4, //  7: lateMorning
    solarNoon,                   //  8: midday
    coreStart + (coreDuration * 3) / 4, //  9: earlyAfternoon
    goldenPmStart,               // 10: lateAfternoon
    sunset - MIN30,              // 11: goldenHourPm
    sunset,                      // 12: sunset
    sunset + MIN30,              // 13: civilDusk
    sunset + MIN60,              // 14: nauticalDusk
    sunset + MIN90,              // 15: astronomicalDusk
  ];
}
```

**Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/sky-gradient.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/sky-gradient.ts app/src/scripts/live-window/__tests__/sky-gradient.test.ts
git commit -m "feat(live-window): add phase timestamp calculation with twilight offsets"
```

---

### Task 3: Implement and test gradient interpolation

**Files:**

- Modify: `app/src/scripts/live-window/sky-gradient.ts`
- Test: `app/src/scripts/live-window/__tests__/sky-gradient.test.ts`

**Step 1: Write the failing tests**

Add to `sky-gradient.test.ts`:

```typescript
import { SKY_PHASES, calculatePhaseTimestamps, getDefaultSunTimes, blendGradient } from "../sky-gradient";
import type { SkyGradient } from "../sky-gradient";

describe("blendGradient", () => {
  const a: SkyGradient = {
    zenith: { r: 0, g: 0, b: 0 },
    upper: { r: 0, g: 0, b: 0 },
    lower: { r: 0, g: 0, b: 0 },
    horizon: { r: 0, g: 0, b: 0 },
  };
  const b: SkyGradient = {
    zenith: { r: 100, g: 200, b: 50 },
    upper: { r: 200, g: 100, b: 150 },
    lower: { r: 50, g: 50, b: 250 },
    horizon: { r: 255, g: 255, b: 255 },
  };

  it("returns first gradient at t=0", () => {
    const result = blendGradient(a, b, 0);
    expect(result.zenith).toEqual({ r: 0, g: 0, b: 0 });
    expect(result.horizon).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("returns second gradient at t=1", () => {
    const result = blendGradient(a, b, 1);
    expect(result.zenith).toEqual({ r: 100, g: 200, b: 50 });
    expect(result.horizon).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns midpoint at t=0.5", () => {
    const result = blendGradient(a, b, 0.5);
    expect(result.zenith).toEqual({ r: 50, g: 100, b: 25 });
    expect(result.upper).toEqual({ r: 100, g: 50, b: 75 });
    expect(result.lower).toEqual({ r: 25, g: 25, b: 125 });
    expect(result.horizon).toEqual({ r: 128, g: 128, b: 128 });
  });

  it("clamps t below 0 to 0", () => {
    const result = blendGradient(a, b, -0.5);
    expect(result.zenith).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("clamps t above 1 to 1", () => {
    const result = blendGradient(a, b, 1.5);
    expect(result.zenith).toEqual({ r: 100, g: 200, b: 50 });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/sky-gradient.test.ts`
Expected: FAIL — `blendGradient` is not exported

**Step 3: Implement blendGradient**

Add to `app/src/scripts/live-window/sky-gradient.ts`:

```typescript
function blendChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function blendColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: blendChannel(a.r, b.r, t),
    g: blendChannel(a.g, b.g, t),
    b: blendChannel(a.b, b.b, t),
  };
}

export function blendGradient(a: SkyGradient, b: SkyGradient, t: number): SkyGradient {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    zenith: blendColor(a.zenith, b.zenith, clamped),
    upper: blendColor(a.upper, b.upper, clamped),
    lower: blendColor(a.lower, b.lower, clamped),
    horizon: blendColor(a.horizon, b.horizon, clamped),
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/sky-gradient.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/sky-gradient.ts app/src/scripts/live-window/__tests__/sky-gradient.test.ts
git commit -m "feat(live-window): add gradient interpolation between sky phases"
```

---

### Task 4: Implement and test getCurrentSkyGradient

**Files:**

- Modify: `app/src/scripts/live-window/sky-gradient.ts`
- Test: `app/src/scripts/live-window/__tests__/sky-gradient.test.ts`

**Step 1: Write the failing tests**

Add to `sky-gradient.test.ts`:

```typescript
import {
  SKY_PHASES,
  calculatePhaseTimestamps,
  getDefaultSunTimes,
  blendGradient,
  getCurrentSkyGradient,
} from "../sky-gradient";

describe("getCurrentSkyGradient", () => {
  // Fixed sunrise 7:00 AM, sunset 7:00 PM
  const today = new Date();
  today.setHours(7, 0, 0, 0);
  const sunrise = today.getTime();
  today.setHours(19, 0, 0, 0);
  const sunset = today.getTime();

  it("returns night gradient at midnight", () => {
    const midnight = new Date(sunrise);
    midnight.setHours(0, 0, 0, 0);
    const result = getCurrentSkyGradient(midnight.getTime(), sunrise, sunset);
    // At midnight we are between night (0) and astronomicalDawn (1),
    // but at the very start so it should be close to night
    expect(result.zenith.r).toBeLessThan(15);
    expect(result.zenith.b).toBeLessThan(50);
  });

  it("returns midday-like gradient at solar noon", () => {
    const noon = (sunrise + sunset) / 2; // solar noon = 1:00 PM for 7AM-7PM
    const result = getCurrentSkyGradient(noon, sunrise, sunset);
    // Midday phase: bright blue zenith
    expect(result.zenith).toEqual(SKY_PHASES[8].gradient.zenith);
  });

  it("returns sunrise gradient at sunrise time", () => {
    const result = getCurrentSkyGradient(sunrise, sunrise, sunset);
    expect(result.zenith).toEqual(SKY_PHASES[4].gradient.zenith);
  });

  it("returns sunset gradient at sunset time", () => {
    const result = getCurrentSkyGradient(sunset, sunrise, sunset);
    expect(result.zenith).toEqual(SKY_PHASES[12].gradient.zenith);
  });

  it("uses default sun times when sunrise/sunset are null", () => {
    const { sunrise: defSr, sunset: defSs } = getDefaultSunTimes();
    const noon = (defSr + defSs) / 2;
    const result = getCurrentSkyGradient(noon, null as unknown as number, null as unknown as number);
    // Should still return a valid gradient (using defaults)
    expect(result.zenith.r).toBeGreaterThanOrEqual(0);
    expect(result.zenith.r).toBeLessThanOrEqual(255);
  });

  it("wraps correctly for time after astronomical dusk", () => {
    // 11:00 PM — well past astronomical dusk, should be night-like
    const late = new Date(sunrise);
    late.setHours(23, 0, 0, 0);
    const result = getCurrentSkyGradient(late.getTime(), sunrise, sunset);
    expect(result.zenith.r).toBeLessThan(15);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/sky-gradient.test.ts`
Expected: FAIL — `getCurrentSkyGradient` is not exported

**Step 3: Implement getCurrentSkyGradient**

Add to `app/src/scripts/live-window/sky-gradient.ts`:

```typescript
/**
 * Returns the interpolated sky gradient for a given moment in time.
 * Falls back to default sun times (6AM/6PM) when sunrise/sunset are unavailable.
 */
export function getCurrentSkyGradient(
  now: number,
  sunrise: number | null,
  sunset: number | null,
): SkyGradient {
  let sr = sunrise;
  let ss = sunset;
  if (sr == null || ss == null) {
    const defaults = getDefaultSunTimes();
    sr = defaults.sunrise;
    ss = defaults.sunset;
  }

  const timestamps = calculatePhaseTimestamps(sr, ss);

  // Find which two phases bracket the current time.
  // If before the first phase or after the last, we're in the night→night wrap.
  let phaseIdx = 0;
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (now >= timestamps[i]) {
      phaseIdx = i;
      break;
    }
  }

  const nextIdx = (phaseIdx + 1) % SKY_PHASES.length;
  const phaseStart = timestamps[phaseIdx];
  const phaseEnd = nextIdx === 0
    ? (() => { const eod = new Date(now); eod.setHours(23, 59, 59, 999); return eod.getTime(); })()
    : timestamps[nextIdx];

  const duration = phaseEnd - phaseStart;
  const t = duration > 0 ? (now - phaseStart) / duration : 0;

  return blendGradient(SKY_PHASES[phaseIdx].gradient, SKY_PHASES[nextIdx].gradient, t);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/sky-gradient.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/sky-gradient.ts app/src/scripts/live-window/__tests__/sky-gradient.test.ts
git commit -m "feat(live-window): add getCurrentSkyGradient combining phase lookup and interpolation"
```

---

### Task 5: Update live-window.ts to use the new sky-gradient module

**Files:**

- Modify: `app/src/scripts/live-window/live-window.ts`

**Step 1: Add import and update types**

At the top of `live-window.ts`, replace the `RGB` interface and color constants:

1. Remove the `interface RGB` declaration (lines 1-5)
2. Remove `SUNRISE_COLOR_IDX`, `SUNSET_COLOR_IDX` constants (lines 36-37)
3. Remove `TIME_COLORS` array (lines 39-48)
4. Add import:

```typescript
import { getCurrentSkyGradient, getDefaultSunTimes } from "./sky-gradient";
import type { RGB, SkyGradient } from "./sky-gradient";
```

**Step 2: Update the gradient field type**

Change line 94 from:

```typescript
private gradient: { start: RGB | null; end: RGB | null } = { start: null, end: null };
```

to:

```typescript
private gradient: SkyGradient | null = null;
```

**Step 3: Replace gradient computation methods**

Remove these methods entirely:

- `getRealisticColor()` (lines 455-501)
- `getRealisticColorGradient()` (lines 503-521)
- `getColorGradient()` (lines 523-549)

Replace `updateGradient()` (lines 551-567) with:

```typescript
private updateGradient() {
  const sunrise = this.state.weather.sunrise;
  const sunset = this.state.weather.sunset;
  this.gradient = getCurrentSkyGradient(Date.now(), sunrise, sunset);
  this.renderSkyColor();

  if (!this.blindsAnimationStarted) {
    this.blindsAnimationStarted = true;
    this.runBlindsAnimation();
  }
}
```

**Step 4: Update renderSkyColor for 4-stop gradient**

Replace `renderSkyColor()` (lines 569-576) with:

```typescript
private renderSkyColor() {
  if (!this.skyColorEl || !this.gradient) return;
  const { zenith, upper, lower, horizon } = this.gradient;
  this.skyColorEl.style.background =
    `linear-gradient(180deg, rgb(${zenith.r},${zenith.g},${zenith.b}), rgb(${upper.r},${upper.g},${upper.b}), rgb(${lower.r},${lower.g},${lower.b}), rgb(${horizon.r},${horizon.g},${horizon.b}))`;
  const tc = this.getReadableColor(horizon);
  this.style.setProperty("--weather-text-color", `rgb(${tc.r},${tc.g},${tc.b})`);
}
```

Note: `getReadableColor` now receives `horizon` (the bottom color, most variable) instead of the old `end` color.

**Step 5: Remove the `isSameDate` method if no longer used**

Check if `isSameDate` is still needed. It was used in `getRealisticColor()` and `getRealisticColorGradient()`. If `shouldFetchWeather()` also uses it, keep it. Otherwise remove it.

Looking at the code: `shouldFetchWeather()` at line 762 calls `this.isSameDate(...)`, so **keep it**.

**Step 6: Run typecheck**

Run: `just app::typecheck`
Expected: PASS with no errors

**Step 7: Commit**

```bash
git add app/src/scripts/live-window/live-window.ts
git commit -m "feat(live-window): switch to 16-phase 4-stop sky gradient system"
```

---

### Task 6: Run tests, build, and verify

**Files:** None (verification only)

**Step 1: Run all app tests**

Run: `just app::test`
Expected: All tests PASS

**Step 2: Build the app**

Run: `just app::build`
Expected: Build succeeds with no errors

**Step 3: Typecheck**

Run: `just app::typecheck`
Expected: No type errors

**Step 4: Visual verification**

Run: `just app::serve`

Check the live window at different simulated times by temporarily modifying `Date.now()` in the browser console or by changing system clock. Verify:

- Dawn shows purple/pink horizon transitioning to blue zenith
- Sunrise shows warm orange-gold horizon
- Midday shows bright blue throughout
- Sunset shows deep orange-red horizon with purple zenith
- Night shows near-black deep blue
- Transitions between phases are smooth
