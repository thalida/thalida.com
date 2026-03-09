---
title: Info Panel Implementation Plan
description: >-
  Replace `WeatherTextComponent` with a combined `InfoPanelComponent` that
  displays location name, coordinates/timezone, and weather info inside the
  live-window shadow DOM with static white text.
publishedOn: 2026-03-03T05:02:48.000Z
subcategory: info-panel
category: layout
tags: [implementation]
---

# Info Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `WeatherTextComponent` with a combined `InfoPanelComponent` that displays location name, coordinates/timezone, and weather info inside the live-window shadow DOM with static white text.

**Architecture:** Rename and expand the existing `WeatherTextComponent` into an `InfoPanelComponent` that renders three text sections. The weather API response's `data.name` field provides reverse-geocoded city names. An optional `label` attribute overrides the API name. All info text uses a static white color instead of the dynamic WCAG-contrast neon color.

**Tech Stack:** TypeScript, Shadow DOM, CSS, Vitest

---

### Task 1: Add `name` field to `StoreState.location` and update defaults

**Files:**
- Modify: `app/src/scripts/live-window/types.ts:50-56`
- Modify: `app/src/scripts/live-window/state.ts:8`

**Step 1: Add `name` to `StoreState.location` type**

In `types.ts`, update the `location` shape inside `StoreState`:

```typescript
location: {
  lastFetched: number | null;
  lat: number | null;
  lng: number | null;
  country: string | null;
  name: string | null;
};
```

**Step 2: Add `name: null` to `DEFAULT_STORE`**

In `state.ts`, update `DEFAULT_STORE`:

```typescript
export const DEFAULT_STORE: StoreState = {
  location: { lastFetched: null, lat: null, lng: null, country: null, name: null },
  weather: { lastFetched: null, units: null, current: null, sunrise: null, sunset: null },
};
```

**Step 3: Add `label` to `LiveWindowState.attrs`**

In `types.ts`, add to the `attrs` interface inside `LiveWindowState`:

```typescript
attrs: {
  use12Hour: boolean;
  hideClock: boolean;
  hideWeatherText: boolean;
  bgColor: RGB;
  resolvedUnits: string;
  timezone: string | null;
  label: string | null;
};
```

**Step 4: Update `createDefaultState` in `state.ts`**

Add `label: null` to the attrs object:

```typescript
attrs: {
  use12Hour: false,
  hideClock: false,
  hideWeatherText: false,
  bgColor: { r: 0, g: 0, b: 0 },
  resolvedUnits: "metric",
  timezone: null,
  label: null,
},
```

**Step 5: Run typecheck**

Run: `just app::typecheck`
Expected: Errors in files that reference `location` without `name` (api.ts, LiveWindow.ts). This is expected — we'll fix them in subsequent tasks.

**Step 6: Commit**

```
feat(live-window): add name to location state and label to attrs
```

---

### Task 2: Extract location name from API responses

**Files:**
- Modify: `app/src/scripts/live-window/api.ts:48-70` (fetchLocation)
- Modify: `app/src/scripts/live-window/api.ts:72-102` (fetchWeather)

**Step 1: Update `fetchLocation` to extract city name**

In the `fetchLocation` function, add `name` from the IP registry response:

```typescript
return {
  ...state,
  location: {
    lat: data.location.latitude,
    lng: data.location.longitude,
    country: data.location.country?.code ?? null,
    name: data.location.city ?? null,
    lastFetched: Date.now(),
  },
};
```

**Step 2: Update `fetchWeather` to extract city name**

In the `fetchWeather` function, update the `newState` to include `name` from the weather response:

```typescript
const newState: StoreState = {
  ...state,
  location: {
    ...state.location,
    name: data.name ?? state.location.name,
  },
  weather: {
    current: { ...data.weather[0], temp: data.main.temp },
    sunrise: data.sys.sunrise * 1000,
    sunset: data.sys.sunset * 1000,
    units,
    lastFetched: Date.now(),
  },
};
```

**Step 3: Update `doFetchWeather` in `LiveWindow.ts`**

In the explicit coords branch, add `name: null` (preserving existing name if any):

```typescript
this.state.store = {
  ...this.state.store,
  location: {
    lat: parseFloat(explicitLat),
    lng: parseFloat(explicitLng),
    country: null,
    name: this.state.store.location.name,
    lastFetched: Date.now(),
  },
};
```

**Step 4: Run typecheck**

