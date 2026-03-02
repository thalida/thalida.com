# Live Window Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the monolithic `<live-window>` web component into focused modules with a `SkyLayer` interface for extensibility.

**Architecture:** Extract types, color utilities, state management, API integration, clock, blinds, and sky layers into separate modules. The main `live-window.ts` becomes a thin orchestrator (~150-200 lines) that composes everything. Sky layers implement a shared `SkyLayer` interface so adding stars/moon/sun later is just "create a class, register it."

**Tech Stack:** TypeScript, Vitest, Web Components (Shadow DOM), Astro

**Design doc:** `docs/plans/2026-03-01-live-window-refactor-design.md`

**Base path:** `app/src/scripts/live-window/`

**Test command:** `just app::test`
**Typecheck command:** `just app::typecheck`

---

### Task 1: Create shared types module

**Files:**
- Create: `app/src/scripts/live-window/types.ts`

**Step 1: Create types.ts with all shared interfaces**

```ts
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

export interface SunPosition {
  /** Degrees above horizon: 0 at horizon, ~90 at zenith */
  altitude: number;
  /** Compass bearing: 0=N, 90=E, 180=S, 270=W */
  azimuth: number;
  /** Daytime progress: 0=sunrise, 0.5=solar noon, 1=sunset. -1 when nighttime */
  progress: number;
}

export interface WeatherInfo {
  icon: string | null;
  main: string | null;
  description: string | null;
  temp: number | null;
}

export interface PhaseInfo {
  now: number;
  sunrise: number | null;
  sunset: number | null;
  phaseIndex: number;
  nextPhaseIndex: number;
  /** Interpolation factor 0-1 within the current phase */
  t: number;
  isDaytime: boolean;
  sun: SunPosition;
  weather: WeatherInfo;
}

export interface SkyLayer {
  mount(container: HTMLElement): void;
  update(phase: PhaseInfo): void;
  destroy(): void;
}

export interface WeatherCurrent {
  main: string;
  description: string;
  icon: string;
  temp: number;
}

export interface StoreState {
  location: {
    lastFetched: number | null;
    lat: number | null;
    lng: number | null;
    country: string | null;
  };
  weather: {
    lastFetched: number | null;
    units: string | null;
    current: WeatherCurrent | null;
    sunrise: number | null;
    sunset: number | null;
  };
}
```

This file defines all shared types. `RGB` and `SkyGradient` move here from `sky-gradient.ts`. `StoreState` and `WeatherCurrent` move here from `live-window.ts`.

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: PASS (new file has no imports, no consumers yet)

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/types.ts
git commit -m "refactor(live-window): add shared types module"
```

---

### Task 2: Extract color utilities + tests

**Files:**
- Create: `app/src/scripts/live-window/color.ts`
- Create: `app/src/scripts/live-window/__tests__/color.test.ts`

**Step 1: Write failing tests for color utilities**

Create `app/src/scripts/live-window/__tests__/color.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  relativeLuminance,
  contrastRatio,
  getReadableColor,
  parseHexColor,
  parseComputedColor,
} from "../color";

describe("parseHexColor", () => {
  it("parses 6-digit hex with #", () => {
    expect(parseHexColor("#030a12")).toEqual({ r: 3, g: 10, b: 18 });
  });

  it("parses 6-digit hex without #", () => {
    expect(parseHexColor("ff8000")).toEqual({ r: 255, g: 128, b: 0 });
  });

  it("returns null for invalid hex", () => {
    expect(parseHexColor("abc")).toBeNull();
    expect(parseHexColor("")).toBeNull();
  });
});

