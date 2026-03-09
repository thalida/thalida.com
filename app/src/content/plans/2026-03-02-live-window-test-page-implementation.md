---
title: Live Window Test Page — Implementation Plan
description: >-
  Add optional `latitude`/`longitude`/`timezone` attributes to `<live-window>`
  so it can render any location, then create a test page displaying 8 world
  cities side-by-side.
publishedOn: 2026-03-03T04:06:00.000Z
planType: implementation
topic: live-window-test-page
status: completed
category: live-window
---

# Live Window Test Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional `latitude`/`longitude`/`timezone` attributes to `<live-window>` so it can render any location, then create a test page displaying 8 world cities side-by-side.

**Architecture:** Extend the existing Web Component with three new HTML attributes. When lat/lng are provided, skip IP geolocation and inject coordinates directly. When timezone is provided, shift all time calculations to that timezone. Create a new Astro page rendering a grid of LiveWindow instances.

**Tech Stack:** TypeScript, Astro, Vitest (jsdom), Web Components, Intl.DateTimeFormat

---

### Task 1: Add `timezone` utility function

**Files:**
- Create: `app/src/scripts/live-window/utils/timezone.ts`
- Test: `app/src/scripts/live-window/__tests__/timezone.test.ts`

**Step 1: Write the failing test**

Create `app/src/scripts/live-window/__tests__/timezone.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { getTimezoneAdjustedNow } from "../utils/timezone";

describe("getTimezoneAdjustedNow", () => {
  it("returns a shifted timestamp for a different timezone", () => {
    // Fix the clock to a known instant: 2025-06-15 12:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const tokyoNow = getTimezoneAdjustedNow("Asia/Tokyo"); // UTC+9
    const tokyoDate = new Date(tokyoNow);

    // In Tokyo it should be 21:00
    expect(tokyoDate.getHours()).toBe(21);
    expect(tokyoDate.getMinutes()).toBe(0);

    vi.useRealTimers();
  });

  it("returns a shifted timestamp for a negative offset timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const nyNow = getTimezoneAdjustedNow("America/New_York"); // UTC-4 (EDT)
    const nyDate = new Date(nyNow);

    expect(nyDate.getHours()).toBe(8);
    expect(nyDate.getMinutes()).toBe(0);

    vi.useRealTimers();
  });

  it("returns null-equivalent behavior when timezone is null", () => {
    // When timezone is null, the function should not be called.
    // This test documents that the function requires a valid IANA string.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    // With UTC, the local time should match UTC
    const utcNow = getTimezoneAdjustedNow("UTC");
    const utcDate = new Date(utcNow);
    expect(utcDate.getHours()).toBe(12);

    vi.useRealTimers();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/timezone.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `app/src/scripts/live-window/utils/timezone.ts`:

```ts
/**
 * Returns a Date.now()-like timestamp that, when passed to `new Date()`,
 * produces local-looking hours/minutes matching the given IANA timezone.
 *
 * This is used so that all existing phase/clock code (which calls
 * `new Date(now).getHours()`) works correctly for remote timezones
 * without modifying every consumer.
 */
export function getTimezoneAdjustedNow(timezone: string): number {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);

  // Build a Date in the local timezone whose wall-clock fields match the target
  const shifted = new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second"),
  );

  return shifted.getTime();
}
```

**Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/timezone.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/utils/timezone.ts app/src/scripts/live-window/__tests__/timezone.test.ts
git commit -m "feat(live-window): add timezone utility for remote time shifting"
```

---

### Task 2: Add `timezone` to state types and defaults

**Files:**
- Modify: `app/src/scripts/live-window/types.ts` (the `LiveWindowState.attrs` interface)
- Modify: `app/src/scripts/live-window/state.ts` (the `createDefaultState` function)

**Step 1: Add `timezone` field to `LiveWindowState.attrs`**

In `app/src/scripts/live-window/types.ts`, add to the `attrs` object in the `LiveWindowState` interface:

