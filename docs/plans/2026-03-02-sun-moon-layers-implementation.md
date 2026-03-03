# Sun & Moon Layers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add sun and moon celestial bodies to the live window sky using the celestial circle model.

**Architecture:** Both sun and moon sit on a shared 360° celestial circle that rotates once per day. Sun angle = time of day, moon angle = sun angle − (moonPhase × 360°). Bodies are visible when in the upper arc (above horizon). Moon phase is calculated from the synodic cycle. New `utils/celestial.ts` utility, `SunLayer` and `MoonLayer` components, CSS additions, and SkyComponent wiring.

**Tech Stack:** TypeScript, Vitest, CSS, web components (shadow DOM)

---

### Task 1: Celestial utility — tests

**Files:**

- Create: `app/src/scripts/live-window/__tests__/celestial.test.ts`

**Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest";
import { getMoonPhase, getSunAngle, getMoonAngle, getArcPosition } from "../utils/celestial";

describe("getSunAngle", () => {
  it("returns 0 (top) at solar noon", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    const noon = new Date(2026, 2, 2, 12, 0).getTime();
    expect(getSunAngle(noon, sunrise, sunset)).toBeCloseTo(0, 1);
  });

  it("returns π (bottom) at midnight", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    const midnight = new Date(2026, 2, 3, 0, 0).getTime();
    expect(getSunAngle(midnight, sunrise, sunset)).toBeCloseTo(Math.PI, 1);
  });

  it("returns ~π/2 at sunset", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    expect(getSunAngle(sunset, sunrise, sunset)).toBeCloseTo(Math.PI / 2, 1);
  });

  it("returns ~3π/2 at sunrise", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    expect(getSunAngle(sunrise, sunrise, sunset)).toBeCloseTo(3 * Math.PI / 2, 1);
  });
});

describe("getMoonPhase", () => {
  // Jan 29, 2025 was a known new moon
  it("returns ~0 on a known new moon date", () => {
    const newMoon = new Date(2025, 0, 29, 12, 0).getTime();
    expect(getMoonPhase(newMoon)).toBeCloseTo(0, 1);
  });

  it("returns ~0.5 approximately 14.76 days after new moon (full moon)", () => {
    const newMoon = new Date(2025, 0, 29, 12, 0).getTime();
    const fullMoon = newMoon + 14.765 * 24 * 60 * 60 * 1000;
    expect(getMoonPhase(fullMoon)).toBeCloseTo(0.5, 1);
  });

  it("returns value between 0 and 1", () => {
    const phase = getMoonPhase(Date.now());
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
  });

  it("cycles back near 0 after ~29.53 days", () => {
    const start = new Date(2025, 0, 29, 12, 0).getTime();
    const oneMonth = start + 29.53 * 24 * 60 * 60 * 1000;
    expect(getMoonPhase(oneMonth)).toBeCloseTo(0, 1);
  });
});

describe("getMoonAngle", () => {
  it("equals sun angle at new moon (phase 0)", () => {
    const sunAngle = 1.5;
    expect(getMoonAngle(sunAngle, 0)).toBeCloseTo(sunAngle, 5);
  });

  it("is opposite sun at full moon (phase 0.5)", () => {
    const sunAngle = 0; // noon
    const moonAngle = getMoonAngle(sunAngle, 0.5);
    // Should be π (opposite side)
    expect(moonAngle).toBeCloseTo(Math.PI, 1);
  });

  it("wraps around to stay in 0–2π range", () => {
    const moonAngle = getMoonAngle(0.5, 0.75);
    expect(moonAngle).toBeGreaterThanOrEqual(0);
    expect(moonAngle).toBeLessThan(2 * Math.PI);
  });
});

