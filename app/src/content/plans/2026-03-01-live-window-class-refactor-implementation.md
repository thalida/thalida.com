---
title: Live Window Class-Based Refactor Implementation Plan
description: >-
  Refactor `<live-window>` into self-contained SceneComponent classes (sky,
  blinds, clock, weather text) with a unified LiveWindowState and utils/ folder.
publishedOn: 2026-03-02T04:01:12.000Z
planType: implementation
topic: live-window-refactor
status: completed
category: live-window
---

# Live Window Class-Based Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `<live-window>` into self-contained SceneComponent classes (sky, blinds, clock, weather text) with a unified LiveWindowState and utils/ folder.

**Architecture:** Each scene part becomes a class implementing `SceneComponent { mount, update, destroy }`. A single `LiveWindowState` object flows through all components with `store` (persisted), `computed` (derived), `ref` (cross-component), and `attrs` (DOM attributes) sections. The orchestrator is a slim web component that wires components together.

**Tech Stack:** TypeScript, Vitest, Web Components (Shadow DOM), CSS

**Run tests:** `just app::test`
**Run typecheck:** `just app::typecheck`

---

## Task 1: Update types.ts — Add SceneComponent, LiveWindowState

**Files:**
- Modify: `app/src/scripts/live-window/types.ts`

**Step 1: Update types.ts**

Replace the entire contents of `types.ts` with:

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

export interface LiveWindowState {
  /** Persisted to localStorage — API cache data */
  store: StoreState;
  /** Recomputed each update cycle from store + current time */
  computed: {
    phase: PhaseInfo;
  };
  /** Written by components during update(), read by downstream components */
  ref: {
    currentGradient?: SkyGradient;
  };
  /** Derived from web component attributes each cycle */
  attrs: {
    use12Hour: boolean;
    hideClock: boolean;
    hideWeatherText: boolean;
    bgColor: RGB;
    resolvedUnits: string;
  };
}

export interface SceneComponent {
  /** Create DOM elements inside the provided container */
  mount(container: HTMLElement): void;
  /** Called by the orchestrator at the component's update cadence */
  update(state: LiveWindowState): void;
  /** Tear down DOM and release resources */
  destroy(): void;
}
```

Note: `StoreState` is kept as a named interface since it's used by `state.ts`, `api.ts`, and tests. `LiveWindowState.store` is typed as `StoreState`. The old `SkyLayer` interface is removed.

**Step 2: Run typecheck to see what breaks**

Run: `just app::typecheck`
Expected: Errors in `live-window.ts` (references `SkyLayer`), `layers/gradient.ts` and `layers/weather.ts` (import `SkyLayer`). These will be fixed in later tasks.

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/types.ts
git commit -m "refactor(live-window): add SceneComponent, LiveWindowState types; remove SkyLayer"
```

---

## Task 2: Move utils — color.ts, phase-info.ts, sky-gradient pure functions

**Files:**
- Move: `app/src/scripts/live-window/color.ts` → `app/src/scripts/live-window/utils/color.ts`
- Move: `app/src/scripts/live-window/phase-info.ts` → `app/src/scripts/live-window/utils/phase.ts`
- Create: `app/src/scripts/live-window/utils/sky-gradient.ts`
- Modify: `app/src/scripts/live-window/__tests__/color.test.ts` (update import path)
- Modify: `app/src/scripts/live-window/__tests__/phase-info.test.ts` (update import path)
- Modify: `app/src/scripts/live-window/__tests__/sky-gradient.test.ts` (update import path)

**Step 1: Create utils/ directory and move color.ts**

```bash
mkdir -p app/src/scripts/live-window/utils
git mv app/src/scripts/live-window/color.ts app/src/scripts/live-window/utils/color.ts
```

Update the import in `utils/color.ts` — change `"./types"` to `"../types"`.

**Step 2: Move phase-info.ts → utils/phase.ts**

```bash
git mv app/src/scripts/live-window/phase-info.ts app/src/scripts/live-window/utils/phase.ts
```

Update imports in `utils/phase.ts`:
- `"./types"` → `"../types"`
- `"./layers/gradient"` → `"./sky-gradient"` (since sky-gradient.ts will be in the same utils/ folder)

**Step 3: Create utils/sky-gradient.ts**

Extract all pure functions from `layers/gradient.ts` into `utils/sky-gradient.ts`. This file gets everything EXCEPT the `GradientLayer` class:

```ts
import type { RGB, SkyGradient } from "../types";

export type { RGB, SkyGradient } from "../types";

interface SkyPhase {
  name: string;
  gradient: SkyGradient;
}

// 16 sky phases ordered chronologically from midnight.
// Each defines a 4-stop vertical gradient: zenith (top) → horizon (bottom).
export const SKY_PHASES: SkyPhase[] = [
  // ... (copy all 16 phases exactly from layers/gradient.ts)
];

const MIN30 = 30 * 60_000;
const MIN60 = 60 * 60_000;
const MIN90 = 90 * 60_000;

export function getDefaultSunTimes(): { sunrise: number; sunset: number } {
  // ... (copy exactly from layers/gradient.ts)
}

export function calculatePhaseTimestamps(sunrise: number, sunset: number): number[] {
  // ... (copy exactly from layers/gradient.ts)
}

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
  // ... (copy exactly from layers/gradient.ts)
}

export function getCurrentSkyGradient(now: number, sunrise: number | null, sunset: number | null): SkyGradient {
  // ... (copy exactly from layers/gradient.ts)
}
```

**Step 4: Update test imports**

In `__tests__/color.test.ts`, change:
```ts
// OLD
import { relativeLuminance, contrastRatio, getReadableColor, parseHexColor, parseComputedColor } from "../color";
// NEW
import { relativeLuminance, contrastRatio, getReadableColor, parseHexColor, parseComputedColor } from "../utils/color";
```

In `__tests__/phase-info.test.ts`, change:
```ts
// OLD
import { buildPhaseInfo, calculateSunPosition } from "../phase-info";
// NEW
import { buildPhaseInfo, calculateSunPosition } from "../utils/phase";
```