```ts
// Inside LiveWindowState.attrs:
timezone: string | null;
```

**Step 2: Update `createDefaultState` default**

In `app/src/scripts/live-window/state.ts`, add `timezone: null` to the attrs default in `createDefaultState()`:

```ts
attrs: {
  use12Hour: false,
  hideClock: false,
  hideWeatherText: false,
  bgColor: { r: 0, g: 0, b: 0 },
  resolvedUnits: "metric",
  timezone: null,
},
```

**Step 3: Run all existing tests to make sure nothing breaks**

Run: `just app::test`
Expected: All existing tests pass. Some component test `makeState()` helpers may need `timezone: null` added to their attrs objects if TypeScript complains.

**Step 4: Fix any test helpers that fail type checks**

Any test file with a `makeState` helper building `attrs` manually needs `timezone: null` added. Search for these with:
```bash
grep -rl "resolvedUnits" app/src/scripts/live-window/__tests__/
```
Update each match to include `timezone: null` in the attrs object.

**Step 5: Run tests again**

Run: `just app::test`
Expected: PASS

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/types.ts app/src/scripts/live-window/state.ts app/src/scripts/live-window/__tests__/
git commit -m "feat(live-window): add timezone field to state types"
```

---

### Task 3: Update ClockComponent to support timezone

**Files:**
- Modify: `app/src/scripts/live-window/components/ClockComponent.ts`
- Modify: `app/src/scripts/live-window/__tests__/components/ClockComponent.test.ts`

**Step 1: Write the failing test**

Add to the existing `ClockComponent.test.ts`:

```ts
describe("timezone support", () => {
  it("displays time in the specified timezone", () => {
    vi.useFakeTimers();
    // Set browser time to 2025-06-15 12:00:00 UTC
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const state = makeState(12); // ignored for wall clock, but needed for state shape
    state.attrs.timezone = "Asia/Tokyo"; // UTC+9 → 21:00

    clock.update(state);

    const hourEl = container.querySelector(".clock-hour") as HTMLElement;
    expect(hourEl.textContent).toBe("21");

    vi.useRealTimers();
  });

  it("falls back to local time when timezone is null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const state = makeState(12);
    state.attrs.timezone = null;

    clock.update(state);

    // Should use browser's local time (whatever the test env is)
    const hourEl = container.querySelector(".clock-hour") as HTMLElement;
    expect(hourEl.textContent).toBeTruthy();

    vi.useRealTimers();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/components/ClockComponent.test.ts`
Expected: FAIL — timezone not used by clock

**Step 3: Update ClockComponent**

In `app/src/scripts/live-window/components/ClockComponent.ts`, modify the `update` method:

Replace the time extraction block:
```ts
const now = new Date();
const raw = now.getHours();
let h = raw;
const m = now.getMinutes();
```

With:
```ts
let raw: number;
let m: number;

if (state.attrs.timezone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: state.attrs.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  raw = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  if (raw === 24) raw = 0;
  m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
} else {
  const now = new Date();
  raw = now.getHours();
  m = now.getMinutes();
}

let h = raw;
```

**Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/scripts/live-window/__tests__/components/ClockComponent.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/ClockComponent.ts app/src/scripts/live-window/__tests__/components/ClockComponent.test.ts
git commit -m "feat(live-window): support timezone in ClockComponent"
```

---

### Task 4: Add new attributes to LiveWindow orchestrator

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts`

**Step 1: Add attributes to `observedAttributes`**

Add `"latitude"`, `"longitude"`, and `"timezone"` to the `observedAttributes` array:

```ts
static observedAttributes = [
  "openweather-key",
  "ipregistry-key",
  "time-format",
  "hide-clock",
  "hide-weather-text",
  "temp-unit",
  "theme",
  "bg-color",
  "latitude",
  "longitude",
  "timezone",
];
```

**Step 2: Update `refreshAttrs` to read timezone**

In the `refreshAttrs` method, add the timezone attribute:

```ts
private refreshAttrs() {
  this.state.attrs = {
    use12Hour: this.getAttribute("time-format") === "12",
    hideClock: this.hasAttribute("hide-clock"),
    hideWeatherText: this.hasAttribute("hide-weather-text"),
    bgColor: this.getBgColor(),
    resolvedUnits: resolveUnits(this.getAttribute("temp-unit"), this.state.store.location.country),
    timezone: this.getAttribute("timezone") || null,
  };
}
```

**Step 3: Update `refreshComputed` to use timezone-adjusted now**

Import the timezone utility at the top of the file:
```ts
import { getTimezoneAdjustedNow } from "./utils/timezone";
```

Update `refreshComputed`:
```ts
private refreshComputed() {
  const now = this.state.attrs.timezone
    ? getTimezoneAdjustedNow(this.state.attrs.timezone)
    : Date.now();
  this.state.computed.phase = buildPhaseInfo(this.state.store, now);
}
```

**Step 4: Update `doFetchWeather` to handle explicit lat/lng**

Replace the `doFetchWeather` method:

```ts
private async doFetchWeather(): Promise<void> {
  const owKey = this.getAttribute("openweather-key");
  if (!owKey) return;

  const explicitLat = this.getAttribute("latitude");
  const explicitLng = this.getAttribute("longitude");
  const hasExplicitCoords = explicitLat != null && explicitLng != null;

  // When explicit coords are provided, inject them directly (skip IP lookup)
  if (hasExplicitCoords) {
    this.state.store = {
      ...this.state.store,
      location: {
        lat: parseFloat(explicitLat),
        lng: parseFloat(explicitLng),
        country: null,
        lastFetched: Date.now(),
      },
    };
  } else {
    // Need IP registry key for IP-based location
    const ipKey = this.getAttribute("ipregistry-key");
    if (!ipKey) return;

    if (!shouldFetchWeather(this.state.store, this.state.attrs.resolvedUnits)) {
      this.updateAll();
      return;
    }

    this.state.store = await fetchLocation(ipKey, this.state.store);
    saveState(this.state);
  }

  // Re-resolve units after location — country may have changed
  this.refreshAttrs();
  const units = this.state.attrs.resolvedUnits;

  if (!shouldFetchWeather(this.state.store, units) && !hasExplicitCoords) {
    this.updateAll();
    return;
  }

  // Guard: still check rate limit for weather even with explicit coords
  if (!hasExplicitCoords || shouldFetchWeather(this.state.store, units)) {
    const result = await fetchWeather(owKey, this.state.store, units);
    this.state.store = result.state;

    // Only persist to localStorage for IP-based instances
    if (!hasExplicitCoords) {
      saveState(this.state);
    }

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
```

**Step 5: Update `startUpdates` to allow weather polling without ipregistry key**

In `startUpdates`, update the weather polling condition to also start when explicit coords are present:

```ts
private startUpdates() {
  this.refreshAttrs();
  this.updateAll();

  this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
  this.skyInterval = window.setInterval(() => this.updateAll(), 15 * 60 * 1000);

  const hasExplicitCoords = this.getAttribute("latitude") != null && this.getAttribute("longitude") != null;
  const hasIpFlow = this.getAttribute("openweather-key") && this.getAttribute("ipregistry-key");

  if (hasExplicitCoords && this.getAttribute("openweather-key")) {
    this.startWeatherPolling();
  } else if (hasIpFlow) {
    this.startWeatherPolling();
  }
}
```

Also update `attributeChangedCallback` to handle the new attributes triggering a weather refetch:

```ts
// Add to attributeChangedCallback, before the existing ipregistry check:
if (name === "latitude" || name === "longitude" || name === "timezone") {
  this.refreshAttrs();
  this.doFetchWeather();
  return;
}
```

**Step 6: Update `loadState` usage — skip localStorage for explicit-coord instances**

In the constructor, do NOT call `loadState()` from localStorage unconditionally. Instead, defer:

Actually, keep the constructor simple — `loadState()` is fine. The key point is that `doFetchWeather` overwrites `state.store.location` when explicit coords are present, and we skip `saveState` for those instances. That's sufficient.

**Step 7: Run all tests**

Run: `just app::test`
Expected: PASS

**Step 8: Commit**

```bash
git add app/src/scripts/live-window/LiveWindow.ts
git commit -m "feat(live-window): support latitude, longitude, timezone attributes"
```

---

### Task 5: Create the test page

**Files:**
- Create: `app/src/pages/live-window-test.astro`

**Step 1: Create the test page**

Create `app/src/pages/live-window-test.astro`:

```astro
---
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";

const openweatherKey = import.meta.env.PUBLIC_OPENWEATHER_KEY || "";

const cities = [
  { name: "New York", country: "US", lat: 40.7128, lng: -74.006, tz: "America/New_York", unit: "F" },
  { name: "London", country: "UK", lat: 51.5074, lng: -0.1278, tz: "Europe/London", unit: "C" },
  { name: "Tokyo", country: "JP", lat: 35.6762, lng: 139.6503, tz: "Asia/Tokyo", unit: "C" },
  { name: "Sydney", country: "AU", lat: -33.8688, lng: 151.2093, tz: "Australia/Sydney", unit: "C" },
  { name: "Cairo", country: "EG", lat: 30.0444, lng: 31.2357, tz: "Africa/Cairo", unit: "C" },
  { name: "São Paulo", country: "BR", lat: -23.5505, lng: -46.6333, tz: "America/Sao_Paulo", unit: "C" },
  { name: "Reykjavik", country: "IS", lat: 64.1466, lng: -21.9426, tz: "Atlantic/Reykjavik", unit: "C" },
  { name: "Mumbai", country: "IN", lat: 19.076, lng: 72.8777, tz: "Asia/Kolkata", unit: "C" },
];
---

<BaseLayout activePage="">
  <section class="text-center mb-12">
    <h1 class="font-display font-bold text-neon text-display-lg tracking-tighter leading-none">
      Live Window Test
    </h1>
    <p class="mt-4 font-body text-sm text-muted">
      Real-time sky, weather, and clock for 8 locations around the world.
    </p>
  </section>

  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
    {cities.map((city) => (
      <div class="flex flex-col items-center gap-3">
        <live-window
          openweather-key={openweatherKey}
          latitude={String(city.lat)}
          longitude={String(city.lng)}
          timezone={city.tz}
          temp-unit={city.unit}
          theme="dark"
          bg-color="#030a12"
        />
        <div class="text-center">
          <h2 class="font-heading font-semibold text-text text-base m-0">
            {city.name}
          </h2>
          <p class="font-body text-2xs text-muted m-0 mt-1">
            {city.lat.toFixed(2)}°, {city.lng.toFixed(2)}° · {city.tz}
          </p>
        </div>
      </div>
    ))}
  </div>
</BaseLayout>

<script src="../scripts/live-window/LiveWindow.ts"></script>

<style>
  @reference "../layouts/BaseLayout/BaseLayout.css";

  live-window {
    --window-color: var(--color-midnight);
    --blinds-color: var(--color-midnight);
    --clock-text-color: #e74c3c;
    --weather-text-font: "Space Grotesk", sans-serif;
  }
</style>
```

**Step 2: Verify the page loads locally**

Run: `just app::serve`
Then visit: `http://localhost:4321/live-window-test`
Expected: 8 live window instances in a grid, each showing different times and sky gradients

**Step 3: Commit**

```bash
git add app/src/pages/live-window-test.astro
git commit -m "feat: add live window test page with 8 world cities"
```

---

### Task 6: Run full test suite and verify build

**Step 1: Run all tests**

Run: `just app::test`
Expected: All tests pass

**Step 2: Type check**

Run: `just app::typecheck`
Expected: No errors

**Step 3: Build**

Run: `just app::build`
Expected: Clean build with no errors

**Step 4: Fix any issues found and commit**

If any issues, fix and commit with an appropriate message.