describe("parseComputedColor", () => {
  it("parses rgb() string", () => {
    expect(parseComputedColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30 });
  });

  it("returns null for non-matching string", () => {
    expect(parseComputedColor("transparent")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("returns 0 for black", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it("returns 1 for white", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 4);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it("returns 1 for same color", () => {
    const c = { r: 128, g: 128, b: 128 };
    expect(contrastRatio(c, c)).toBeCloseTo(1, 4);
  });
});

describe("getReadableColor", () => {
  it("returns original color when contrast is already sufficient", () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    expect(getReadableColor(white, black)).toEqual(white);
  });

  it("boosts lightness for low-contrast colors on dark background", () => {
    const darkBlue = { r: 10, g: 15, b: 40 };
    const darkBg = { r: 3, g: 10, b: 18 };
    const result = getReadableColor(darkBlue, darkBg);
    // Result should have higher contrast than original
    expect(contrastRatio(result, darkBg)).toBeGreaterThanOrEqual(4.5);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test`
Expected: FAIL — `../color` module not found

**Step 3: Implement color.ts**

Create `app/src/scripts/live-window/color.ts`. Extract the following functions from `live-window.ts` lines 325-421, converting instance methods to pure functions:

- `parseHexColor(hex: string): RGB | null` — extracted from the `bgColor` getter (lines 327-335)
- `parseComputedColor(computed: string): RGB | null` — extracted from the `bgColor` getter (lines 338-340)
- `relativeLuminance(c: RGB): number` — extracted from lines 344-349
- `contrastRatio(a: RGB, b: RGB): number` — extracted from lines 352-358
- `getReadableColor(color: RGB, bg: RGB, minContrast?: number): RGB` — extracted from lines 360-421, taking `bg` as a parameter instead of reading `this.bgColor`

All functions are pure — no `this` references. Import `RGB` from `./types`.

**Step 4: Run tests to verify they pass**

Run: `just app::test`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/color.ts app/src/scripts/live-window/__tests__/color.test.ts
git commit -m "refactor(live-window): extract color utilities with tests"
```

---

### Task 3: Extract state persistence + tests

**Files:**
- Create: `app/src/scripts/live-window/state.ts`
- Create: `app/src/scripts/live-window/__tests__/state.test.ts`

**Step 1: Write failing tests for state module**

Create `app/src/scripts/live-window/__tests__/state.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadState, saveState, DEFAULT_STATE, CACHE_VERSION } from "../state";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const STORAGE_KEY = "liveWindowStore";

describe("loadState", () => {
  beforeEach(() => {
    delete store[STORAGE_KEY];
  });

  it("returns DEFAULT_STATE when nothing is stored", () => {
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it("returns stored state when version matches", () => {
    const saved = {
      _v: CACHE_VERSION,
      location: { lastFetched: 1000, lat: 40, lng: -74, country: "US" },
      weather: { lastFetched: 2000, units: "imperial", current: null, sunrise: null, sunset: null },
    };
    store[STORAGE_KEY] = JSON.stringify(saved);
    const result = loadState();
    expect(result.location.lat).toBe(40);
    expect(result.location.country).toBe("US");
  });

  it("returns DEFAULT_STATE and clears storage when version mismatches", () => {
    store[STORAGE_KEY] = JSON.stringify({ _v: 0, location: { lat: 99 } });
    const result = loadState();
    expect(result).toEqual(DEFAULT_STATE);
    expect(store[STORAGE_KEY]).toBeUndefined();
  });
});

describe("saveState", () => {
  beforeEach(() => {
    delete store[STORAGE_KEY];
  });

  it("round-trips through loadState", () => {
    const state = {
      ...DEFAULT_STATE,
      location: { ...DEFAULT_STATE.location, lat: 51.5, lng: -0.1, country: "GB" },
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded.location.lat).toBe(51.5);
    expect(loaded.location.country).toBe("GB");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test`
Expected: FAIL — `../state` module not found

**Step 3: Implement state.ts**

Create `app/src/scripts/live-window/state.ts`. Extract from `live-window.ts`:
- `CACHE_VERSION` constant (line 29)
- `STORAGE_KEY` constant (line 30)
- `DEFAULT_STATE` constant (lines 50-53)
- `loadState()` function (lines 248-266)
- `saveState(state: StoreState)` function (lines 268-274)

Import `StoreState` from `./types`.

**Step 4: Run tests to verify they pass**

Run: `just app::test`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/state.ts app/src/scripts/live-window/__tests__/state.test.ts
git commit -m "refactor(live-window): extract state persistence with tests"
```

---

### Task 4: Extract API integration + tests

**Files:**
- Create: `app/src/scripts/live-window/api.ts`
- Create: `app/src/scripts/live-window/__tests__/api.test.ts`

**Step 1: Write failing tests for API module**

Create `app/src/scripts/live-window/__tests__/api.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldFetchLocation, shouldFetchWeather, IP_RATE_LIMIT, WEATHER_RATE_LIMIT } from "../api";
import { DEFAULT_STATE } from "../state";
import type { StoreState } from "../types";

describe("shouldFetchLocation", () => {
  it("returns true when never fetched", () => {
    expect(shouldFetchLocation(DEFAULT_STATE)).toBe(true);
  });

  it("returns false when recently fetched", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      location: { ...DEFAULT_STATE.location, lastFetched: Date.now() },
    };
    expect(shouldFetchLocation(state)).toBe(false);
  });

  it("returns true when rate limit exceeded", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      location: { ...DEFAULT_STATE.location, lastFetched: Date.now() - IP_RATE_LIMIT - 1 },
    };
    expect(shouldFetchLocation(state)).toBe(true);
  });
});

describe("shouldFetchWeather", () => {
  it("returns true when never fetched", () => {
    expect(shouldFetchWeather(DEFAULT_STATE, "metric")).toBe(true);
  });

  it("returns true when units changed", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, lastFetched: Date.now(), units: "metric" },
    };
    expect(shouldFetchWeather(state, "imperial")).toBe(true);
  });

  it("returns false when recently fetched with same units", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, lastFetched: Date.now(), units: "metric" },
    };
    expect(shouldFetchWeather(state, "metric")).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test`
Expected: FAIL — `../api` module not found

**Step 3: Implement api.ts**

Create `app/src/scripts/live-window/api.ts`. Extract from `live-window.ts`:
- `IP_RATE_LIMIT` and `WEATHER_RATE_LIMIT` constants (lines 27-28)
- `IMPERIAL_COUNTRIES` set (line 11)
- `shouldFetchLocation(state)` (lines 624-627)
- `shouldFetchWeather(state, units)` (lines 629-634) — takes `units` as parameter instead of reading `this.resolvedUnits`
- `isSameDate(a, b)` helper (lines 424-426)
- `fetchLocation(key, state)` (lines 636-653) — returns updated state instead of mutating `this.state`
- `fetchWeather(owKey, ipKey, state, units)` (lines 655-695) — returns updated state + a `changed` flag
- `resolveUnits(attr, country)` (lines 278-285) — pure function taking attribute value and country code
- `tempSymbol(units)` (lines 287-289) — pure function

Import `StoreState` from `./types`.

**Step 4: Run tests to verify they pass**

Run: `just app::test`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/api.ts app/src/scripts/live-window/__tests__/api.test.ts
git commit -m "refactor(live-window): extract API integration with tests"
```

