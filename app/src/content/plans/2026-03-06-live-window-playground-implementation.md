---
title: Live Window Playground — Implementation Plan
description: >-
  Create a dev-only interactive playground page with manual controls for time,
  weather, tick speed, and display settings on a single live-window component.
publishedOn: 2026-03-07T00:51:55.000Z
planType: implementation
topic: live-window-playground
status: completed
category: live-window
---

# Live Window Playground — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a dev-only interactive playground page with manual controls for time, weather, tick speed, and display settings on a single live-window component.

**Architecture:** Add override attributes (`override-time`, `override-weather`, etc.) to the existing `<live-window>` web component. Build a new Astro page at `/dev/live-window-playground` with a right-sidebar control panel that sets these attributes via JS. Move the existing test page into `/dev/` for consistent structure.

**Tech Stack:** Astro pages, TypeScript, vanilla JS for controls, existing `<live-window>` web component

---

### Task 1: Move existing test page to /dev/ directory

**Files:**
- Move: `app/src/pages/live-window-test.astro` → `app/src/pages/dev/live-window-test.astro`

**Step 1: Create the dev directory and move the file**

```bash
mkdir -p app/src/pages/dev
git mv app/src/pages/live-window-test.astro app/src/pages/dev/live-window-test.astro
```

**Step 2: Fix the script import path**

In `app/src/pages/dev/live-window-test.astro`, update the script src (now one directory deeper):

```diff
-<script src="../scripts/live-window/LiveWindow.ts"></script>
+<script src="../../scripts/live-window/LiveWindow.ts"></script>
```

Also update the CSS reference:

```diff
-  @reference "../layouts/BaseLayout/BaseLayout.css";
+  @reference "../../layouts/BaseLayout/BaseLayout.css";
```

**Step 3: Verify the page loads**

Run: `just app::serve`
Visit: `http://localhost:4321/dev/live-window-test`
Expected: Same 8-city grid as before, no errors in console.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move live-window-test page to /dev/ directory"
```

---

### Task 2: Add override attributes to LiveWindowElement

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts`
- Modify: `app/src/scripts/live-window/types.ts`

**Step 2a: Add override fields to LiveWindowState.attrs**

In `app/src/scripts/live-window/types.ts`, add to the `attrs` block inside `LiveWindowState`:

```typescript
  attrs: {
    use12Hour: boolean;
    hideClock: boolean;
    hideWeatherText: boolean;
    bgColor: RGB;
    resolvedUnits: string;
    timezone: string | null;
    label: string | null;
    // Override attributes (dev playground)
    overrideTime: string | null;
    overrideWeather: string | null;
    overrideWeatherDescription: string | null;
    overrideSunrise: string | null;
    overrideSunset: string | null;
    tickSpeed: number;
  };
```

**Step 2b: Update createDefaultState in state.ts**

In `app/src/scripts/live-window/state.ts`, add the new fields to `createDefaultState`:

```typescript
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
      timezone: null,
      label: null,
      overrideTime: null,
      overrideWeather: null,
      overrideWeatherDescription: null,
      overrideSunrise: null,
      overrideSunset: null,
      tickSpeed: 1,
    },
```

**Step 2c: Update makeTestState helper**

In `app/src/scripts/live-window/__tests__/helpers.ts`, add the new fields to the returned attrs:

```typescript
    attrs: {
      use12Hour: overrides?.use12Hour ?? false,
      hideClock: overrides?.hideClock ?? false,
      hideWeatherText: overrides?.hideWeatherText ?? false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: overrides?.resolvedUnits ?? "metric",
      timezone: overrides?.timezone ?? null,
      label: overrides?.label ?? null,
      overrideTime: null,
      overrideWeather: null,
      overrideWeatherDescription: null,
      overrideSunrise: null,
      overrideSunset: null,
      tickSpeed: 1,
    },
```

**Step 2d: Register new observed attributes in LiveWindow.ts**

In `app/src/scripts/live-window/LiveWindow.ts`, update `observedAttributes`:

```typescript
  static observedAttributes = [
    "api-url",
    "time-format",
    "hide-clock",
    "hide-weather-text",
    "temp-unit",
    "theme",
    "bg-color",
    "latitude",
    "longitude",
    "timezone",
    "label",
    "override-time",
    "override-weather",
    "override-weather-description",
    "override-sunrise",
    "override-sunset",
    "tick-speed",
  ];
```