In `__tests__/sky-gradient.test.ts`, change:
```ts
// OLD
import {
  SKY_PHASES,
  calculatePhaseTimestamps,
  getDefaultSunTimes,
  blendGradient,
  getCurrentSkyGradient,
} from "../layers/gradient";
// NEW
import {
  SKY_PHASES,
  calculatePhaseTimestamps,
  getDefaultSunTimes,
  blendGradient,
  getCurrentSkyGradient,
} from "../utils/sky-gradient";
```

**Step 5: Run tests**

Run: `just app::test`
Expected: All existing tests pass (color, phase-info, sky-gradient, state, api tests).

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/utils/ app/src/scripts/live-window/__tests__/
git commit -m "refactor(live-window): move color, phase, sky-gradient to utils/"
```

---

## Task 3: Create GradientLayer component

**Files:**
- Create: `app/src/scripts/live-window/components/sky/GradientLayer.ts`
- Delete: `app/src/scripts/live-window/layers/gradient.ts` (after new file is created)

**Step 1: Write the GradientLayer test**

Create `app/src/scripts/live-window/__tests__/components/sky/GradientLayer.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { GradientLayer } from "../../../components/sky/GradientLayer";
import type { LiveWindowState } from "../../../types";
import { buildPhaseInfo } from "../../../utils/phase";
import { DEFAULT_STATE } from "../../../state";