---

### Task 5: Extract clock rendering

**Files:**
- Create: `app/src/scripts/live-window/clock.ts`

**Step 1: Create clock.ts**

Extract from `live-window.ts` lines 292-321:

```ts
export interface ClockElements {
  hourEl: HTMLSpanElement | null;
  minuteEl: HTMLSpanElement | null;
  ampmEl: HTMLSpanElement | null;
  amEl: HTMLSpanElement | null;
  pmEl: HTMLSpanElement | null;
}

export function renderClock(
  els: ClockElements,
  use12Hour: boolean,
): { hour: number; minute: number } {
  const now = new Date();
  const raw = now.getHours();
  let h = raw;
  const m = now.getMinutes();

  if (use12Hour) {
    h = raw % 12 || 12;
  }

  if (els.hourEl) els.hourEl.textContent = `${h < 10 ? "0" : ""}${h}`;
  if (els.minuteEl) els.minuteEl.textContent = `${m < 10 ? "0" : ""}${m}`;

  if (els.ampmEl) {
    els.ampmEl.hidden = !use12Hour;
    if (use12Hour) {
      const isPm = raw >= 12;
      els.amEl?.classList.toggle("active", !isPm);
      els.pmEl?.classList.toggle("active", isPm);
    }
  }

  return { hour: raw, minute: m };
}
```

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/clock.ts
git commit -m "refactor(live-window): extract clock rendering"
```

---

### Task 6: Extract blinds animation

**Files:**
- Create: `app/src/scripts/live-window/blinds.ts`

**Step 1: Create blinds.ts**

Extract from `live-window.ts` lines 511-619. Move:
- `AnimatableProp` type (line 24)
- `NUM_BLINDS` constant (line 26)
- `BlindsState` interface (matches the shape of `blindsSettings` on lines 82-87)
- `getSkewAndRotateTransform(blindIndex, state, numBlinds)` — pure function
- `getSkewOnlyTransform(state)` — pure function
- `renderBlinds(el, state, numBlinds)` — takes element and state, returns void
- `stepAnimation(state, renderFn, targets, speedMs)` — takes a render callback
- `runBlindsAnimation(state, renderFn, numBlinds)` — orchestrates the two-phase animation
- `updateStrings(shadow, stringLeftEl, stringRightEl)` — takes element refs

All functions take their dependencies as parameters instead of reading from `this`.

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/blinds.ts
git commit -m "refactor(live-window): extract blinds animation"
```