**Step 2e: Read override attrs in refreshAttrs()**

In `LiveWindow.ts`, update `refreshAttrs()`:

```typescript
  private refreshAttrs() {
    const tickSpeedRaw = this.getAttribute("tick-speed");
    const tickSpeed = tickSpeedRaw ? Math.max(1, Math.min(1000, parseFloat(tickSpeedRaw))) : 1;

    this.state.attrs = {
      use12Hour: this.getAttribute("time-format") === "12",
      hideClock: this.hasAttribute("hide-clock"),
      hideWeatherText: this.hasAttribute("hide-weather-text"),
      bgColor: this.getBgColor(),
      resolvedUnits: resolveUnits(this.getAttribute("temp-unit"), this.state.store.location.country),
      timezone: this.getAttribute("timezone") || this.state.store.location.timezone || null,
      label: this.getAttribute("label") || null,
      overrideTime: this.getAttribute("override-time"),
      overrideWeather: this.getAttribute("override-weather"),
      overrideWeatherDescription: this.getAttribute("override-weather-description"),
      overrideSunrise: this.getAttribute("override-sunrise"),
      overrideSunset: this.getAttribute("override-sunset"),
      tickSpeed,
    };
  }
```

**Step 2f: Handle override attribute changes**

In `attributeChangedCallback`, add a case for override attributes that triggers a full update:

```typescript
    if (
      name === "override-time" ||
      name === "override-weather" ||
      name === "override-weather-description" ||
      name === "override-sunrise" ||
      name === "override-sunset" ||
      name === "tick-speed"
    ) {
      this.refreshAttrs();
      this.handleOverrideChange();
      return;
    }
```

**Step 2g: Run existing tests to confirm nothing breaks**

Run: `just app::test`
Expected: All existing tests pass (the new attrs have sensible defaults).

**Step 2h: Commit**

```bash
git add app/src/scripts/live-window/LiveWindow.ts app/src/scripts/live-window/types.ts app/src/scripts/live-window/state.ts app/src/scripts/live-window/__tests__/helpers.ts
git commit -m "feat: add override attribute definitions to live-window component"
```

---

### Task 3: Implement override logic in refreshComputed()

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts`

This is the core logic: when override attributes are set, they replace real time/weather/sun data.

**Step 3a: Add helper to parse HH:MM strings to today's timestamp**

Add this private method to `LiveWindowElement`:

```typescript
  /** Parse "HH:MM" into a timestamp for today at that time. */
  private parseTimeToTimestamp(hhmm: string): number | null {
    const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const d = new Date();
    d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    return d.getTime();
  }
```

**Step 3b: Add virtual clock state**

Add private fields to `LiveWindowElement`:

```typescript
  private virtualTime: number | null = null;
  private virtualTimeAnchorReal: number | null = null;
  private virtualTimePlaying = false;
```

**Step 3c: Add handleOverrideChange method**

```typescript
  private handleOverrideChange() {
    const { overrideTime, tickSpeed } = this.state.attrs;

    if (tickSpeed > 1 && this.virtualTimePlaying) {
      // Restart virtual clock from current override time
      this.virtualTime = overrideTime
        ? this.parseTimeToTimestamp(overrideTime) ?? Date.now()
        : Date.now();
      this.virtualTimeAnchorReal = Date.now();
    } else if (overrideTime) {
      this.virtualTime = this.parseTimeToTimestamp(overrideTime) ?? null;
      this.virtualTimeAnchorReal = null;
    } else {
      this.virtualTime = null;
      this.virtualTimeAnchorReal = null;
    }

    this.updateAll();
  }
```

**Step 3d: Add public play/pause methods for virtual clock**

```typescript
  playVirtualClock(): void {
    if (this.virtualTimePlaying) return;
    this.virtualTimePlaying = true;
    const { overrideTime } = this.state.attrs;
    this.virtualTime = overrideTime
      ? this.parseTimeToTimestamp(overrideTime) ?? Date.now()
      : this.virtualTime ?? Date.now();
    this.virtualTimeAnchorReal = Date.now();
  }

  pauseVirtualClock(): void {
    if (!this.virtualTimePlaying) return;
    // Freeze at current virtual time
    this.virtualTime = this.getNow();
    this.virtualTimeAnchorReal = null;
    this.virtualTimePlaying = false;
  }