describe("getArcPosition", () => {
  it("returns visible=true and y near top at angle 0 (zenith)", () => {
    const pos = getArcPosition(0);
    expect(pos.visible).toBe(true);
    expect(pos.y).toBeLessThan(20); // near top of window
  });

  it("returns visible=true at angle π/4 (between zenith and horizon)", () => {
    const pos = getArcPosition(Math.PI / 4);
    expect(pos.visible).toBe(true);
  });

  it("returns visible=false at angle π (nadir/bottom)", () => {
    const pos = getArcPosition(Math.PI);
    expect(pos.visible).toBe(false);
  });

  it("returns visible=false at angle 3π/4 (below horizon)", () => {
    const pos = getArcPosition(3 * Math.PI / 4);
    expect(pos.visible).toBe(false);
  });

  it("x increases from left to right as angle goes from 3π/2 toward 0 toward π/2", () => {
    // 3π/2 = rising (left), 0 = zenith (center), π/2 = setting (right)
    const rising = getArcPosition(3 * Math.PI / 2);
    const zenith = getArcPosition(0);
    const setting = getArcPosition(Math.PI / 2);
    expect(rising.x).toBeLessThan(zenith.x);
    expect(zenith.x).toBeLessThan(setting.x);
  });

  it("y is lowest at horizon and highest at zenith", () => {
    const zenith = getArcPosition(0);
    const midway = getArcPosition(Math.PI / 4);
    expect(zenith.y).toBeLessThan(midway.y); // lower y = higher on screen
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test -- --run app/src/scripts/live-window/__tests__/celestial.test.ts`
Expected: FAIL — module `../utils/celestial` not found

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/__tests__/celestial.test.ts
git commit -m "test: add celestial utility tests for sun/moon positioning"
```

---

### Task 2: Celestial utility — implementation

**Files:**

- Create: `app/src/scripts/live-window/utils/celestial.ts`

**Step 1: Write the implementation**

```typescript
/**
 * Celestial circle utilities for sun and moon positioning.
 *
 * Both bodies sit on a 360° circle rotating once per 24 hours.
 *   angle 0     = zenith (solar noon position)
 *   angle π/2   = setting (west horizon)
 *   angle π     = nadir (midnight position)
 *   angle 3π/2  = rising (east horizon)
 *
 * A body is "visible" when its angle is in the upper semicircle
 * (roughly 3π/2 through 0 to π/2, i.e. above the horizon).
 */

const TWO_PI = 2 * Math.PI;

/** Synodic month in milliseconds (29.53059 days). */
const SYNODIC_MS = 29.53059 * 24 * 60 * 60 * 1000;

/** Known new moon: January 29, 2025 12:36 UTC. */
const NEW_MOON_EPOCH = Date.UTC(2025, 0, 29, 12, 36);

/**
 * Returns the sun's angle on the celestial circle.
 * 0 = zenith (solar noon), π = nadir (midnight).
 * Uses actual sunrise/sunset to derive solar noon.
 */
export function getSunAngle(now: number, sunrise: number, sunset: number): number {
  const solarNoon = (sunrise + sunset) / 2;
  const dayMs = 24 * 60 * 60 * 1000;
  const elapsed = now - solarNoon;
  const angle = ((elapsed / dayMs) * TWO_PI) % TWO_PI;
  return angle < 0 ? angle + TWO_PI : angle;
}

/**
 * Returns the current lunar phase as 0–1.
 * 0 = new moon, ~0.25 = first quarter, ~0.5 = full moon, ~0.75 = last quarter.
 */
export function getMoonPhase(now: number): number {
  const elapsed = now - NEW_MOON_EPOCH;
  const phase = (elapsed / SYNODIC_MS) % 1;
  return phase < 0 ? phase + 1 : phase;
}

/**
 * Returns the moon's angle on the celestial circle.
 * The moon lags behind the sun by (phase × 2π).
 */
export function getMoonAngle(sunAngle: number, moonPhase: number): number {
  const angle = (sunAngle + moonPhase * TWO_PI) % TWO_PI;
  return angle < 0 ? angle + TWO_PI : angle;
}

export interface ArcPosition {
  /** Horizontal position as percentage (0=left, 100=right). */
  x: number;
  /** Vertical position as percentage (0=top, 100=bottom). */
  y: number;
  /** Whether the body is above the horizon (visible). */
  visible: boolean;
}

/**
 * Maps a celestial angle to window x/y coordinates.
 *
 * The visible arc spans from 3π/2 (rising, left edge) through
 * 0 (zenith, center top) to π/2 (setting, right edge).
 *
 * Returns visible=false for angles in the lower semicircle (below horizon).
 */
export function getArcPosition(angle: number): ArcPosition {
  // Normalize to 0–2π
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;

  // Visible arc: π/2 > a >= 0 (zenith to setting) OR 2π > a >= 3π/2 (rising to zenith)
  // Equivalently: a <= π/2 OR a >= 3π/2
  const visible = a <= Math.PI / 2 || a >= 3 * Math.PI / 2;

  if (!visible) {
    return { x: 50, y: 100, visible: false };
  }

  // Map the visible arc (3π/2 → 0 → π/2) to progress 0→1
  // Shift angle so 3π/2 maps to 0: shifted = (a + π/2) mod 2π, then normalize to 0→1 over range π
  let shifted = a + Math.PI / 2;
  if (shifted >= TWO_PI) shifted -= TWO_PI;
  // shifted now: 0 = rising (3π/2 original), π/2 = zenith (0 original), π = setting (π/2 original)
  const progress = shifted / Math.PI; // 0 → 1

  const x = 10 + progress * 80; // 10% to 90%
  const y = 70 - Math.sin(progress * Math.PI) * 60; // parabolic arc, peaks at 10%

  return { x, y, visible };
}
```

**Step 2: Run tests to verify they pass**

Run: `just app::test -- --run app/src/scripts/live-window/__tests__/celestial.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/utils/celestial.ts
git commit -m "feat(live-window): add celestial circle utility for sun/moon positioning"
```

---

### Task 3: SunLayer — tests

**Files:**

- Create: `app/src/scripts/live-window/__tests__/components/sky/SunLayer.test.ts`

**Step 1: Write the tests**

Follow the same `makeState` helper pattern from `StarsLayer.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { SunLayer } from "../../../components/sky/SunLayer";
import type { LiveWindowState } from "../../../types";
import { buildPhaseInfo } from "../../../utils/phase";
import { DEFAULT_STATE } from "../../../state";

function makeState(hours: number): LiveWindowState {
  const store = {
    ...DEFAULT_STATE,
    weather: {
      ...DEFAULT_STATE.weather,
      sunrise: new Date().setHours(6, 0, 0, 0),
      sunset: new Date().setHours(18, 0, 0, 0),
    },
  };
  const now = new Date();
  now.setHours(hours, 0, 0, 0);
  return {
    store,
    computed: { phase: buildPhaseInfo(store, now.getTime()) },
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

describe("SunLayer", () => {
  let layer: SunLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new SunLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("sets sky-layer sun-layer class on mount", () => {
    expect(container.className).toBe("sky-layer sun-layer");
  });

  it("creates a sun element on first update", () => {
    layer.update(makeState(12));
    expect(container.querySelector(".sun")).toBeTruthy();
  });

  it("positions sun in visible area during daytime (noon)", () => {
    layer.update(makeState(12));
    const opacity = parseFloat(container.style.opacity);
    expect(opacity).toBeGreaterThan(0);
  });

  it("hides sun at night (1 AM)", () => {
    layer.update(makeState(1));
    const opacity = parseFloat(container.style.opacity);
    expect(opacity).toBe(0);
  });

  it("sun x position moves left to right during the day", () => {
    layer.update(makeState(8)); // morning
    const sunMorning = container.querySelector(".sun") as HTMLElement;
    const leftMorning = parseFloat(sunMorning.style.left);

    layer.update(makeState(16)); // afternoon
    const sunAfternoon = container.querySelector(".sun") as HTMLElement;
    const leftAfternoon = parseFloat(sunAfternoon.style.left);

    expect(leftAfternoon).toBeGreaterThan(leftMorning);
  });

  it("clears DOM on destroy", () => {
    layer.update(makeState(12));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test -- --run app/src/scripts/live-window/__tests__/components/sky/SunLayer.test.ts`
Expected: FAIL — module not found

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/__tests__/components/sky/SunLayer.test.ts
git commit -m "test: add SunLayer component tests"
```

---

### Task 4: SunLayer — implementation + CSS

**Files:**

- Create: `app/src/scripts/live-window/components/sky/SunLayer.ts`
- Modify: `app/src/scripts/live-window/live-window.css` (add after stars section, ~line 127)

**Step 1: Write SunLayer component**

```typescript
import type { SceneComponent, LiveWindowState } from "../../types";
import { getSunAngle, getArcPosition } from "../../utils/celestial";

export class SunLayer implements SceneComponent {
  private el: HTMLElement | null = null;
  private sun: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer sun-layer";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;

    const { sunrise, sunset, now } = state.computed.phase;
    const sr = sunrise ?? new Date(now).setHours(6, 0, 0, 0);
    const ss = sunset ?? new Date(now).setHours(18, 0, 0, 0);

    const angle = getSunAngle(now, sr, ss);
    const pos = getArcPosition(angle);

    if (!this.sun) {
      this.sun = document.createElement("div");
      this.sun.className = "sun";
      this.el.appendChild(this.sun);
    }

    if (pos.visible) {
      this.sun.style.left = `${pos.x}%`;
      this.sun.style.top = `${pos.y}%`;
    }
    this.el.style.opacity = pos.visible ? "1" : "0";
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.sun = null;
  }
}
```

**Step 2: Add CSS for sun**

Add after the stars `@keyframes twinkle` block (~line 127) in `live-window.css`:

```css
/* ---- Sun ---- */

.sun-layer {
  z-index: 1;
  transition: opacity 1s ease;
  pointer-events: none;
}

.sun {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffd700;
  box-shadow:
    0 0 15px 8px rgba(255, 215, 0, 0.4),
    0 0 30px 15px rgba(255, 165, 0, 0.2);
  transform: translate(-50%, -50%);
}
```

**Step 3: Run tests to verify they pass**

Run: `just app::test -- --run app/src/scripts/live-window/__tests__/components/sky/SunLayer.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/SunLayer.ts app/src/scripts/live-window/live-window.css
git commit -m "feat(live-window): add SunLayer component with CSS"
```

---

### Task 5: MoonLayer — tests

**Files:**

- Create: `app/src/scripts/live-window/__tests__/components/sky/MoonLayer.test.ts`

**Step 1: Write the tests**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MoonLayer } from "../../../components/sky/MoonLayer";
import type { LiveWindowState } from "../../../types";
import { buildPhaseInfo } from "../../../utils/phase";
import { DEFAULT_STATE } from "../../../state";

function makeState(hours: number): LiveWindowState {
  const store = {
    ...DEFAULT_STATE,
    weather: {
      ...DEFAULT_STATE.weather,
      sunrise: new Date().setHours(6, 0, 0, 0),
      sunset: new Date().setHours(18, 0, 0, 0),
    },
  };
  const now = new Date();
  now.setHours(hours, 0, 0, 0);
  return {
    store,
    computed: { phase: buildPhaseInfo(store, now.getTime()) },
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

describe("MoonLayer", () => {
  let layer: MoonLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new MoonLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("sets sky-layer moon-layer class on mount", () => {
    expect(container.className).toBe("sky-layer moon-layer");
  });

  it("creates moon and moon-shadow elements on first update", () => {
    layer.update(makeState(1));
    expect(container.querySelector(".moon")).toBeTruthy();
    expect(container.querySelector(".moon-shadow")).toBeTruthy();
  });

  it("has opacity > 0 when moon is above horizon at night", () => {
    // At full moon (phase ~0.5), moon should be visible at midnight
    vi.useFakeTimers();
    // Set to a known full moon date: Jan 29+14.76 days = ~Feb 13, 2025
    vi.setSystemTime(new Date(2025, 1, 13, 0, 0));
    layer.update(makeState(0)); // midnight
    const opacity = parseFloat(container.style.opacity);
    // Full moon at midnight should be visible (opacity > 0)
    expect(opacity).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("updates moon-shadow scaleX based on lunar phase", () => {
    layer.update(makeState(0));
    const shadow = container.querySelector(".moon-shadow") as HTMLElement;
    expect(shadow).toBeTruthy();
    // Shadow should have a transform with scaleX
    expect(shadow.style.transform).toContain("scaleX");
  });

  it("clears DOM on destroy", () => {
    layer.update(makeState(0));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test -- --run app/src/scripts/live-window/__tests__/components/sky/MoonLayer.test.ts`
Expected: FAIL — module not found

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/__tests__/components/sky/MoonLayer.test.ts
git commit -m "test: add MoonLayer component tests"
```

---

### Task 6: MoonLayer — implementation + CSS

**Files:**

- Create: `app/src/scripts/live-window/components/sky/MoonLayer.ts`
- Modify: `app/src/scripts/live-window/live-window.css` (add after sun section)

**Step 1: Write MoonLayer component**

```typescript
import type { SceneComponent, LiveWindowState } from "../../types";
import { getSunAngle, getMoonPhase, getMoonAngle, getArcPosition } from "../../utils/celestial";

export class MoonLayer implements SceneComponent {
  private el: HTMLElement | null = null;
  private moon: HTMLElement | null = null;
  private shadow: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer moon-layer";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;

    const { sunrise, sunset, now } = state.computed.phase;
    const sr = sunrise ?? new Date(now).setHours(6, 0, 0, 0);
    const ss = sunset ?? new Date(now).setHours(18, 0, 0, 0);

    const sunAngle = getSunAngle(now, sr, ss);
    const moonPhase = getMoonPhase(now);
    const moonAngle = getMoonAngle(sunAngle, moonPhase);
    const pos = getArcPosition(moonAngle);

    if (!this.moon) {
      this.moon = document.createElement("div");
      this.moon.className = "moon";
      this.shadow = document.createElement("div");
      this.shadow.className = "moon-shadow";
      this.moon.appendChild(this.shadow);
      this.el.appendChild(this.moon);
    }

    if (pos.visible) {
      this.moon.style.left = `${pos.x}%`;
      this.moon.style.top = `${pos.y}%`;
    }
    this.el.style.opacity = pos.visible ? "1" : "0";

    // Render lunar phase via shadow overlay scaleX.
    // moonPhase 0 = new (fully shadowed), 0.5 = full (no shadow).
    // scaleX: 1 at new moon, 0 at first quarter, -1 at full,
    //         0 at last quarter, back to 1.
    if (this.shadow) {
      const scaleX = Math.cos(moonPhase * 2 * Math.PI);
      this.shadow.style.transform = `scaleX(${scaleX.toFixed(3)})`;
    }
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.moon = null;
    this.shadow = null;
  }
}
```

**Step 2: Add CSS for moon**

Add after the sun CSS section in `live-window.css`:

```css
/* ---- Moon ---- */

.moon-layer {
  z-index: 1;
  transition: opacity 1s ease;
  pointer-events: none;
}

.moon {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e8e8d0;
  box-shadow: 0 0 8px 4px rgba(232, 232, 208, 0.3);
  overflow: hidden;
  transform: translate(-50%, -50%);
}

.moon-shadow {
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  background: var(--window-sky-color-default);
}
```

**Step 3: Run tests to verify they pass**

Run: `just app::test -- --run app/src/scripts/live-window/__tests__/components/sky/MoonLayer.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/MoonLayer.ts app/src/scripts/live-window/live-window.css
git commit -m "feat(live-window): add MoonLayer component with lunar phase rendering"
```

---

### Task 7: Wire SunLayer and MoonLayer into SkyComponent

**Files:**

- Modify: `app/src/scripts/live-window/components/SkyComponent.ts`
- Modify: `app/src/scripts/live-window/__tests__/components/SkyComponent.test.ts`

**Step 1: Update SkyComponent to include new layers**

In `SkyComponent.ts`, add imports and insert into children array:

```typescript
import type { SceneComponent, LiveWindowState } from "../types";
import { GradientLayer } from "./sky/GradientLayer";
import { StarsLayer } from "./sky/StarsLayer";
import { SunLayer } from "./sky/SunLayer";
import { MoonLayer } from "./sky/MoonLayer";
import { WeatherLayer } from "./sky/WeatherLayer";

export class SkyComponent implements SceneComponent {
  private children: SceneComponent[] = [
    new GradientLayer(),
    new StarsLayer(),
    new SunLayer(),
    new MoonLayer(),
    new WeatherLayer(),
  ];

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

**Step 2: Update SkyComponent test**

In `SkyComponent.test.ts`, update the child count assertion from 3 to 5:

Change line with `expect(container.children.length).toBe(3)` to:

```typescript
  it("mounts child layers as divs inside container", () => {
    expect(container.children.length).toBe(5);
  });
```

**Step 3: Run all live-window tests**

Run: `just app::test -- --run app/src/scripts/live-window/`
Expected: All PASS

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/SkyComponent.ts app/src/scripts/live-window/__tests__/components/SkyComponent.test.ts
git commit -m "feat(live-window): wire SunLayer and MoonLayer into SkyComponent"
```

---

### Task 8: Run full test suite and typecheck

**Step 1: Run all tests**

Run: `just app::test`
Expected: All PASS

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: No errors

**Step 3: Update TODO.md**

Mark the sun/moon TODO item as done.

**Step 4: Commit**

```bash
git add TODO.md
git commit -m "chore: mark sun/moon layers as done in TODO"
```