---

### Task 7: Move sky-gradient.ts into layers/gradient.ts

**Files:**
- Create: `app/src/scripts/live-window/layers/` directory
- Move: `app/src/scripts/live-window/sky-gradient.ts` → `app/src/scripts/live-window/layers/gradient.ts`
- Modify: `app/src/scripts/live-window/__tests__/sky-gradient.test.ts` (update import path)

**Step 1: Create the layers directory and move the file**

```bash
mkdir -p app/src/scripts/live-window/layers
git mv app/src/scripts/live-window/sky-gradient.ts app/src/scripts/live-window/layers/gradient.ts
```

**Step 2: Update gradient.ts imports**

In `app/src/scripts/live-window/layers/gradient.ts`:
- Remove the `RGB` and `SkyGradient` interface/export declarations (they now live in `types.ts`)
- Add import: `import type { RGB, SkyGradient, SkyLayer, PhaseInfo } from "../types";`
- Keep `SkyPhase` as a local interface (not exported from types — it's gradient-internal)
- Re-export `RGB` and `SkyGradient` from types for backward compatibility of the test file
- Keep all pure functions exported: `SKY_PHASES`, `getDefaultSunTimes`, `calculatePhaseTimestamps`, `blendGradient`, `getCurrentSkyGradient`

Add the `GradientLayer` class at the bottom:

```ts
export class GradientLayer implements SkyLayer {
  public currentGradient: SkyGradient | null = null;
  private el: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer sky-color";
    this.el.style.position = "absolute";
    this.el.style.top = "0";
    this.el.style.left = "0";
    this.el.style.width = "100%";
    this.el.style.height = "100%";
  }

  update(phase: PhaseInfo): void {
    this.currentGradient = getCurrentSkyGradient(phase.now, phase.sunrise, phase.sunset);
    if (!this.el || !this.currentGradient) return;
    const { zenith, upper, lower, horizon } = this.currentGradient;
    this.el.style.background = `linear-gradient(180deg, rgb(${zenith.r},${zenith.g},${zenith.b}), rgb(${upper.r},${upper.g},${upper.b}), rgb(${lower.r},${lower.g},${lower.b}), rgb(${horizon.r},${horizon.g},${horizon.b}))`;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.currentGradient = null;
  }
}
```

**Step 3: Update test imports**

In `app/src/scripts/live-window/__tests__/sky-gradient.test.ts`, change:
```ts
// Old
import { SKY_PHASES, calculatePhaseTimestamps, getDefaultSunTimes, blendGradient, getCurrentSkyGradient } from "../sky-gradient";
import type { SkyGradient } from "../sky-gradient";

// New
import { SKY_PHASES, calculatePhaseTimestamps, getDefaultSunTimes, blendGradient, getCurrentSkyGradient } from "../layers/gradient";
import type { SkyGradient } from "../types";
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All 24 existing sky-gradient tests PASS

**Step 5: Commit**

```bash
git add -A app/src/scripts/live-window/layers/ app/src/scripts/live-window/__tests__/sky-gradient.test.ts
git commit -m "refactor(live-window): move sky-gradient into layers/gradient with SkyLayer class"
```

---

### Task 8: Create phase-info module + tests

**Files:**
- Create: `app/src/scripts/live-window/phase-info.ts`
- Create: `app/src/scripts/live-window/__tests__/phase-info.test.ts`

**Step 1: Write failing tests for buildPhaseInfo and calculateSunPosition**

Create `app/src/scripts/live-window/__tests__/phase-info.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildPhaseInfo, calculateSunPosition } from "../phase-info";
import { DEFAULT_STATE } from "../state";
import type { StoreState } from "../types";