```

**Step 3e: Add getNow() method that respects overrides**

```typescript
  /** Returns the effective "now" timestamp, accounting for overrides and virtual clock. */
  private getNow(): number {
    const { overrideTime, tickSpeed, timezone } = this.state.attrs;

    // Virtual clock advancing
    if (this.virtualTimePlaying && this.virtualTime != null && this.virtualTimeAnchorReal != null) {
      const realElapsed = Date.now() - this.virtualTimeAnchorReal;
      let vt = this.virtualTime + realElapsed * tickSpeed;

      // Wrap past midnight back to 00:00 (same day)
      const dayStart = new Date(this.virtualTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000;
      if (vt >= dayEnd) {
        vt = dayStart.getTime() + ((vt - dayStart.getTime()) % (24 * 60 * 60 * 1000));
      }
      return vt;
    }

    // Static override time
    if (this.virtualTime != null) {
      return this.virtualTime;
    }

    // Static override from attribute (not yet parsed by handleOverrideChange)
    if (overrideTime) {
      return this.parseTimeToTimestamp(overrideTime) ?? (timezone ? getTimezoneAdjustedNow(timezone) : Date.now());
    }

    // Normal real time
    return timezone ? getTimezoneAdjustedNow(timezone) : Date.now();
  }
```

**Step 3f: Update refreshComputed() to use getNow() and override weather/sun**

Replace the existing `refreshComputed()`:

```typescript
  private refreshComputed() {
    const { overrideWeather, overrideWeatherDescription, overrideSunrise, overrideSunset } = this.state.attrs;
    const tz = this.state.attrs.timezone;
    const now = this.getNow();

    let store = this.state.store;

    // Apply sunrise/sunset overrides
    const srOverride = overrideSunrise ? this.parseTimeToTimestamp(overrideSunrise) : null;
    const ssOverride = overrideSunset ? this.parseTimeToTimestamp(overrideSunset) : null;
    if (srOverride != null || ssOverride != null) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          sunrise: srOverride ?? store.weather.sunrise,
          sunset: ssOverride ?? store.weather.sunset,
        },
      };
    } else if (tz && store.weather.sunrise != null && store.weather.sunset != null) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          sunrise: shiftTimestampToTimezone(store.weather.sunrise, tz),
          sunset: shiftTimestampToTimezone(store.weather.sunset, tz),
        },
      };
    }

    // Apply weather overrides
    if (overrideWeather) {
      const isDaytime = now >= (store.weather.sunrise ?? 0) && now <= (store.weather.sunset ?? 0);
      const suffix = isDaytime ? "d" : "n";
      const iconBase = overrideWeather.replace(/[dn]$/, "");
      store = {
        ...store,
        weather: {
          ...store.weather,
          current: {
            main: overrideWeather,
            description: overrideWeatherDescription ?? "",
            icon: iconBase + suffix,
            temp: store.weather.current?.temp ?? 20,
          },
        },
      };
    } else if (overrideWeatherDescription && store.weather.current) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          current: {
            ...store.weather.current,
            description: overrideWeatherDescription,
          },
        },
      };
    }

    this.state.computed.phase = buildPhaseInfo(store, now);
  }
```

**Step 3g: Update updateClock() to use virtual time**

The clock currently reads `new Date()` directly. When overrides are active, it needs to read from the virtual time. Update `ClockComponent` to accept an optional `nowOverride` on state.

Add to `LiveWindowState.ref` in `types.ts`:

```typescript
  ref: {
    currentGradient?: SkyGradient;
    celestialReady?: boolean;
    nowOverride?: number;
  };
```

In `LiveWindow.ts`, update `updateClock()`:

```typescript
  private updateClock() {
    this.refreshAttrs();
    const now = this.getNow();
    this.state.ref.nowOverride = this.hasAnyOverride() ? now : undefined;
    this.clockComponent.update(this.state);
    const tick = this.clockComponent.lastTick;
    if (tick) {
      this.dispatchEvent(new CustomEvent("live-window:clock-update", { detail: tick }));
    }
  }
```

Add helper:

```typescript
  private hasAnyOverride(): boolean {
    const a = this.state.attrs;
    return !!(a.overrideTime || a.overrideWeather || a.overrideSunrise || a.overrideSunset || a.tickSpeed > 1);
  }
```

Also update `updateAll()`:

```typescript
  private updateAll() {
    this.refreshAttrs();
    this.refreshComputed();
    const now = this.getNow();
    this.state.ref.nowOverride = this.hasAnyOverride() ? now : undefined;
    for (const c of this.components) c.update(this.state);
  }