function makeState(overrides?: Partial<LiveWindowState>): LiveWindowState {
  const store = overrides?.store ?? DEFAULT_STATE;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return {
    store,
    computed: { phase: buildPhaseInfo(store, today.getTime()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
    },
    ...overrides,
  };
}

describe("GradientLayer", () => {
  let layer: GradientLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new GradientLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("sets sky-layer class on mount", () => {
    expect(container.className).toBe("sky-layer");
  });

  it("sets background gradient on update", () => {
    const state = makeState();
    layer.update(state);
    expect(container.style.background).toContain("linear-gradient");
  });

  it("writes currentGradient to state.ref", () => {
    const state = makeState();
    layer.update(state);
    expect(state.ref.currentGradient).toBeDefined();
    expect(state.ref.currentGradient!.zenith).toBeDefined();
    expect(state.ref.currentGradient!.horizon).toBeDefined();
  });

  it("clears element on destroy", () => {
    const state = makeState();
    layer.update(state);
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `just app::test`
Expected: FAIL — cannot resolve `../../../components/sky/GradientLayer`

**Step 3: Write GradientLayer implementation**

Create `app/src/scripts/live-window/components/sky/GradientLayer.ts`:

```ts
import type { SceneComponent, LiveWindowState, SkyGradient } from "../../types";
import { getCurrentSkyGradient } from "../../utils/sky-gradient";

export class GradientLayer implements SceneComponent {
  private el: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer";
  }

  update(state: LiveWindowState): void {
    const { phase } = state.computed;
    const gradient = getCurrentSkyGradient(phase.now, phase.sunrise, phase.sunset);
    state.ref.currentGradient = gradient;

    if (!this.el) return;
    const { zenith, upper, lower, horizon } = gradient;
    this.el.style.background = `linear-gradient(180deg, rgb(${zenith.r},${zenith.g},${zenith.b}), rgb(${upper.r},${upper.g},${upper.b}), rgb(${lower.r},${lower.g},${lower.b}), rgb(${horizon.r},${horizon.g},${horizon.b}))`;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
  }
}
```

**Step 4: Run tests**

Run: `just app::test`
Expected: New GradientLayer tests pass.

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/sky/GradientLayer.ts app/src/scripts/live-window/__tests__/components/sky/GradientLayer.test.ts
git commit -m "feat(live-window): add GradientLayer SceneComponent"
```

---

## Task 4: Create WeatherLayer component

**Files:**
- Create: `app/src/scripts/live-window/components/sky/WeatherLayer.ts`
- Modify: `app/src/scripts/live-window/__tests__/layers/weather.test.ts` (update to use SceneComponent)

**Step 1: Write WeatherLayer implementation**

Create `app/src/scripts/live-window/components/sky/WeatherLayer.ts`:

```ts
import type { SceneComponent, LiveWindowState } from "../../types";

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

export class WeatherLayer implements SceneComponent {
  private el: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer weather";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;
    const icon = state.computed.phase.weather.icon;
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

**Step 2: Update weather test to use new component**

Update `__tests__/layers/weather.test.ts`. Change the imports and the `makePhaseInfo` helper to produce a `LiveWindowState` instead:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { WeatherLayer, ICON_WEATHER_MAP } from "../../components/sky/WeatherLayer";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(icon: string | null): LiveWindowState {
  const store = {
    ...DEFAULT_STATE,
    weather: {
      ...DEFAULT_STATE.weather,
      current: icon ? { main: "Test", description: "test", icon, temp: 20 } : null,
    },
  };
  return {
    store,
    computed: { phase: buildPhaseInfo(store, Date.now()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
    },
  };
}

describe("ICON_WEATHER_MAP", () => {
  it("maps all expected icon codes", () => {
    const expectedCodes = [
      "02d", "02n", "03d", "03n", "04d", "04n", "09d", "09n", "10d", "10n", "11d", "11n", "13d", "13n", "50d", "50n",
    ];
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
    layer.update(makeState(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders clouds for partly cloudy (02d)", () => {
    layer.update(makeState("02d"));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
  });

  it("renders droplets for rain (10d)", () => {
    layer.update(makeState("10d"));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders lightning for thunderstorm (11d)", () => {
    layer.update(makeState("11d"));
    expect(container.querySelector(".lightning")).toBeTruthy();
  });

  it("renders mist layers for mist (50d)", () => {
    layer.update(makeState("50d"));
    expect(container.querySelector(".mist-lg")).toBeTruthy();
    expect(container.querySelector(".mist-md")).toBeTruthy();
    expect(container.querySelector(".mist-sm")).toBeTruthy();
  });

  it("renders snow mounds for snow (13d)", () => {
    layer.update(makeState("13d"));
    expect(container.querySelector(".snow-sill")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("cleans up on destroy", () => {
    layer.update(makeState("10d"));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts app/src/scripts/live-window/__tests__/layers/weather.test.ts
git commit -m "feat(live-window): add WeatherLayer SceneComponent"
```

---

## Task 5: Create SkyComponent composite

**Files:**
- Create: `app/src/scripts/live-window/components/SkyComponent.ts`

**Step 1: Write SkyComponent test**

Create `app/src/scripts/live-window/__tests__/components/SkyComponent.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { SkyComponent } from "../../components/SkyComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(): LiveWindowState {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return {
    store: DEFAULT_STATE,
    computed: { phase: buildPhaseInfo(DEFAULT_STATE, today.getTime()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
    },
  };
}

describe("SkyComponent", () => {
  let sky: SkyComponent;
  let container: HTMLElement;

  beforeEach(() => {
    sky = new SkyComponent();
    container = document.createElement("div");
    sky.mount(container);
  });

  it("sets sky class on container", () => {
    expect(container.className).toBe("sky");
  });

  it("mounts child layers as divs inside container", () => {
    expect(container.children.length).toBe(2);
  });

  it("populates state.ref.currentGradient after update", () => {
    const state = makeState();
    sky.update(state);
    expect(state.ref.currentGradient).toBeDefined();
  });

  it("cleans up children on destroy", () => {
    const state = makeState();
    sky.update(state);
    sky.destroy();
    // After destroy, child layers have cleared their elements
    for (const child of container.children) {
      expect((child as HTMLElement).innerHTML).toBe("");
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `just app::test`
Expected: FAIL — cannot resolve `../../components/SkyComponent`

**Step 3: Write SkyComponent implementation**

Create `app/src/scripts/live-window/components/SkyComponent.ts`:

```ts
import type { SceneComponent, LiveWindowState } from "../types";
import { GradientLayer } from "./sky/GradientLayer";
import { WeatherLayer } from "./sky/WeatherLayer";

export class SkyComponent implements SceneComponent {
  private children: SceneComponent[] = [new GradientLayer(), new WeatherLayer()];

  mount(container: HTMLElement): void {
    container.className = "sky";
    for (const child of this.children) {
      const div = document.createElement("div");
      container.appendChild(div);
      child.mount(div);
    }
  }

  update(state: LiveWindowState): void {
    for (const child of this.children) child.update(state);
  }

  destroy(): void {
    for (const child of this.children) child.destroy();
  }
}
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/SkyComponent.ts app/src/scripts/live-window/__tests__/components/SkyComponent.test.ts
git commit -m "feat(live-window): add SkyComponent composite"
```

---

## Task 6: Create ClockComponent

**Files:**
- Create: `app/src/scripts/live-window/components/ClockComponent.ts`
- Delete (later): `app/src/scripts/live-window/clock.ts`

**Step 1: Write ClockComponent test**

Create `app/src/scripts/live-window/__tests__/components/ClockComponent.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { ClockComponent } from "../../components/ClockComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(use12Hour = false): LiveWindowState {
  return {
    store: DEFAULT_STATE,
    computed: { phase: buildPhaseInfo(DEFAULT_STATE, Date.now()) },
    ref: {},
    attrs: {
      use12Hour,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
    },
  };
}

describe("ClockComponent", () => {
  let clock: ClockComponent;
  let container: HTMLElement;

  beforeEach(() => {
    clock = new ClockComponent();
    container = document.createElement("div");
    clock.mount(container);
  });

  it("creates clock HTML structure on mount", () => {
    expect(container.querySelector(".clock")).toBeTruthy();
    expect(container.querySelector(".clock-hour")).toBeTruthy();
    expect(container.querySelector(".clock-minute")).toBeTruthy();
    expect(container.querySelector(".clock-ampm")).toBeTruthy();
  });

  it("updates time display on update", () => {
    clock.update(makeState());
    const hourEl = container.querySelector(".clock-hour") as HTMLElement;
    const minuteEl = container.querySelector(".clock-minute") as HTMLElement;
    expect(hourEl.textContent).toBeTruthy();
    expect(minuteEl.textContent).toBeTruthy();
  });

  it("hides ampm when in 24-hour mode", () => {
    clock.update(makeState(false));
    const ampmEl = container.querySelector(".clock-ampm") as HTMLElement;
    expect(ampmEl.hidden).toBe(true);
  });

  it("shows ampm when in 12-hour mode", () => {
    clock.update(makeState(true));
    const ampmEl = container.querySelector(".clock-ampm") as HTMLElement;
    expect(ampmEl.hidden).toBe(false);
  });

  it("respects hideClock attr", () => {
    const state = makeState();
    state.attrs.hideClock = true;
    clock.update(state);
    const clockEl = container.querySelector(".clock") as HTMLElement;
    expect(clockEl.hidden).toBe(true);
  });

  it("cleans up on destroy", () => {
    clock.update(makeState());
    clock.destroy();
    expect(container.innerHTML).toBe("");
  });

  it("returns hour and minute from lastTick after update", () => {
    clock.update(makeState());
    const tick = clock.lastTick;
    expect(tick).toBeDefined();
    expect(tick!.hour).toBeGreaterThanOrEqual(0);
    expect(tick!.hour).toBeLessThan(24);
    expect(tick!.minute).toBeGreaterThanOrEqual(0);
    expect(tick!.minute).toBeLessThan(60);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `just app::test`
Expected: FAIL — cannot resolve `../../components/ClockComponent`

**Step 3: Write ClockComponent implementation**

Create `app/src/scripts/live-window/components/ClockComponent.ts`:

```ts
import type { SceneComponent, LiveWindowState } from "../types";

export class ClockComponent implements SceneComponent {
  private clockEl: HTMLDivElement | null = null;
  private hourEl: HTMLSpanElement | null = null;
  private minuteEl: HTMLSpanElement | null = null;
  private ampmEl: HTMLSpanElement | null = null;
  private amEl: HTMLSpanElement | null = null;
  private pmEl: HTMLSpanElement | null = null;

  /** Exposed so the orchestrator can read the last rendered time for events */
  public lastTick: { hour: number; minute: number } | null = null;

  mount(container: HTMLElement): void {
    const clock = document.createElement("div");
    clock.className = "clock";
    clock.innerHTML = `
      <span class="clock-hour"></span>
      <span class="separator">:</span>
      <span class="clock-minute"></span>
      <span class="clock-ampm" hidden>
        <span class="ampm-am">AM</span>
        <span class="ampm-pm">PM</span>
      </span>
    `;
    container.appendChild(clock);

    this.clockEl = clock;
    this.hourEl = clock.querySelector(".clock-hour");
    this.minuteEl = clock.querySelector(".clock-minute");
    this.ampmEl = clock.querySelector(".clock-ampm");
    this.amEl = clock.querySelector(".ampm-am");
    this.pmEl = clock.querySelector(".ampm-pm");
  }

  update(state: LiveWindowState): void {
    if (!this.clockEl) return;

    this.clockEl.hidden = state.attrs.hideClock;

    const now = new Date();
    const raw = now.getHours();
    let h = raw;
    const m = now.getMinutes();
    const use12Hour = state.attrs.use12Hour;

    if (use12Hour) {
      h = raw % 12 || 12;
    }

    if (this.hourEl) this.hourEl.textContent = `${h < 10 ? "0" : ""}${h}`;
    if (this.minuteEl) this.minuteEl.textContent = `${m < 10 ? "0" : ""}${m}`;

    if (this.ampmEl) {
      this.ampmEl.hidden = !use12Hour;
      if (use12Hour) {
        const isPm = raw >= 12;
        this.amEl?.classList.toggle("active", !isPm);
        this.pmEl?.classList.toggle("active", isPm);
      }
    }

    this.lastTick = { hour: raw, minute: m };
  }

  destroy(): void {
    if (this.clockEl?.parentElement) {
      this.clockEl.parentElement.innerHTML = "";
    }
    this.clockEl = null;
    this.hourEl = null;
    this.minuteEl = null;
    this.ampmEl = null;
    this.amEl = null;
    this.pmEl = null;
    this.lastTick = null;
  }
}
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/ClockComponent.ts app/src/scripts/live-window/__tests__/components/ClockComponent.test.ts
git commit -m "feat(live-window): add ClockComponent"
```

---

## Task 7: Create BlindsComponent

**Files:**
- Create: `app/src/scripts/live-window/components/BlindsComponent.ts`
- Delete (later): `app/src/scripts/live-window/blinds.ts`

**Step 1: Write BlindsComponent test**

Create `app/src/scripts/live-window/__tests__/components/BlindsComponent.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { BlindsComponent } from "../../components/BlindsComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(): LiveWindowState {
  return {
    store: DEFAULT_STATE,
    computed: { phase: buildPhaseInfo(DEFAULT_STATE, Date.now()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
    },
  };
}

describe("BlindsComponent", () => {
  let blinds: BlindsComponent;
  let container: HTMLElement;

  beforeEach(() => {
    blinds = new BlindsComponent();
    container = document.createElement("div");
    blinds.mount(container);
  });

  it("creates blinds HTML structure on mount", () => {
    expect(container.querySelector(".blinds")).toBeTruthy();
    expect(container.querySelector(".blinds-string-left")).toBeTruthy();
    expect(container.querySelector(".blinds-string-right")).toBeTruthy();
  });

  it("renders slats on mount", () => {
    expect(container.querySelector(".slats")).toBeTruthy();
    expect(container.querySelector(".slat")).toBeTruthy();
  });

  it("cleans up on destroy", () => {
    blinds.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `just app::test`
Expected: FAIL — cannot resolve `../../components/BlindsComponent`

**Step 3: Write BlindsComponent implementation**

Create `app/src/scripts/live-window/components/BlindsComponent.ts`:

```ts
import type { SceneComponent, LiveWindowState } from "../types";

const NUM_BLINDS = 20;

interface BlindsState {
  numBlindsCollapsed: number;
  blindsOpenDeg: number;
  blindsSkewDeg: number;
  skewDirection: number;
}

type AnimatableProp = keyof BlindsState;

export class BlindsComponent implements SceneComponent {
  private blindsEl: HTMLDivElement | null = null;
  private stringLeftEl: HTMLDivElement | null = null;
  private stringRightEl: HTMLDivElement | null = null;
  private containerEl: HTMLElement | null = null;

  private blindsState: BlindsState = {
    numBlindsCollapsed: 0,
    blindsOpenDeg: 20,
    blindsSkewDeg: 0,
    skewDirection: 0,
  };

  private animationStarted = false;

  mount(container: HTMLElement): void {
    this.containerEl = container;
    container.innerHTML = `
      <div class="blinds" style="--live-window-num-blinds: ${NUM_BLINDS}"></div>
      <div class="blinds-string blinds-string-left"></div>
      <div class="blinds-string blinds-string-right"></div>
    `;

    this.blindsEl = container.querySelector(".blinds");
    this.stringLeftEl = container.querySelector(".blinds-string-left");
    this.stringRightEl = container.querySelector(".blinds-string-right");

    this.renderBlinds();
  }

  update(_state: LiveWindowState): void {
    if (!this.animationStarted) {
      this.animationStarted = true;
      this.runAnimation();
    }
  }

  destroy(): void {
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.blindsEl = null;
    this.stringLeftEl = null;
    this.stringRightEl = null;
  }

  // -- Rendering --------------------------------------------------------------

  private renderBlinds(): void {
    if (!this.blindsEl) return;
    const state = this.blindsState;
    const numOpen = NUM_BLINDS - Math.round(state.numBlindsCollapsed);
    const numCollapsed = Math.round(state.numBlindsCollapsed);

    let slats = "";
    for (let i = 0; i < numOpen; i++) {
      slats += `<div class="slat slat-${i + 1}" style="transform:${this.getSkewAndRotateTransform(i)}"></div>`;
    }

    const skew = this.getSkewOnlyTransform();
    slats += `<div class="slat-collapse-group" style="transform:${skew}">`;
    for (let i = 0; i < numCollapsed; i++) {
      slats += '<div class="slat collapse"></div>';
    }
    slats += "</div>";

    slats += `<div class="slat-bar" style="transform:${skew}">`;
    slats += '<span class="string-marker string-marker-left"></span>';
    slats += '<span class="string-marker string-marker-right"></span>';
    slats += "</div>";

    this.blindsEl.innerHTML = `
      <div class="slats">${slats}</div>
      <div class="rod"></div>
    `;

    requestAnimationFrame(() =>
      requestAnimationFrame(() => this.updateStrings()),
    );
  }

  private updateStrings(): void {
    if (!this.containerEl) return;
    const win = this.containerEl.closest(".live-window");
    const ml = this.containerEl.querySelector(".string-marker-left");
    const mr = this.containerEl.querySelector(".string-marker-right");
    if (!win || !ml || !mr) return;

    const winTop = win.getBoundingClientRect().top;
    if (this.stringLeftEl) this.stringLeftEl.style.height = `${ml.getBoundingClientRect().top - winTop}px`;
    if (this.stringRightEl) this.stringRightEl.style.height = `${mr.getBoundingClientRect().top - winTop}px`;
  }

  // -- Animation --------------------------------------------------------------

  private runAnimation(): void {
    this.stepAnimation(
      { blindsOpenDeg: { targetValue: 75, step: 5 } },
      150,
    ).then(() => {
      this.stepAnimation({
        blindsOpenDeg: { targetValue: 80, step: 1 },
        numBlindsCollapsed: { targetValue: NUM_BLINDS * 0.7, step: 1 },
        blindsSkewDeg: { targetValue: 5, step: 1 },
        skewDirection: { targetValue: -1, step: 1 },
      });
    });
  }

  private stepAnimation(
    targets: Partial<Record<AnimatableProp, { targetValue: number; step: number }>>,
    speedMs = 100,
  ): Promise<void> {
    const remaining = new Map(
      Object.entries(targets) as [string, { targetValue: number; step: number }][],
    );
    return new Promise<void>((resolve) => {
      const interval = window.setInterval(() => {
        const size = remaining.size;
        let finished = 0;

        for (const [prop, anim] of remaining) {
          const cur = (this.blindsState as unknown as Record<string, number>)[prop];
          const dir = cur < anim.targetValue ? 1 : -1;
          const next = cur + anim.step * dir;
          (this.blindsState as unknown as Record<string, number>)[prop] = next;

          const reached = dir === -1 ? next <= anim.targetValue : next >= anim.targetValue;
          if (reached) {
            finished++;
            remaining.delete(prop);
          }
        }

        this.renderBlinds();

        if (finished >= size) {
          clearInterval(interval);
          resolve();
        }
      }, speedMs);
    });
  }

  // -- Transform helpers ------------------------------------------------------

  private getSkewAndRotateTransform(blindIndex: number): string {
    const state = this.blindsState;
    const currBlind = NUM_BLINDS - blindIndex;
    const numOpen = NUM_BLINDS - state.numBlindsCollapsed;
    const skewSteps = numOpen > 0 ? state.blindsSkewDeg / numOpen : 0;

    let skewDeg = 0;
    if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
      skewDeg = state.blindsSkewDeg - (currBlind - state.numBlindsCollapsed - 1) * skewSteps;
    }

    const rot = state.blindsOpenDeg;
    return `rotateX(${rot}deg) skewY(${skewDeg * state.skewDirection}deg)`;
  }

  private getSkewOnlyTransform(): string {
    const state = this.blindsState;
    let skewDeg = 0;
    if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
      skewDeg = state.blindsSkewDeg / 2;
    }
    return `skewY(${skewDeg * state.skewDirection}deg)`;
  }
}
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/BlindsComponent.ts app/src/scripts/live-window/__tests__/components/BlindsComponent.test.ts
git commit -m "feat(live-window): add BlindsComponent"
```

---

## Task 8: Create WeatherTextComponent

**Files:**
- Create: `app/src/scripts/live-window/components/WeatherTextComponent.ts`

**Step 1: Write WeatherTextComponent test**

Create `app/src/scripts/live-window/__tests__/components/WeatherTextComponent.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { WeatherTextComponent } from "../../components/WeatherTextComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(overrides?: {
  hideWeatherText?: boolean;
  temp?: number;
  description?: string;
  icon?: string;
}): LiveWindowState {
  const hasWeather = overrides?.temp != null;
  const store = {
    ...DEFAULT_STATE,
    weather: {
      ...DEFAULT_STATE.weather,
      units: "metric",
      current: hasWeather
        ? {
            main: "Clouds",
            description: overrides?.description ?? "scattered clouds",
            icon: overrides?.icon ?? "03d",
            temp: overrides!.temp!,
          }
        : null,
    },
  };
  return {
    store,
    computed: { phase: buildPhaseInfo(store, Date.now()) },
    ref: {
      currentGradient: {
        zenith: { r: 65, g: 150, b: 240 },
        upper: { r: 110, g: 180, b: 245 },
        lower: { r: 160, g: 210, b: 250 },
        horizon: { r: 200, g: 225, b: 245 },
      },
    },
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: overrides?.hideWeatherText ?? false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
    },
  };
}

describe("WeatherTextComponent", () => {
  let comp: WeatherTextComponent;
  let container: HTMLElement;

  beforeEach(() => {
    comp = new WeatherTextComponent();
    container = document.createElement("div");
    comp.mount(container);
  });

  it("creates weather text element on mount", () => {
    expect(container.querySelector(".current-weather-text")).toBeTruthy();
  });

  it("shows weather text when weather data exists", () => {
    comp.update(makeState({ temp: 22, description: "clear sky" }));
    const el = container.querySelector(".current-weather-text") as HTMLElement;
    expect(el.textContent).toContain("22");
    expect(el.textContent).toContain("clear sky");
    expect(el.hidden).toBe(false);
  });

  it("hides weather text when no weather data", () => {
    comp.update(makeState());
    const el = container.querySelector(".current-weather-text") as HTMLElement;
    expect(el.hidden).toBe(true);
  });

  it("hides weather text when hideWeatherText is true", () => {
    comp.update(makeState({ temp: 22, hideWeatherText: true }));
    const el = container.querySelector(".current-weather-text") as HTMLElement;
    expect(el.hidden).toBe(true);
  });

  it("cleans up on destroy", () => {
    comp.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `just app::test`
Expected: FAIL — cannot resolve `../../components/WeatherTextComponent`

**Step 3: Write WeatherTextComponent implementation**

Create `app/src/scripts/live-window/components/WeatherTextComponent.ts`:

```ts
import type { SceneComponent, LiveWindowState } from "../types";
import { getReadableColor } from "../utils/color";

export class WeatherTextComponent implements SceneComponent {
  private el: HTMLParagraphElement | null = null;
  private containerEl: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.containerEl = container;
    const p = document.createElement("p");
    p.className = "current-weather-text";
    p.hidden = true;
    container.appendChild(p);
    this.el = p;
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;

    const current = state.store.weather.current;
    if (current) {
      const units = state.attrs.resolvedUnits;
      const symbol = units === "imperial" ? "°F" : "°C";
      this.el.textContent = `It\u2019s ${Math.round(current.temp)}${symbol} with ${current.description}`;
      this.el.hidden = state.attrs.hideWeatherText;
    } else {
      this.el.hidden = true;
    }

    // Update text color for contrast against background
    const gradient = state.ref.currentGradient;
    if (gradient && this.containerEl) {
      const tc = getReadableColor(gradient.horizon, state.attrs.bgColor);
      this.containerEl.style.setProperty(
        "--weather-text-color",
        `rgb(${tc.r},${tc.g},${tc.b})`,
      );
    }
  }

  destroy(): void {
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.el = null;
  }
}
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/WeatherTextComponent.ts app/src/scripts/live-window/__tests__/components/WeatherTextComponent.test.ts
git commit -m "feat(live-window): add WeatherTextComponent"
```

---

## Task 9: Update state.ts for LiveWindowState

**Files:**
- Modify: `app/src/scripts/live-window/state.ts`

**Step 1: Update state.ts**

The state module needs to work with `LiveWindowState`. `loadState()` returns a full `LiveWindowState` with default `computed`/`ref`/`attrs`. `saveState()` only persists the `store` portion.

```ts
import type { StoreState, LiveWindowState } from "./types";
import { buildPhaseInfo } from "./utils/phase";

export const CACHE_VERSION = 2;
const STORAGE_KEY = "liveWindowStore";

export const DEFAULT_STORE: StoreState = {
  location: { lastFetched: null, lat: null, lng: null, country: null },
  weather: { lastFetched: null, units: null, current: null, sunrise: null, sunset: null },
};

/** Keep DEFAULT_STATE as alias for backward compat with existing tests */
export const DEFAULT_STATE = DEFAULT_STORE;

export function createDefaultState(store?: StoreState): LiveWindowState {
  const s = store ?? DEFAULT_STORE;
  return {
    store: s,
    computed: { phase: buildPhaseInfo(s, Date.now()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
    },
  };
}

export function loadState(): LiveWindowState {
  let store = JSON.parse(JSON.stringify(DEFAULT_STORE)) as StoreState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data._v !== CACHE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        store = {
          location: { ...DEFAULT_STORE.location, ...data.location },
          weather: { ...DEFAULT_STORE.weather, ...data.weather },
        };
      }
    }
  } catch {
    /* ignore */
  }
  return createDefaultState(store);
}

export function saveState(state: LiveWindowState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: CACHE_VERSION, ...state.store }));
  } catch {
    /* ignore */
  }
}
```

**Step 2: Update state.test.ts**

Update `__tests__/state.test.ts` to work with `LiveWindowState`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadState, saveState, DEFAULT_STATE, CACHE_VERSION } from "../state";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    Reflect.deleteProperty(store, key);
  },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const STORAGE_KEY = "liveWindowStore";

describe("loadState", () => {
  beforeEach(() => {
    Reflect.deleteProperty(store, STORAGE_KEY);
  });

  it("returns default store when nothing is stored", () => {
    const result = loadState();
    expect(result.store).toEqual(DEFAULT_STATE);
  });

  it("returns stored state when version matches", () => {
    const saved = {
      _v: CACHE_VERSION,
      location: { lastFetched: 1000, lat: 40, lng: -74, country: "US" },
      weather: { lastFetched: 2000, units: "imperial", current: null, sunrise: null, sunset: null },
    };
    store[STORAGE_KEY] = JSON.stringify(saved);
    const result = loadState();
    expect(result.store.location.lat).toBe(40);
    expect(result.store.location.country).toBe("US");
  });

  it("returns default store and clears storage when version mismatches", () => {
    store[STORAGE_KEY] = JSON.stringify({ _v: 0, location: { lat: 99 } });
    const result = loadState();
    expect(result.store).toEqual(DEFAULT_STATE);
    expect(store[STORAGE_KEY]).toBeUndefined();
  });

  it("has computed, ref, and attrs sections", () => {
    const result = loadState();
    expect(result.computed).toBeDefined();
    expect(result.computed.phase).toBeDefined();
    expect(result.ref).toBeDefined();
    expect(result.attrs).toBeDefined();
  });
});

describe("saveState", () => {
  beforeEach(() => {
    Reflect.deleteProperty(store, STORAGE_KEY);
  });

  it("round-trips through loadState", () => {
    const state = loadState();
    state.store.location = { ...state.store.location, lat: 51.5, lng: -0.1, country: "GB" };
    saveState(state);
    const loaded = loadState();
    expect(loaded.store.location.lat).toBe(51.5);
    expect(loaded.store.location.country).toBe("GB");
  });

  it("does not persist computed or ref data", () => {
    const state = loadState();
    state.ref.currentGradient = {
      zenith: { r: 1, g: 2, b: 3 },
      upper: { r: 4, g: 5, b: 6 },
      lower: { r: 7, g: 8, b: 9 },
      horizon: { r: 10, g: 11, b: 12 },
    };
    saveState(state);
    const raw = JSON.parse(store[STORAGE_KEY]);
    expect(raw.currentGradient).toBeUndefined();
    expect(raw.ref).toBeUndefined();
    expect(raw.computed).toBeUndefined();
  });
});
```

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/state.ts app/src/scripts/live-window/__tests__/state.test.ts
git commit -m "refactor(live-window): update state.ts for LiveWindowState"
```

---

## Task 10: Update api.ts for LiveWindowState

**Files:**
- Modify: `app/src/scripts/live-window/api.ts`
- Modify: `app/src/scripts/live-window/__tests__/api.test.ts`

**Step 1: Update api.ts**

The API functions work with `StoreState` (which is `LiveWindowState['store']`). The functions themselves don't change — they already take/return `StoreState`. The orchestrator will be responsible for wrapping/unwrapping. No functional changes needed, just verify existing tests still pass.

Check that `api.ts` imports `StoreState` from `"./types"` (it already does). No changes needed to api.ts itself.

**Step 2: Update api.test.ts imports**

The test references `DEFAULT_STATE` from `"../state"` and `StoreState` from `"../types"`. Since `DEFAULT_STATE` is kept as an alias for `DEFAULT_STORE`, existing tests continue to work without changes. Verify by running tests.

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 4: Commit (if any changes were needed)**

If no changes were needed, skip this commit.

---

## Task 11: Rewrite LiveWindow.ts — Slim Orchestrator

**Files:**
- Create: `app/src/scripts/live-window/LiveWindow.ts`
- Delete (later): `app/src/scripts/live-window/live-window.ts`

**Step 1: Write the new LiveWindow orchestrator**

Create `app/src/scripts/live-window/LiveWindow.ts`:

```ts
import type { SceneComponent, LiveWindowState, RGB } from "./types";
import { loadState, saveState } from "./state";
import { resolveUnits, shouldFetchWeather, fetchLocation, fetchWeather } from "./api";
import { parseHexColor, parseComputedColor } from "./utils/color";
import { buildPhaseInfo } from "./utils/phase";
import { SkyComponent } from "./components/SkyComponent";
import { BlindsComponent } from "./components/BlindsComponent";
import { ClockComponent } from "./components/ClockComponent";
import { WeatherTextComponent } from "./components/WeatherTextComponent";

import STYLES_URL from "./live-window.css?url";

class LiveWindowElement extends HTMLElement {
  static observedAttributes = [
    "openweather-key",
    "ipregistry-key",
    "time-format",
    "hide-clock",
    "hide-weather-text",
    "temp-unit",
    "theme",
    "bg-color",
  ];

  private shadow: ShadowRoot;
  private state: LiveWindowState;

  private skyComponent = new SkyComponent();
  private blindsComponent = new BlindsComponent();
  private clockComponent = new ClockComponent();
  private weatherTextComponent = new WeatherTextComponent();

  private components: SceneComponent[];

  private clockInterval: number | null = null;
  private skyInterval: number | null = null;
  private weatherInterval: number | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.state = loadState();
    this.components = [
      this.skyComponent,
      this.blindsComponent,
      this.clockComponent,
      this.weatherTextComponent,
    ];
  }

  // -- Lifecycle --------------------------------------------------------------

  connectedCallback() {
    if (!document.querySelector("link[data-live-window-font]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Squada+One&display=swap";
      link.setAttribute("data-live-window-font", "");
      document.head.appendChild(link);
    }

    if (!this.shadow.querySelector(".scene")) {
      this.buildDOM();
    }
    this.startUpdates();
  }

  disconnectedCallback() {
    this.stopUpdates();
    for (const c of this.components) c.destroy();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;

    if (name === "time-format" || name === "hide-clock") {
      this.refreshAttrs();
      this.clockComponent.update(this.state);
      return;
    }
    if (name === "hide-weather-text" || name === "bg-color") {
      this.refreshAttrs();
      this.weatherTextComponent.update(this.state);
      return;
    }
    if (name === "temp-unit") {
      this.refreshAttrs();
      this.doFetchWeather();
      return;
    }
    if (this.getAttribute("openweather-key") && this.getAttribute("ipregistry-key") && !this.weatherInterval) {
      this.startWeatherPolling();
    }
  }

  // -- DOM --------------------------------------------------------------------

  private buildDOM() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLES_URL;
    this.shadow.appendChild(link);

    const scene = document.createElement("div");
    scene.className = "scene";

    const liveWindow = document.createElement("div");
    liveWindow.className = "live-window";
    scene.appendChild(liveWindow);

    // Mount sky
    const skyContainer = document.createElement("div");
    liveWindow.appendChild(skyContainer);
    this.skyComponent.mount(skyContainer);

    // Horizontal bar
    const bar = document.createElement("div");
    bar.className = "horizontal-bar";
    liveWindow.appendChild(bar);

    // Mount blinds
    const blindsContainer = document.createElement("div");
    liveWindow.appendChild(blindsContainer);
    this.blindsComponent.mount(blindsContainer);

    // Mount clock
    const clockContainer = document.createElement("div");
    liveWindow.appendChild(clockContainer);
    this.clockComponent.mount(clockContainer);

    // Mount weather text (outside .live-window, inside .scene)
    const weatherTextContainer = document.createElement("div");
    scene.appendChild(weatherTextContainer);
    this.weatherTextComponent.mount(weatherTextContainer);

    this.shadow.appendChild(scene);
  }

  // -- State ------------------------------------------------------------------

  private refreshAttrs() {
    this.state.attrs = {
      use12Hour: this.getAttribute("time-format") === "12",
      hideClock: this.hasAttribute("hide-clock"),
      hideWeatherText: this.hasAttribute("hide-weather-text"),
      bgColor: this.getBgColor(),
      resolvedUnits: resolveUnits(this.getAttribute("temp-unit"), this.state.store.location.country),
    };
  }

  private refreshComputed() {
    this.state.computed.phase = buildPhaseInfo(this.state.store, Date.now());
  }

  private getBgColor(): RGB {
    const attr = this.getAttribute("bg-color");
    if (attr) {
      const parsed = parseHexColor(attr);
      if (parsed) return parsed;
    }
    const computed = getComputedStyle(this).backgroundColor;
    return parseComputedColor(computed) ?? { r: 0, g: 0, b: 0 };
  }

  // -- Updates ----------------------------------------------------------------

  private startUpdates() {
    this.refreshAttrs();
    this.updateAll();

    this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
    this.skyInterval = window.setInterval(() => this.updateAll(), 15 * 60 * 1000);

    if (this.getAttribute("openweather-key") && this.getAttribute("ipregistry-key")) {
      this.startWeatherPolling();
    }
  }

  private startWeatherPolling() {
    this.doFetchWeather();
    this.weatherInterval = window.setInterval(() => this.doFetchWeather(), 60 * 60 * 1000);
  }

  private stopUpdates() {
    if (this.clockInterval != null) clearInterval(this.clockInterval);
    if (this.skyInterval != null) clearInterval(this.skyInterval);
    if (this.weatherInterval != null) clearInterval(this.weatherInterval);
    this.clockInterval = null;
    this.skyInterval = null;
    this.weatherInterval = null;
  }

  private updateClock() {
    this.refreshAttrs();
    this.clockComponent.update(this.state);
    const tick = this.clockComponent.lastTick;
    if (tick) {
      this.dispatchEvent(new CustomEvent("live-window:clock-update", { detail: tick }));
    }
  }

  private updateAll() {
    this.refreshAttrs();
    this.refreshComputed();
    for (const c of this.components) c.update(this.state);
  }

  // -- API --------------------------------------------------------------------

  private async doFetchWeather(): Promise<void> {
    const owKey = this.getAttribute("openweather-key");
    const ipKey = this.getAttribute("ipregistry-key");
    if (!owKey || !ipKey) return;

    const units = this.state.attrs.resolvedUnits;
    if (!shouldFetchWeather(this.state.store, units)) {
      this.updateAll();
      return;
    }

    this.state.store = await fetchLocation(ipKey, this.state.store);
    saveState(this.state);

    const result = await fetchWeather(owKey, this.state.store, units);
    this.state.store = result.state;
    saveState(this.state);

    if (result.changed) {
      this.updateAll();
      this.dispatchEvent(
        new CustomEvent("live-window:weather-update", {
          detail: { weather: this.state.store.weather },
        }),
      );
    }
  }
}

customElements.define("live-window", LiveWindowElement);
```

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: Pass (or errors only from old files that will be deleted in the next task).

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/LiveWindow.ts
git commit -m "feat(live-window): add slim LiveWindow orchestrator"
```

---

## Task 12: Delete old files and update entry point

**Files:**
- Delete: `app/src/scripts/live-window/live-window.ts`
- Delete: `app/src/scripts/live-window/clock.ts`
- Delete: `app/src/scripts/live-window/blinds.ts`
- Delete: `app/src/scripts/live-window/layers/gradient.ts`
- Delete: `app/src/scripts/live-window/layers/weather.ts`
- Delete: `app/src/scripts/live-window/color.ts` (already moved, verify it's gone)
- Delete: `app/src/scripts/live-window/phase-info.ts` (already moved, verify it's gone)
- Modify: whatever file imports `live-window.ts` — update to import `LiveWindow.ts`

**Step 1: Find the entry point import**

Search the codebase for where `live-window` is imported:

```bash
grep -r "live-window/live-window" app/src/ --include="*.ts" --include="*.astro" --include="*.html"
```

Update the import path from `./scripts/live-window/live-window` (or similar) to `./scripts/live-window/LiveWindow`.

**Step 2: Delete old files**

```bash
git rm app/src/scripts/live-window/live-window.ts
git rm app/src/scripts/live-window/clock.ts
git rm app/src/scripts/live-window/blinds.ts
git rm app/src/scripts/live-window/layers/gradient.ts
git rm app/src/scripts/live-window/layers/weather.ts
```

Also remove the `layers/` directory if it's now empty:
```bash
rmdir app/src/scripts/live-window/layers 2>/dev/null || true
```

Verify that `color.ts` and `phase-info.ts` were already moved by `git mv` in Task 2. If they still exist at the old paths, delete them.

**Step 3: Run typecheck**

Run: `just app::typecheck`
Expected: Pass — no references to deleted files remain.

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add -A app/src/scripts/live-window/
git commit -m "refactor(live-window): remove old files, update entry point"
```

---

## Task 13: Final verification and cleanup

**Step 1: Run full test suite**

Run: `just app::test`
Expected: All tests pass.

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: No errors.

**Step 3: Run build**

Run: `just app::build`
Expected: Build succeeds.

**Step 4: Verify final file structure**

```bash
find app/src/scripts/live-window -type f | sort
```

Expected output:
```
app/src/scripts/live-window/LiveWindow.ts
app/src/scripts/live-window/__tests__/api.test.ts
app/src/scripts/live-window/__tests__/color.test.ts
app/src/scripts/live-window/__tests__/components/BlindsComponent.test.ts
app/src/scripts/live-window/__tests__/components/ClockComponent.test.ts
app/src/scripts/live-window/__tests__/components/SkyComponent.test.ts
app/src/scripts/live-window/__tests__/components/WeatherTextComponent.test.ts
app/src/scripts/live-window/__tests__/components/sky/GradientLayer.test.ts
app/src/scripts/live-window/__tests__/layers/weather.test.ts
app/src/scripts/live-window/__tests__/phase-info.test.ts
app/src/scripts/live-window/__tests__/sky-gradient.test.ts
app/src/scripts/live-window/__tests__/state.test.ts
app/src/scripts/live-window/api.ts
app/src/scripts/live-window/components/BlindsComponent.ts
app/src/scripts/live-window/components/ClockComponent.ts
app/src/scripts/live-window/components/SkyComponent.ts
app/src/scripts/live-window/components/WeatherTextComponent.ts
app/src/scripts/live-window/components/sky/GradientLayer.ts
app/src/scripts/live-window/components/sky/WeatherLayer.ts
app/src/scripts/live-window/live-window.css
app/src/scripts/live-window/state.ts
app/src/scripts/live-window/types.ts
app/src/scripts/live-window/utils/color.ts
app/src/scripts/live-window/utils/phase.ts
app/src/scripts/live-window/utils/sky-gradient.ts
```

**Step 5: Commit any final cleanup**

```bash
git add -A && git commit -m "refactor(live-window): final cleanup after class-based refactor"
```