describe("calculateSunPosition", () => {
  const today = new Date();
  today.setHours(7, 0, 0, 0);
  const sunrise = today.getTime();
  today.setHours(19, 0, 0, 0);
  const sunset = today.getTime();

  it("returns progress=0 at sunrise", () => {
    const pos = calculateSunPosition(sunrise, sunrise, sunset);
    expect(pos.progress).toBeCloseTo(0, 4);
    expect(pos.altitude).toBeCloseTo(0, 0);
  });

  it("returns progress=0.5 at solar noon", () => {
    const noon = (sunrise + sunset) / 2;
    const pos = calculateSunPosition(noon, sunrise, sunset);
    expect(pos.progress).toBeCloseTo(0.5, 4);
    expect(pos.altitude).toBeGreaterThan(0);
  });

  it("returns progress=1 at sunset", () => {
    const pos = calculateSunPosition(sunset, sunrise, sunset);
    expect(pos.progress).toBeCloseTo(1, 4);
    expect(pos.altitude).toBeCloseTo(0, 0);
  });

  it("returns progress=-1 at night", () => {
    const midnight = new Date(sunrise);
    midnight.setHours(2, 0, 0, 0);
    const pos = calculateSunPosition(midnight.getTime(), sunrise, sunset);
    expect(pos.progress).toBe(-1);
  });

  it("azimuth goes from ~90 (east) at sunrise to ~270 (west) at sunset", () => {
    const srPos = calculateSunPosition(sunrise, sunrise, sunset);
    const ssPos = calculateSunPosition(sunset, sunrise, sunset);
    expect(srPos.azimuth).toBeCloseTo(90, 0);
    expect(ssPos.azimuth).toBeCloseTo(270, 0);
  });
});

describe("buildPhaseInfo", () => {
  it("returns isDaytime=true during daytime", () => {
    const today = new Date();
    today.setHours(7, 0, 0, 0);
    const sunrise = today.getTime();
    today.setHours(19, 0, 0, 0);
    const sunset = today.getTime();
    today.setHours(12, 0, 0, 0);
    const noon = today.getTime();

    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, sunrise, sunset },
    };
    const info = buildPhaseInfo(state, noon);
    expect(info.isDaytime).toBe(true);
    expect(info.phaseIndex).toBeGreaterThanOrEqual(0);
    expect(info.t).toBeGreaterThanOrEqual(0);
    expect(info.t).toBeLessThanOrEqual(1);
  });

  it("returns isDaytime=false at midnight", () => {
    const today = new Date();
    today.setHours(7, 0, 0, 0);
    const sunrise = today.getTime();
    today.setHours(19, 0, 0, 0);
    const sunset = today.getTime();
    today.setHours(2, 0, 0, 0);
    const night = today.getTime();

    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, sunrise, sunset },
    };
    const info = buildPhaseInfo(state, night);
    expect(info.isDaytime).toBe(false);
  });

  it("uses default sun times when sunrise/sunset are null", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const info = buildPhaseInfo(DEFAULT_STATE, today.getTime());
    // Should not throw and should return valid phase info
    expect(info.phaseIndex).toBeGreaterThanOrEqual(0);
    expect(info.phaseIndex).toBeLessThan(16);
  });

  it("populates weather info from state", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: {
        ...DEFAULT_STATE.weather,
        current: { main: "Clouds", description: "scattered clouds", icon: "03d", temp: 22 },
      },
    };
    const info = buildPhaseInfo(state, Date.now());
    expect(info.weather.icon).toBe("03d");
    expect(info.weather.main).toBe("Clouds");
    expect(info.weather.temp).toBe(22);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test`
Expected: FAIL — `../phase-info` module not found

**Step 3: Implement phase-info.ts**

Create `app/src/scripts/live-window/phase-info.ts`:

```ts
import type { StoreState, PhaseInfo, SunPosition, WeatherInfo } from "./types";
import { SKY_PHASES, getDefaultSunTimes, calculatePhaseTimestamps } from "./layers/gradient";

export function calculateSunPosition(
  now: number,
  sunrise: number,
  sunset: number,
): SunPosition {
  const isDaytime = now >= sunrise && now <= sunset;

  if (!isDaytime) {
    return { altitude: 0, azimuth: 0, progress: -1 };
  }

  const dayDuration = sunset - sunrise;
  const progress = dayDuration > 0 ? (now - sunrise) / dayDuration : 0;

  // Altitude: sine curve peaking at solar noon
  // At progress=0 (sunrise) and progress=1 (sunset), altitude=0
  // At progress=0.5 (noon), altitude peaks
  const maxAltitude = 90; // simplified; real max depends on latitude
  const altitude = maxAltitude * Math.sin(progress * Math.PI);

  // Azimuth: linear interpolation from 90 (east) to 270 (west)
  const azimuth = 90 + progress * 180;

  return { altitude, azimuth, progress };
}