```

**Step 3h: Update ClockComponent to respect nowOverride**

In `app/src/scripts/live-window/components/ClockComponent.ts`, update the `update()` method to use `state.ref.nowOverride` when available:

```typescript
  update(state: LiveWindowState): void {
    if (!this.clockEl) return;

    this.clockEl.hidden = state.attrs.hideClock;

    let raw: number;
    let m: number;

    if (state.ref.nowOverride != null) {
      const d = new Date(state.ref.nowOverride);
      raw = d.getHours();
      m = d.getMinutes();
    } else if (state.attrs.timezone) {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: state.attrs.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = fmt.formatToParts(new Date());
      raw = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      if (raw === 24) raw = 0;
      m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    } else {
      const now = new Date();
      raw = now.getHours();
      m = now.getMinutes();
    }

    // ... rest unchanged
```

**Step 3i: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 3j: Commit**

```bash
git add app/src/scripts/live-window/
git commit -m "feat: implement time/weather/sun override logic in live-window"
```

---

### Task 4: Write tests for override behavior

**Files:**
- Create: `app/src/scripts/live-window/__tests__/overrides.test.ts`

**Step 4a: Write tests for override attributes**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { makeTestState } from "./helpers";
import { buildPhaseInfo } from "../utils/phase";

describe("override attributes", () => {
  describe("override-time", () => {
    it("uses override time instead of real time for phase calculation", () => {
      // Simulate noon — should be midday phase (index 8)
      const state = makeTestState({ hours: 12, sunrise: 6, sunset: 18 });
      expect(state.computed.phase.phaseIndex).toBe(8);

      // Simulate 1 AM — should be night phase (index 0)
      const nightState = makeTestState({ hours: 1, sunrise: 6, sunset: 18 });
      expect(nightState.computed.phase.phaseIndex).toBe(0);
    });
  });

  describe("override-weather", () => {
    it("injects weather icon into phase info", () => {
      const state = makeTestState({
        hours: 12,
        sunrise: 6,
        sunset: 18,
        store: {
          weather: {
            current: { main: "Rain", description: "heavy rain", icon: "10d", temp: 15 },
          },
        },
      });
      expect(state.computed.phase.weather.icon).toBe("10d");
      expect(state.computed.phase.weather.description).toBe("heavy rain");
    });
  });

  describe("override-sunrise/sunset", () => {
    it("changes phase timestamps based on overridden sun times", () => {
      // With sunrise at 4 AM: at 5 AM should be goldenHourAm (index 5)
      const earlyState = makeTestState({ hours: 5, sunrise: 4, sunset: 20 });
      expect(earlyState.computed.phase.phaseIndex).toBe(5);

      // With sunrise at 8 AM: at 5 AM should still be night-ish (index 0)
      const lateState = makeTestState({ hours: 5, sunrise: 8, sunset: 20 });
      expect(lateState.computed.phase.phaseIndex).toBe(0);
    });
  });
});
```

**Step 4b: Run tests to verify they pass**

Run: `just app::test`
Expected: All tests pass.

**Step 4c: Commit**

```bash
git add app/src/scripts/live-window/__tests__/overrides.test.ts
git commit -m "test: add override attribute tests for live-window"
```

---

### Task 5: Create the playground Astro page — layout and window

**Files:**
- Create: `app/src/pages/dev/live-window-playground.astro`

**Step 5a: Create the page with layout structure**

```astro
---
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";

if (import.meta.env.PROD) {
  return Astro.redirect("/404");
}
---

<BaseLayout>
  <div class="playground">
    <div class="playground-window">
      <live-window
        id="preview-window"
        theme="dark"
        bg-color="#030a12"
        override-sunrise="06:00"
        override-sunset="18:00"
      />
    </div>
    <div class="playground-controls" id="controls">
      <h2 class="controls-title">Live Window Playground</h2>
      <!-- Controls will be added in subsequent tasks -->
    </div>
  </div>
</BaseLayout>

<script src="../../scripts/live-window/LiveWindow.ts"></script>

<style>
  @reference "../../layouts/BaseLayout/BaseLayout.css";

  .playground {
    display: flex;
    gap: 2rem;
    min-height: calc(100vh - 4rem);
    padding: 1rem;
  }

  .playground-window {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .playground-controls {
    flex: 1;
    overflow-y: auto;
    max-height: calc(100vh - 4rem);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .controls-title {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-neon);
    margin: 0;
  }

  live-window {
    --window-color: var(--color-midnight);
    --blinds-color: var(--color-midnight);
    --clock-text-color: #e74c3c;
  }
</style>
```

**Step 5b: Verify the page loads with a single window**

Run: `just app::serve`
Visit: `http://localhost:4321/dev/live-window-playground`
Expected: Window visible on the left, empty controls area on the right. Window shows 06:00 sunrise / 18:00 sunset scene.

**Step 5c: Commit**

```bash
git add app/src/pages/dev/live-window-playground.astro
git commit -m "feat: create playground page skeleton with window"
```

---

### Task 6: Add time controls

**Files:**
- Modify: `app/src/pages/dev/live-window-playground.astro`

**Step 6a: Add time slider and phase quick-jump buttons to controls HTML**

Inside the `#controls` div, after the title:

```html
<fieldset class="control-group">
  <legend>Time</legend>
  <div class="control-row">
    <label for="time-slider">Time of day</label>
    <output id="time-display">12:00</output>
  </div>
  <input type="range" id="time-slider" min="0" max="1439" value="720" step="1" />
  <div class="phase-buttons">
    <button data-phase-hour="0" data-phase-min="0">Night</button>
    <button data-phase-hour="4" data-phase-min="30">Astro Dawn</button>
    <button data-phase-hour="5" data-phase-min="0">Nautical Dawn</button>
    <button data-phase-hour="5" data-phase-min="30">Civil Dawn</button>
    <button data-phase-hour="6" data-phase-min="0">Sunrise</button>
    <button data-phase-hour="6" data-phase-min="30">Golden AM</button>
    <button data-phase-hour="7" data-phase-min="0">Early Morning</button>
    <button data-phase-hour="9" data-phase-min="0">Late Morning</button>
    <button data-phase-hour="12" data-phase-min="0">Midday</button>
    <button data-phase-hour="15" data-phase-min="0">Early Afternoon</button>
    <button data-phase-hour="17" data-phase-min="0">Late Afternoon</button>
    <button data-phase-hour="17" data-phase-min="30">Golden PM</button>
    <button data-phase-hour="18" data-phase-min="0">Sunset</button>
    <button data-phase-hour="18" data-phase-min="30">Civil Dusk</button>
    <button data-phase-hour="19" data-phase-min="0">Nautical Dusk</button>
    <button data-phase-hour="19" data-phase-min="30">Astro Dusk</button>
  </div>
</fieldset>
```

**Step 6b: Add time control script**

In a `<script>` block (not the component import one — a separate inline script):

```html
<script>
  document.addEventListener("DOMContentLoaded", () => {
    const win = document.getElementById("preview-window") as HTMLElement;
    const timeSlider = document.getElementById("time-slider") as HTMLInputElement;
    const timeDisplay = document.getElementById("time-display") as HTMLOutputElement;

    function minutesToHHMM(minutes: number): string {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    function setTime(minutes: number) {
      const hhmm = minutesToHHMM(minutes);
      timeSlider.value = String(minutes);
      timeDisplay.textContent = hhmm;
      win.setAttribute("override-time", hhmm);
    }

    timeSlider.addEventListener("input", () => {
      setTime(parseInt(timeSlider.value, 10));
    });

    // Phase quick-jump buttons
    document.querySelectorAll("[data-phase-hour]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const h = parseInt((btn as HTMLElement).dataset.phaseHour!, 10);
        const m = parseInt((btn as HTMLElement).dataset.phaseMin!, 10);
        setTime(h * 60 + m);
      });
    });

    // Initialize at noon
    setTime(720);
  });
</script>
```

**Step 6c: Add control styles**

```css
  .control-group {
    border: 1px solid var(--color-midnight-light, #1a2a3a);
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 0;
  }

  .control-group legend {
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-neon);
    padding: 0 0.5rem;
  }

  .control-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .control-row label {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .control-row output {
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    color: var(--color-text);
  }

  input[type="range"] {
    width: 100%;
    margin-bottom: 0.75rem;
  }

  .phase-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .phase-buttons button {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-midnight-light, #1a2a3a);
    border-radius: 0.25rem;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
  }

  .phase-buttons button:hover {
    background: var(--color-midnight-light, #1a2a3a);
    color: var(--color-text);
  }
```

**Step 6d: Verify time controls work**

Run: `just app::serve`
Visit playground. Drag time slider — window should update sky/sun/moon/stars. Click phase buttons — should jump to those times.

**Step 6e: Commit**

```bash
git add app/src/pages/dev/live-window-playground.astro
git commit -m "feat: add time slider and phase jump buttons to playground"
```

---

### Task 7: Add tick speed controls

**Files:**
- Modify: `app/src/pages/dev/live-window-playground.astro`

**Step 7a: Add tick speed HTML**

After the time control group:

```html
<fieldset class="control-group">
  <legend>Tick Speed</legend>
  <div class="control-row">
    <label for="speed-slider">Multiplier</label>
    <output id="speed-display">1x</output>
  </div>
  <input type="range" id="speed-slider" min="1" max="1000" value="1" step="1" />
  <div class="speed-presets">
    <button data-speed="1">1x</button>
    <button data-speed="10">10x</button>
    <button data-speed="100">100x</button>
    <button data-speed="720">720x</button>
  </div>
  <div class="playback-controls">
    <button id="play-btn">Play</button>
    <button id="pause-btn">Pause</button>
  </div>
</fieldset>
```

**Step 7b: Add tick speed script logic**

In the DOMContentLoaded handler:

```typescript
    const speedSlider = document.getElementById("speed-slider") as HTMLInputElement;
    const speedDisplay = document.getElementById("speed-display") as HTMLOutputElement;
    const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
    const pauseBtn = document.getElementById("pause-btn") as HTMLButtonElement;

    function setSpeed(speed: number) {
      speedSlider.value = String(speed);
      speedDisplay.textContent = `${speed}x`;
      win.setAttribute("tick-speed", String(speed));
    }

    speedSlider.addEventListener("input", () => {
      setSpeed(parseInt(speedSlider.value, 10));
    });

    document.querySelectorAll("[data-speed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setSpeed(parseInt((btn as HTMLElement).dataset.speed!, 10));
      });
    });

    playBtn.addEventListener("click", () => {
      (win as any).playVirtualClock();
      playBtn.classList.add("active");
      pauseBtn.classList.remove("active");
    });

    pauseBtn.addEventListener("click", () => {
      (win as any).pauseVirtualClock();
      pauseBtn.classList.add("active");
      playBtn.classList.remove("active");

      // Sync the time slider to where virtual clock stopped
      const phase = (win as any).state?.computed?.phase;
      if (phase?.now) {
        const d = new Date(phase.now);
        const mins = d.getHours() * 60 + d.getMinutes();
        timeSlider.value = String(mins);
        timeDisplay.textContent = minutesToHHMM(mins);
      }
    });
```

**Step 7c: Add playback styles**

```css
  .speed-presets,
  .playback-controls {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .playback-controls button,
  .speed-presets button {
    flex: 1;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid var(--color-midnight-light, #1a2a3a);
    border-radius: 0.25rem;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
  }

  .playback-controls button:hover,
  .speed-presets button:hover {
    background: var(--color-midnight-light, #1a2a3a);
    color: var(--color-text);
  }

  .playback-controls button.active {
    background: var(--color-neon);
    color: var(--color-background);
    border-color: var(--color-neon);
  }
```

**Step 7d: Verify tick speed works**

Set speed to 720x, click Play. The sky should cycle through all 16 phases in ~2 minutes. Click Pause — should freeze. Time slider should sync to paused position.

**Step 7e: Commit**

```bash
git add app/src/pages/dev/live-window-playground.astro
git commit -m "feat: add tick speed controls with play/pause to playground"
```

---

### Task 8: Add weather controls

**Files:**
- Modify: `app/src/pages/dev/live-window-playground.astro`

**Step 8a: Add weather HTML**

```html
<fieldset class="control-group">
  <legend>Weather</legend>
  <div class="control-row">
    <label for="weather-select">Condition</label>
  </div>
  <select id="weather-select">
    <option value="">None (clear sky)</option>
    <option value="02">Few Clouds</option>
    <option value="03">Scattered Clouds</option>
    <option value="04">Broken/Overcast Clouds</option>
    <option value="09">Drizzle</option>
    <option value="10">Rain</option>
    <option value="11">Thunderstorm</option>
    <option value="13">Snow</option>
    <option value="50">Mist</option>
  </select>
  <div class="control-row" style="margin-top: 0.75rem">
    <label for="intensity-select">Intensity</label>
  </div>
  <select id="intensity-select">
    <option value="light">Light</option>
    <option value="" selected>Default</option>
    <option value="heavy">Heavy</option>
    <option value="very heavy">Very Heavy</option>
    <option value="extreme">Extreme</option>
  </select>
</fieldset>
```

**Step 8b: Add weather script logic**

```typescript
    const weatherSelect = document.getElementById("weather-select") as HTMLSelectElement;
    const intensitySelect = document.getElementById("intensity-select") as HTMLSelectElement;

    function updateWeather() {
      const code = weatherSelect.value;
      const intensity = intensitySelect.value;

      if (!code) {
        win.removeAttribute("override-weather");
        win.removeAttribute("override-weather-description");
        return;
      }

      // Day/night suffix will be auto-determined by the component
      win.setAttribute("override-weather", code + "d");

      const conditionName = weatherSelect.options[weatherSelect.selectedIndex].text.toLowerCase();
      const desc = intensity ? `${intensity} ${conditionName}` : conditionName;
      win.setAttribute("override-weather-description", desc);
    }

    weatherSelect.addEventListener("change", updateWeather);
    intensitySelect.addEventListener("change", updateWeather);
```

**Step 8c: Add select styles**

```css
  select {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--color-midnight-light, #1a2a3a);
    border-radius: 0.25rem;
    background: var(--color-background);
    color: var(--color-text);
  }
```

**Step 8d: Verify weather controls**

Select "Rain" + "Heavy" — should see clouds and heavy rain particles. Select "Snow" — should see snowflakes and snow sill. Select "None" — should clear all weather.

**Step 8e: Commit**

```bash
git add app/src/pages/dev/live-window-playground.astro
git commit -m "feat: add weather condition and intensity controls to playground"
```

---

### Task 9: Add sun/moon and display settings controls

**Files:**
- Modify: `app/src/pages/dev/live-window-playground.astro`

**Step 9a: Add sun/moon HTML**

```html
<fieldset class="control-group">
  <legend>Sun / Moon</legend>
  <div class="control-row">
    <label for="sunrise-input">Sunrise</label>
    <input type="time" id="sunrise-input" value="06:00" />
  </div>
  <div class="control-row">
    <label for="sunset-input">Sunset</label>
    <input type="time" id="sunset-input" value="18:00" />
  </div>
</fieldset>
```

**Step 9b: Add display settings HTML**

```html
<fieldset class="control-group">
  <legend>Display</legend>
  <div class="control-row">
    <label for="theme-toggle">Theme</label>
    <select id="theme-toggle">
      <option value="dark" selected>Dark</option>
      <option value="">Light</option>
    </select>
  </div>
  <div class="control-row">
    <label for="clock-toggle">Clock</label>
    <select id="clock-toggle">
      <option value="show" selected>Show</option>
      <option value="hide">Hide</option>
    </select>
  </div>
  <div class="control-row">
    <label for="format-toggle">Time format</label>
    <select id="format-toggle">
      <option value="24" selected>24h</option>
      <option value="12">12h</option>
    </select>
  </div>
  <div class="control-row">
    <label for="weather-text-toggle">Weather text</label>
    <select id="weather-text-toggle">
      <option value="show" selected>Show</option>
      <option value="hide">Hide</option>
    </select>
  </div>
  <div class="control-row">
    <label for="temp-toggle">Temp unit</label>
    <select id="temp-toggle">
      <option value="C" selected>°C</option>
      <option value="F">°F</option>
    </select>
  </div>
</fieldset>
```

**Step 9c: Add reset button HTML**

```html
<button id="reset-btn" class="reset-btn">Reset All</button>
```

**Step 9d: Add sun/moon script logic**

```typescript
    const sunriseInput = document.getElementById("sunrise-input") as HTMLInputElement;
    const sunsetInput = document.getElementById("sunset-input") as HTMLInputElement;

    sunriseInput.addEventListener("change", () => {
      win.setAttribute("override-sunrise", sunriseInput.value);
    });

    sunsetInput.addEventListener("change", () => {
      win.setAttribute("override-sunset", sunsetInput.value);
    });
```

**Step 9e: Add display settings script logic**

```typescript
    const themeToggle = document.getElementById("theme-toggle") as HTMLSelectElement;
    const clockToggle = document.getElementById("clock-toggle") as HTMLSelectElement;
    const formatToggle = document.getElementById("format-toggle") as HTMLSelectElement;
    const weatherTextToggle = document.getElementById("weather-text-toggle") as HTMLSelectElement;
    const tempToggle = document.getElementById("temp-toggle") as HTMLSelectElement;

    themeToggle.addEventListener("change", () => {
      if (themeToggle.value) {
        win.setAttribute("theme", themeToggle.value);
      } else {
        win.removeAttribute("theme");
      }
    });

    clockToggle.addEventListener("change", () => {
      if (clockToggle.value === "hide") {
        win.setAttribute("hide-clock", "");
      } else {
        win.removeAttribute("hide-clock");
      }
    });

    formatToggle.addEventListener("change", () => {
      if (formatToggle.value === "12") {
        win.setAttribute("time-format", "12");
      } else {
        win.removeAttribute("time-format");
      }
    });

    weatherTextToggle.addEventListener("change", () => {
      if (weatherTextToggle.value === "hide") {
        win.setAttribute("hide-weather-text", "");
      } else {
        win.removeAttribute("hide-weather-text");
      }
    });

    tempToggle.addEventListener("change", () => {
      win.setAttribute("temp-unit", tempToggle.value);
    });
```

**Step 9f: Add reset logic**

```typescript
    const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;

    resetBtn.addEventListener("click", () => {
      // Pause virtual clock
      (win as any).pauseVirtualClock();
      playBtn.classList.remove("active");
      pauseBtn.classList.remove("active");

      // Reset time
      setTime(720);
      setSpeed(1);

      // Reset weather
      weatherSelect.value = "";
      intensitySelect.value = "";
      win.removeAttribute("override-weather");
      win.removeAttribute("override-weather-description");

      // Reset sun/moon
      sunriseInput.value = "06:00";
      sunsetInput.value = "18:00";
      win.setAttribute("override-sunrise", "06:00");
      win.setAttribute("override-sunset", "18:00");

      // Reset display
      themeToggle.value = "dark";
      win.setAttribute("theme", "dark");
      clockToggle.value = "show";
      win.removeAttribute("hide-clock");
      formatToggle.value = "24";
      win.removeAttribute("time-format");
      weatherTextToggle.value = "show";
      win.removeAttribute("hide-weather-text");
      tempToggle.value = "C";
      win.setAttribute("temp-unit", "C");
    });
```

**Step 9g: Add reset button styles**

```css
  .reset-btn {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: 1px solid #e74c3c;
    border-radius: 0.5rem;
    background: transparent;
    color: #e74c3c;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .reset-btn:hover {
    background: #e74c3c;
    color: white;
  }

  input[type="time"] {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--color-midnight-light, #1a2a3a);
    border-radius: 0.25rem;
    background: var(--color-background);
    color: var(--color-text);
  }
```

**Step 9h: Verify all controls work together**

- Change sunrise to 04:00, sunset to 22:00 — sun arc should span longer day
- Toggle theme to light — frame color should change
- Toggle clock visibility, time format, weather text
- Hit Reset All — everything should return to defaults

**Step 9i: Commit**

```bash
git add app/src/pages/dev/live-window-playground.astro
git commit -m "feat: add sun/moon, display settings, and reset controls to playground"
```

---

### Task 10: End-to-end manual testing and polish

**Step 10a: Full integration test**

1. Visit `http://localhost:4321/dev/live-window-playground`
2. Drag time slider from midnight to midnight — verify all 16 phases render smoothly
3. Click each phase button — verify phase matches
4. Set tick speed to 720x, click Play — verify full day cycle in ~2 minutes
5. Click Pause — verify time freezes, slider syncs
6. Set weather to "Thunderstorm" + "Extreme" — verify heavy rain + lightning + full clouds
7. Set weather to "Snow" + "Light" — verify light snowfall
8. Change sunrise to 10:00, sunset to 14:00 — verify compressed day (like polar winter)
9. Reset All — verify clean state

2. Visit `http://localhost:4321/dev/live-window-test`
3. Verify old test page still works at new URL

**Step 10b: Run all tests**

Run: `just app::test`
Expected: All tests pass.

**Step 10c: Run typecheck**

Run: `just app::typecheck`
Expected: No errors.

**Step 10d: Final commit if any polish changes**

```bash
git add -A
git commit -m "chore: polish playground page"
```