Run: `just app::typecheck`
Expected: Should pass (or only errors related to InfoPanelComponent which doesn't exist yet).

**Step 5: Run existing API tests**

Run: `just app::test`
Expected: Existing tests pass. Some may need `name: null` added to location objects in test fixtures.

**Step 6: Commit**

```
feat(live-window): extract location name from API responses
```

---

### Task 3: Create `InfoPanelComponent` and delete `WeatherTextComponent`

**Files:**
- Create: `app/src/scripts/live-window/components/InfoPanelComponent.ts`
- Delete: `app/src/scripts/live-window/components/WeatherTextComponent.ts`

**Step 1: Create `InfoPanelComponent.ts`**

```typescript
import type { SceneComponent, LiveWindowState } from "../types";

export class InfoPanelComponent implements SceneComponent {
  private containerEl: HTMLElement | null = null;
  private locationEl: HTMLParagraphElement | null = null;
  private coordsEl: HTMLParagraphElement | null = null;
  private weatherEl: HTMLParagraphElement | null = null;

  mount(container: HTMLElement): void {
    this.containerEl = container;

    const wrapper = document.createElement("div");
    wrapper.className = "info-panel";

    const location = document.createElement("p");
    location.className = "info-panel-location";
    location.hidden = true;
    wrapper.appendChild(location);
    this.locationEl = location;

    const coords = document.createElement("p");
    coords.className = "info-panel-coords";
    coords.hidden = true;
    wrapper.appendChild(coords);
    this.coordsEl = coords;

    const weather = document.createElement("p");
    weather.className = "info-panel-weather";
    weather.hidden = true;
    wrapper.appendChild(weather);
    this.weatherEl = weather;

    container.appendChild(wrapper);
  }

  update(state: LiveWindowState): void {
    this.updateLocation(state);
    this.updateCoords(state);
    this.updateWeather(state);
  }

  private updateLocation(state: LiveWindowState): void {
    if (!this.locationEl) return;
    const name = state.attrs.label ?? state.store.location.name;
    if (name) {
      this.locationEl.textContent = name;
      this.locationEl.hidden = false;
    } else {
      this.locationEl.hidden = true;
    }
  }

  private updateCoords(state: LiveWindowState): void {
    if (!this.coordsEl) return;
    const { lat, lng } = state.store.location;
    if (lat != null && lng != null) {
      const parts = [`${lat.toFixed(2)}°, ${lng.toFixed(2)}°`];
      if (state.attrs.timezone) {
        parts.push(state.attrs.timezone);
      }
      this.coordsEl.textContent = parts.join(" · ");
      this.coordsEl.hidden = false;
    } else {
      this.coordsEl.hidden = true;
    }
  }

  private updateWeather(state: LiveWindowState): void {
    if (!this.weatherEl) return;
    const current = state.store.weather.current;
    if (current && !state.attrs.hideWeatherText) {
      const units = state.attrs.resolvedUnits;
      const symbol = units === "imperial" ? "°F" : "°C";
      this.weatherEl.textContent = `${Math.round(current.temp)}${symbol} · ${current.description}`;
      this.weatherEl.hidden = false;
    } else {
      this.weatherEl.hidden = true;
    }
  }

  destroy(): void {
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.locationEl = null;
    this.coordsEl = null;
    this.weatherEl = null;
  }
}
```

**Step 2: Delete `WeatherTextComponent.ts`**

Remove `app/src/scripts/live-window/components/WeatherTextComponent.ts`.

**Step 3: Commit**

```
feat(live-window): replace WeatherTextComponent with InfoPanelComponent
```

---

### Task 4: Wire `InfoPanelComponent` into `LiveWindow.ts`

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts`

**Step 1: Update imports**

Replace:
```typescript
import { WeatherTextComponent } from "./components/WeatherTextComponent";
```
With:
```typescript
import { InfoPanelComponent } from "./components/InfoPanelComponent";
```

**Step 2: Update `observedAttributes`**

Add `"label"` to the `observedAttributes` array.

**Step 3: Update component instantiation**

Replace:
```typescript
private weatherTextComponent = new WeatherTextComponent();
```
With:
```typescript
private infoPanelComponent = new InfoPanelComponent();
```

**Step 4: Update `components` array in constructor**

Replace:
```typescript
this.components = [this.skyComponent, this.blindsComponent, this.clockComponent, this.weatherTextComponent];
```
With:
```typescript
this.components = [this.skyComponent, this.blindsComponent, this.clockComponent, this.infoPanelComponent];
```

**Step 5: Update `attributeChangedCallback`**

Replace the block that handles `hide-weather-text` and `bg-color`:
```typescript
if (name === "hide-weather-text" || name === "bg-color") {
  this.refreshAttrs();
  this.weatherTextComponent.update(this.state);
  return;
}
```
With:
```typescript
if (name === "hide-weather-text" || name === "bg-color" || name === "label") {
  this.refreshAttrs();
  this.infoPanelComponent.update(this.state);
  return;
}
```

**Step 6: Update `refreshAttrs`**

Add `label`:
```typescript
this.state.attrs = {
  use12Hour: this.getAttribute("time-format") === "12",
  hideClock: this.hasAttribute("hide-clock"),
  hideWeatherText: this.hasAttribute("hide-weather-text"),
  bgColor: this.getBgColor(),
  resolvedUnits: resolveUnits(this.getAttribute("temp-unit"), this.state.store.location.country),
  timezone: this.getAttribute("timezone") || null,
  label: this.getAttribute("label") || null,
};
```

**Step 7: Update `buildDOM`**

Replace the weather text mount comment and variable name:
```typescript
// Mount info panel (outside .live-window, inside .scene)
const infoPanelContainer = document.createElement("div");
scene.appendChild(infoPanelContainer);
this.infoPanelComponent.mount(infoPanelContainer);
```

**Step 8: Remove unused import**

The `getReadableColor` import (if pulled in via WeatherTextComponent) is no longer needed. Check if `parseHexColor` and `parseComputedColor` are still used — they are (in `getBgColor`), so keep those.

**Step 9: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 10: Commit**

```
feat(live-window): wire InfoPanelComponent into LiveWindow
```

---

### Task 5: Update CSS — replace weather text styles with info panel styles

**Files:**
- Modify: `app/src/scripts/live-window/live-window.css:770-789`

**Step 1: Replace `.current-weather-text` styles with `.info-panel` styles**

Remove the entire `/* ---- Weather text ---- */` section (lines 770-789) and replace with:

```css
/* ---- Info panel ---- */

.info-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: var(--live-window-width);
  margin: var(--info-panel-margin, 12px 0);
  font-family: var(--info-panel-font, var(--primary-font));
  color: var(--info-panel-color, #ffffff);
}

.info-panel-location {
  font-size: var(--info-panel-location-size, 0.85rem);
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.02em;
}

.info-panel-coords {
  font-size: var(--info-panel-coords-size, 0.65rem);
  margin: 0;
  opacity: 0.7;
  letter-spacing: 0.04em;
}

.info-panel-weather {
  font-size: var(--info-panel-weather-size, 0.7rem);
  margin: 4px 0 0;
  letter-spacing: 0.06em;
  text-transform: var(--info-panel-weather-transform, uppercase);
}

.info-panel-location[hidden],
.info-panel-coords[hidden],
.info-panel-weather[hidden] {
  display: none;
}
```

**Step 2: Remove `--weather-text-color` from `:host`**

In the `:host` block (line 15), remove:
```css
--weather-text-color: var(--window-sky-color-default);
```

**Step 3: Run typecheck and visual check**

Run: `just app::typecheck`
Expected: PASS

**Step 4: Commit**

```
feat(live-window): replace weather text CSS with info panel styles
```

---

### Task 6: Update test page to remove external location display

**Files:**
- Modify: `app/src/pages/live-window-test.astro`

**Step 1: Add `label` attribute and remove external location markup**

Update each city's `<live-window>` to include the `label` attribute, and remove the external `<div class="text-center">` block:

```astro
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
  {
    cities.map((city) => (
      <div class="flex flex-col items-center">
        <live-window
          openweather-key={openweatherKey}
          latitude={String(city.lat)}
          longitude={String(city.lng)}
          timezone={city.tz}
          temp-unit={city.unit}
          theme="dark"
          bg-color="#030a12"
          label={city.name}
        />
      </div>
    ))
  }
</div>
```

**Step 2: Remove the `--weather-text-font` and `--weather-text-color` CSS variables**

In the `<style>` block, update the `live-window` selector to remove weather-text variables (keep the others):

```css
live-window {
  --window-color: var(--color-midnight);
  --blinds-color: var(--color-midnight);
  --clock-text-color: #e74c3c;
}
```

**Step 3: Commit**

```
feat(live-window): use label attr in test page, remove external location
```

---

### Task 7: Write tests for `InfoPanelComponent`

**Files:**
- Create: `app/src/scripts/live-window/__tests__/components/InfoPanelComponent.test.ts`
- Delete: `app/src/scripts/live-window/__tests__/components/WeatherTextComponent.test.ts`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { InfoPanelComponent } from "../../components/InfoPanelComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(overrides?: {
  hideWeatherText?: boolean;
  temp?: number;
  description?: string;
  icon?: string;
  label?: string | null;
  locationName?: string | null;
  lat?: number | null;
  lng?: number | null;
  timezone?: string | null;
}): LiveWindowState {
  const hasWeather = overrides?.temp != null;
  const store = {
    ...DEFAULT_STATE,
    location: {
      ...DEFAULT_STATE.location,
      lat: overrides?.lat ?? null,
      lng: overrides?.lng ?? null,
      name: overrides?.locationName ?? null,
    },
    weather: {
      ...DEFAULT_STATE.weather,
      units: "metric",
      current: hasWeather
        ? {
            main: "Clouds",
            description: overrides?.description ?? "scattered clouds",
            icon: overrides?.icon ?? "03d",
            temp: overrides?.temp ?? 0,
          }
        : null,
    },
  };
  return {
    store,
    computed: { phase: buildPhaseInfo(store, Date.now()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: overrides?.hideWeatherText ?? false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
      timezone: overrides?.timezone ?? null,
      label: overrides?.label ?? null,
    },
  };
}

describe("InfoPanelComponent", () => {
  let comp: InfoPanelComponent;
  let container: HTMLElement;

  beforeEach(() => {
    comp = new InfoPanelComponent();
    container = document.createElement("div");
    comp.mount(container);
  });

  describe("mount", () => {
    it("creates info panel elements on mount", () => {
      expect(container.querySelector(".info-panel")).toBeTruthy();
      expect(container.querySelector(".info-panel-location")).toBeTruthy();
      expect(container.querySelector(".info-panel-coords")).toBeTruthy();
      expect(container.querySelector(".info-panel-weather")).toBeTruthy();
    });
  });

  describe("location name", () => {
    it("shows label attribute when provided", () => {
      comp.update(makeState({ label: "New York" }));
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.textContent).toBe("New York");
      expect(el.hidden).toBe(false);
    });

    it("shows API location name when no label", () => {
      comp.update(makeState({ locationName: "Tokyo" }));
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.textContent).toBe("Tokyo");
      expect(el.hidden).toBe(false);
    });

    it("label overrides API name", () => {
      comp.update(makeState({ label: "NYC", locationName: "New York" }));
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.textContent).toBe("NYC");
    });

    it("hides location when neither label nor name available", () => {
      comp.update(makeState());
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.hidden).toBe(true);
    });
  });

  describe("coordinates", () => {
    it("shows lat/lng when available", () => {
      comp.update(makeState({ lat: 40.7128, lng: -74.006 }));
      const el = container.querySelector(".info-panel-coords") as HTMLElement;
      expect(el.textContent).toBe("40.71°, -74.01°");
      expect(el.hidden).toBe(false);
    });

    it("shows lat/lng with timezone", () => {
      comp.update(makeState({ lat: 40.7128, lng: -74.006, timezone: "America/New_York" }));
      const el = container.querySelector(".info-panel-coords") as HTMLElement;
      expect(el.textContent).toBe("40.71°, -74.01° · America/New_York");
    });

    it("hides coords when no lat/lng", () => {
      comp.update(makeState());
      const el = container.querySelector(".info-panel-coords") as HTMLElement;
      expect(el.hidden).toBe(true);
    });
  });

  describe("weather text", () => {
    it("shows weather text when weather data exists", () => {
      comp.update(makeState({ temp: 22, description: "clear sky" }));
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.textContent).toContain("22");
      expect(el.textContent).toContain("clear sky");
      expect(el.hidden).toBe(false);
    });

    it("hides weather text when no weather data", () => {
      comp.update(makeState());
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.hidden).toBe(true);
    });

    it("hides weather text when hideWeatherText is true", () => {
      comp.update(makeState({ temp: 22, hideWeatherText: true }));
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.hidden).toBe(true);
    });

    it("formats with dot separator", () => {
      comp.update(makeState({ temp: 29, description: "few clouds" }));
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.textContent).toBe("29°C · few clouds");
    });

    it("uses imperial symbol when units are imperial", () => {
      const state = makeState({ temp: 85, description: "sunny" });
      state.attrs.resolvedUnits = "imperial";
      comp.update(state);
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.textContent).toBe("85°F · sunny");
    });
  });

  describe("destroy", () => {
    it("cleans up on destroy", () => {
      comp.destroy();
      expect(container.innerHTML).toBe("");
    });
  });
});
```

**Step 2: Delete `WeatherTextComponent.test.ts`**

Remove `app/src/scripts/live-window/__tests__/components/WeatherTextComponent.test.ts`.

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 4: Fix any test fixtures in other test files**

If other tests reference `DEFAULT_STATE.location` without `name`, they may need updating. Check `api.test.ts` and `state.test.ts` — add `name: null` to any location object literals.

**Step 5: Commit**

```
test(live-window): add InfoPanelComponent tests, remove WeatherTextComponent tests
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

Run: `just app::test`
Expected: All tests pass.

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 3: Build**

Run: `just app::build`
Expected: PASS

**Step 4: Commit (if any fixes needed)**

```
fix(live-window): address final verification issues
```