export function buildPhaseInfo(state: StoreState, now: number): PhaseInfo {
  let sr = state.weather.sunrise;
  let ss = state.weather.sunset;
  if (sr == null || ss == null) {
    const defaults = getDefaultSunTimes();
    sr = defaults.sunrise;
    ss = defaults.sunset;
  }

  const timestamps = calculatePhaseTimestamps(sr, ss);

  // Find which two phases bracket the current time
  let phaseIdx = 0;
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (now >= timestamps[i]) {
      phaseIdx = i;
      break;
    }
  }

  const nextIdx = (phaseIdx + 1) % SKY_PHASES.length;
  const phaseStart = timestamps[phaseIdx];
  const phaseEnd =
    nextIdx === 0
      ? (() => {
          const eod = new Date(now);
          eod.setHours(23, 59, 59, 999);
          return eod.getTime();
        })()
      : timestamps[nextIdx];

  const duration = phaseEnd - phaseStart;
  const t = duration > 0 ? (now - phaseStart) / duration : 0;

  const isDaytime = now >= sr && now <= ss;
  const sun = calculateSunPosition(now, sr, ss);

  const current = state.weather.current;
  const weather: WeatherInfo = {
    icon: current?.icon ?? null,
    main: current?.main ?? null,
    description: current?.description ?? null,
    temp: current?.temp ?? null,
  };

  return {
    now,
    sunrise: state.weather.sunrise,
    sunset: state.weather.sunset,
    phaseIndex: phaseIdx,
    nextPhaseIndex: nextIdx,
    t,
    isDaytime,
    sun,
    weather,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `just app::test`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/phase-info.ts app/src/scripts/live-window/__tests__/phase-info.test.ts
git commit -m "refactor(live-window): add phase-info module with sun position"
```

---

### Task 9: Create WeatherLayer + tests

**Files:**
- Create: `app/src/scripts/live-window/layers/weather.ts`
- Create: `app/src/scripts/live-window/__tests__/layers/weather.test.ts`

**Step 1: Write failing tests for WeatherLayer**

Create `app/src/scripts/live-window/__tests__/layers/weather.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { WeatherLayer, ICON_WEATHER_MAP } from "../../layers/weather";
import type { PhaseInfo } from "../../types";

function makePhaseInfo(icon: string | null): PhaseInfo {
  return {
    now: Date.now(),
    sunrise: null,
    sunset: null,
    phaseIndex: 8,
    nextPhaseIndex: 9,
    t: 0.5,
    isDaytime: true,
    sun: { altitude: 45, azimuth: 180, progress: 0.5 },
    weather: { icon, main: null, description: null, temp: null },
  };
}

describe("ICON_WEATHER_MAP", () => {
  it("maps all expected icon codes", () => {
    const expectedCodes = ["02d", "02n", "03d", "03n", "04d", "04n", "09d", "09n", "10d", "10n", "11d", "11n", "13d", "13n", "50d", "50n"];
    for (const code of expectedCodes) {
      expect(ICON_WEATHER_MAP[code]).toBeDefined();
    }
  });
});

describe("WeatherLayer", () => {
  let layer: WeatherLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new WeatherLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("renders nothing when icon is null", () => {
    layer.update(makePhaseInfo(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders clouds for partly cloudy (02d)", () => {
    layer.update(makePhaseInfo("02d"));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
  });

  it("renders droplets for rain (10d)", () => {
    layer.update(makePhaseInfo("10d"));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders lightning for thunderstorm (11d)", () => {
    layer.update(makePhaseInfo("11d"));
    expect(container.querySelector(".lightning")).toBeTruthy();
  });

  it("renders mist layers for mist (50d)", () => {
    layer.update(makePhaseInfo("50d"));
    expect(container.querySelector(".mist-lg")).toBeTruthy();
    expect(container.querySelector(".mist-md")).toBeTruthy();
    expect(container.querySelector(".mist-sm")).toBeTruthy();
  });

  it("renders snow mounds for snow (13d)", () => {
    layer.update(makePhaseInfo("13d"));
    expect(container.querySelector(".snow-sill")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("cleans up on destroy", () => {
    layer.update(makePhaseInfo("10d"));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test`
Expected: FAIL — `../../layers/weather` module not found

**Step 3: Implement layers/weather.ts**

Create `app/src/scripts/live-window/layers/weather.ts`. Extract from `live-window.ts`:
- `ICON_WEATHER_MAP` (lines 31-48)
- The HTML-building logic from `renderWeatherEffects()` (lines 450-498)

```ts
import type { SkyLayer, PhaseInfo } from "../types";

export const ICON_WEATHER_MAP: Record<string, string[]> = {
  "02d": ["cloudSm"],
  "02n": ["cloudSm"],
  "03d": ["cloudSm", "cloudMd"],
  "03n": ["cloudSm", "cloudMd"],
  "04d": ["cloudSm", "cloudMd", "cloudLg"],
  "04n": ["cloudSm", "cloudMd", "cloudLg"],
  "09d": ["cloudMd", "lightRain"],
  "09n": ["cloudMd", "lightRain"],
  "10d": ["cloudMd", "cloudLg", "rain"],
  "10n": ["cloudMd", "cloudLg", "rain"],
  "11d": ["cloudSm", "cloudMd", "cloudLg", "thunderstorm"],
  "11n": ["cloudSm", "cloudMd", "cloudLg", "thunderstorm"],
  "13d": ["snow"],
  "13n": ["snow"],
  "50d": ["mist"],
  "50n": ["mist"],
};

export class WeatherLayer implements SkyLayer {
  private el: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer weather";
  }

  update(phase: PhaseInfo): void {
    if (!this.el) return;
    const icon = phase.weather.icon;
    this.el.className = "sky-layer weather" + (icon ? ` weather-${icon}` : "");

    if (!icon) {
      this.el.innerHTML = "";
      return;
    }

    const effects = ICON_WEATHER_MAP[icon] ?? [];
    const has = (k: string) => effects.includes(k);
    const showDroplets = has("lightRain") || has("rain") || has("thunderstorm") || has("snow");

    let html = "";
    if (has("cloudLg")) html += '<div class="cloud cloud-lg"></div>';
    if (has("cloudMd")) html += '<div class="cloud cloud-md"></div>';
    if (has("thunderstorm")) html += '<div class="lightning"></div>';
    if (has("cloudSm")) html += '<div class="cloud cloud-sm"></div>';
    if (has("mist")) {
      html += '<div class="mist mist-lg"></div><div class="mist mist-md"></div><div class="mist mist-sm"></div>';
    }
    if (showDroplets) {
      html += '<div class="droplets">';
      for (let h = 0; h < 2; h++) {
        html += '<div class="droplets-half">';
        for (let i = 0; i < 6; i++) {
          html += `<div class="droplet-row droplet-row-${i + 1}">`;
          for (let j = 0; j < 6; j++) {
            html += `<div class="droplet droplet-${j + 1}"></div>`;
          }
          html += "</div>";
        }
        html += "</div>";
      }
      html += "</div>";
    }
    if (has("snow")) {
      html += '<div class="snow-sill">';
      for (let i = 1; i <= 6; i++) {
        html += `<div class="snow-mound snow-mound-${i}"></div>`;
      }
      html += "</div>";
    }
    this.el.innerHTML = html;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `just app::test`
Expected: PASS

**Step 5: Commit**

```bash
mkdir -p app/src/scripts/live-window/__tests__/layers
git add app/src/scripts/live-window/layers/weather.ts app/src/scripts/live-window/__tests__/layers/weather.test.ts
git commit -m "refactor(live-window): add WeatherLayer implementing SkyLayer"
```

---

### Task 10: Rewrite live-window.ts as slim orchestrator

This is the big one. Rewrite `app/src/scripts/live-window/live-window.ts` to import from all the extracted modules and become a thin orchestrator.

**Files:**
- Modify: `app/src/scripts/live-window/live-window.ts`

**Step 1: Rewrite live-window.ts**

The new file should:
1. Import from `./types`, `./state`, `./api`, `./color`, `./clock`, `./blinds`, `./phase-info`, `./layers/gradient`, `./layers/weather`
2. Keep `LiveWindowElement` class but delegate everything to imported modules
3. Keep the same HTML structure in `buildDOM()` but mount layers via the `SkyLayer` interface
4. DOM structure: the `.sky` div no longer hardcodes `.sky-color` and `.weather` children — layers create their own containers
5. Keep all the same attributes, events, and public behavior
6. Target: ~150-200 lines

Key changes:
- `constructor`: calls `loadState()` from `./state`, creates layers array `[new GradientLayer(), new WeatherLayer()]`
- `buildDOM()`: creates the `.sky` container, then calls `layer.mount(container)` for each layer. Clock, blinds, and other static DOM stays inline
- `updateSky()` replaces `updateGradient()`: calls `buildPhaseInfo()`, then `layer.update(phase)` for all layers, then reads `GradientLayer.currentGradient` for text color
- `updateClock()` calls `renderClock()` from `./clock`
- `renderBlinds()` calls functions from `./blinds`
- `fetchWeather()` calls functions from `./api`, then `saveState()`
- Color utilities call `getReadableColor()` from `./color`

The `buildDOM` HTML template changes from:
```html
<div class="sky">
  <div class="sky-color"></div>
  <div class="weather"></div>
</div>
```
to:
```html
<div class="sky"></div>
```
because layers mount their own elements into the sky container.

Update the `.sky-color` CSS selector to `.sky-layer.sky-color` and `.weather` positioning to `.sky-layer.weather` — OR keep the existing selectors and have the layer classes set the right class names on their containers (the layer code in tasks 7 and 9 already does this).

**Step 2: Run tests**

Run: `just app::test`
Expected: All existing tests PASS (sky-gradient, color, state, api, phase-info, weather)

**Step 3: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/live-window.ts
git commit -m "refactor(live-window): rewrite as slim orchestrator with SkyLayer system"
```

---

### Task 11: Update CSS for layer system

**Files:**
- Modify: `app/src/scripts/live-window/live-window.css`

**Step 1: Add sky-layer base styles**

Add a `.sky-layer` rule for the shared positioning that all sky layers need:

```css
.sky-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

The existing `.sky-color` styles (lines 94-100) can be removed since the GradientLayer sets its own inline styles. The `.weather` styles (lines 104-110) stay — the WeatherLayer sets `className = "sky-layer weather"` so the existing `.weather` selectors still match.

**Step 2: Verify visually (manual check)**

Run: `just app::serve`
Check that the live window still renders correctly with sky gradient, weather effects, clock, and blinds.

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/live-window.css
git commit -m "refactor(live-window): add sky-layer CSS base class"
```

---

### Task 12: Update README

**Files:**
- Modify: `app/src/scripts/live-window/README.md`

**Step 1: Update the README**

Update the "Files" table and "How It Works > Sky Gradient" section to reflect the new module structure:

```markdown
## Files

| File                  | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `live-window.ts`      | Web Component orchestrator, lifecycle, intervals       |
| `live-window.css`     | All styles (loaded into Shadow DOM via `<link>`)       |
| `types.ts`            | Shared interfaces: RGB, SkyGradient, PhaseInfo, SkyLayer |
| `color.ts`            | WCAG contrast, luminance, readable color (pure fns)    |
| `state.ts`            | localStorage persistence, cache versioning             |
| `api.ts`              | IP geolocation + OpenWeather fetch + rate limiting     |
| `clock.ts`            | Clock rendering + time format logic                    |
| `blinds.ts`           | Blinds animation + rendering                           |
| `phase-info.ts`       | PhaseInfo builder + sun position calculation            |
| `layers/gradient.ts`  | GradientLayer: sky color gradient (16 phases)          |
| `layers/weather.ts`   | WeatherLayer: clouds, rain, snow, lightning, mist      |
```

Update the "Sky Gradient" section to mention the 16-phase system (the README currently says 8 phases — line 67).

Add a new section about the SkyLayer system and how to add new layers.

**Step 2: Commit**

```bash
git add app/src/scripts/live-window/README.md
git commit -m "docs(live-window): update README for modular architecture"
```

---

### Task 13: Full verification

**Step 1: Run all tests**

Run: `just app::test`
Expected: All tests PASS

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 3: Run build**

Run: `just app::build`
Expected: Build succeeds

**Step 4: Run local dev server and visually verify**

Run: `just app::serve`
Manually verify:
- Sky gradient renders and transitions
- Clock updates every second
- Blinds animation plays on load
- Weather effects display (if API keys configured)
- Weather text shows below window
- Theme switching works (dark/light/auto)

**Step 5: Commit if any fixes were needed**

If any issues were found and fixed in previous steps, commit the fixes.
