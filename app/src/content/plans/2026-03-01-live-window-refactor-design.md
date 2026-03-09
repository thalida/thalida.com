---
title: Live Window Refactor Design
description: >-
  Refactor the `<live-window>` web component from a monolithic 700-line class
  into focused modules with a `SkyLayer` interface, making it easy to add
  time-aware celestial features (stars, moon, sun) in the future.
publishedOn: 2026-03-02T02:53:15.000Z
planType: design
topic: live-window-refactor
category: live-window
---

# Live Window Refactor Design

## Goal

Refactor the `<live-window>` web component from a monolithic 700-line class into focused modules with a `SkyLayer` interface, making it easy to add time-aware celestial features (stars, moon, sun) in the future.

## Current State

- `live-window.ts` (702 lines) — god class handling sky, weather, clock, blinds, API, state, and color math
- `sky-gradient.ts` (320 lines) — already extracted, handles phase calculation and gradient interpolation
- `live-window.css` (720 lines) — all styles in one file
- Tests only cover `sky-gradient.ts` (24 tests)

## Design Decisions

- **Approach A: Module extraction with SkyLayer interface** — chosen over flat extraction (no contract for layers) and web component composition (over-engineered for single-use component)
- **Full extraction scope** — sky layers, clock, blinds, API/state, and color utilities all get their own modules
- **Time-aware layers** — layers respond to time/phase data, sun position, and weather conditions

## Shared Types

### types.ts

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
  altitude: number;   // 0 at horizon, ~90 at zenith
  azimuth: number;    // 0=N, 90=E, 180=S, 270=W
  progress: number;   // 0=sunrise, 0.5=solar noon, 1=sunset, -1=night
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
  t: number;                // interpolation factor 0-1 within current phase
  isDaytime: boolean;
  sun: SunPosition;
  weather: WeatherInfo;
}

export interface SkyLayer {
  mount(container: HTMLElement): void;
  update(phase: PhaseInfo): void;
  destroy(): void;
}
```

`PhaseInfo` is the key data contract. It gives every layer the full context about time, sky phase, sun position, and weather without coupling layers to each other or to API internals.

## Module Breakdown

### File Structure

```
live-window/
  layers/
    gradient.ts         — GradientLayer (SkyLayer), keeps pure functions from sky-gradient.ts
    weather.ts          — WeatherLayer (SkyLayer), extracted from renderWeatherEffects()
  __tests__/
    color.test.ts       — luminance, contrast, readable color
    state.test.ts       — load/save, cache version
    api.test.ts         — rate limiting, state updates (mock fetch)
    sky-gradient.test.ts — stays as-is
    phase-info.test.ts  — buildPhaseInfo with various inputs
    layers/
      gradient.test.ts  — GradientLayer mount/update/destroy
      weather.test.ts   — WeatherLayer renders correct HTML per icon
  types.ts              — RGB, SkyGradient, PhaseInfo, SkyLayer, etc.
  color.ts              — WCAG contrast, luminance, getReadableColor (pure functions)
  state.ts              — localStorage persistence, cache versioning
  api.ts                — IP geolocation + OpenWeather fetch + rate limiting
  clock.ts              — clock rendering + time format logic
  blinds.ts             — blinds animation + rendering
  phase-info.ts         — buildPhaseInfo() pure function
  live-window.ts        — slim orchestrator (~150-200 lines)
  live-window.css       — stays as-is
```

### Module Responsibilities

**color.ts** — Pure utility functions, no class dependencies:
- `relativeLuminance(c: RGB): number`
- `contrastRatio(a: RGB, b: RGB): number`
- `getReadableColor(color: RGB, bg: RGB, minContrast?: number): RGB`
- `parseHexColor(hex: string): RGB | null`
- `parseComputedColor(computed: string): RGB | null`

**state.ts** — localStorage persistence:
- `StoreState` interface (moved from main class)
- `DEFAULT_STATE` constant
- `loadState(): StoreState`
- `saveState(state: StoreState): void`
- Cache version logic (`CACHE_VERSION`, version migration)

**api.ts** — API integration as pure state transforms:
- `fetchLocation(key: string, state: StoreState): Promise<StoreState>`
- `fetchWeather(owKey: string, ipKey: string, state: StoreState, units: string): Promise<StoreState>`
- `shouldFetchLocation(state: StoreState): boolean`
- `shouldFetchWeather(state: StoreState, units: string): boolean`
- Rate limit constants (`IP_RATE_LIMIT`, `WEATHER_RATE_LIMIT`)

Functions take state in, return updated state. No side effects — the orchestrator saves.

**clock.ts** — Clock rendering:
- `ClockElements` interface (refs to hour/minute/ampm elements)
- `renderClock(els: ClockElements, use12Hour: boolean): { hour: number; minute: number }`

**blinds.ts** — Blinds animation:
- `BlindsState` type
- `renderBlinds(el: HTMLElement, state: BlindsState, numBlinds: number): void`
- `runBlindsAnimation(state: BlindsState, render: () => void): Promise<void>`
- Transform helpers (`getSkewAndRotateTransform`, `getSkewOnlyTransform`)

**phase-info.ts** — Phase computation:
- `buildPhaseInfo(state: StoreState, now: number): PhaseInfo`
- `calculateSunPosition(now: number, sunrise: number, sunset: number): SunPosition`
- Imports from `layers/gradient.ts` for phase timestamp calculation

**layers/gradient.ts** — Sky gradient layer:
- `SKY_PHASES`, `calculatePhaseTimestamps`, `blendGradient`, `blendColor` — pure functions (preserved for testing)
- `GradientLayer` class implementing `SkyLayer`
- Public `currentGradient: SkyGradient | null` property (read by orchestrator for text color)

**layers/weather.ts** — Weather effects layer:
- `WeatherLayer` class implementing `SkyLayer`
- `ICON_WEATHER_MAP` constant
- HTML building logic from `renderWeatherEffects()`

## Layer Lifecycle

### Registration & Render Order

Layers are registered in the orchestrator constructor in bottom-to-top order:

```ts
this.layers = [
  new GradientLayer(),   // bottom: sky color
  new WeatherLayer(),    // above: clouds, rain, etc.
  // Future: new StarsLayer(), new MoonLayer(), new SunLayer()
];
```

### Mount (in buildDOM)

Each layer gets its own container div inside `.sky`:

```ts
for (const layer of this.layers) {
  const container = document.createElement('div');
  container.className = 'sky-layer';
  this.skyEl.appendChild(container);
  layer.mount(container);
}
```

### Update (every 15 min or on weather fetch)

```ts
private updateSky() {
  const phase = buildPhaseInfo(this.state, Date.now());
  for (const layer of this.layers) {
    layer.update(phase);
  }
  // Read gradient colors for weather text
  const gradientLayer = this.layers[0] as GradientLayer;
  if (gradientLayer.currentGradient) {
    this.updateWeatherTextColor(gradientLayer.currentGradient);
  }
}
```

### Cleanup (in disconnectedCallback)

```ts
for (const layer of this.layers) {
  layer.destroy();
}
```

## Orchestrator (live-window.ts)

The refactored main class (~150-200 lines) handles only:
- Shadow DOM setup and `buildDOM()`
- Layer registration and lifecycle
- Interval management (clock every 1s, sky every 15min, weather every 60min)
- Attribute change handling
- Delegating to imported modules (clock, blinds, API, state)
- Custom event dispatch (`live-window:clock-update`, `live-window:weather-update`)

## Test Strategy

New test files targeting the extracted modules:
- `color.test.ts` — luminance, contrast ratio, readable color edge cases
- `state.test.ts` — load/save round-trip, cache version migration, corrupt data
- `api.test.ts` — rate limiting checks, state transformation (mock fetch)
- `phase-info.test.ts` — `buildPhaseInfo` with day/night/twilight times, sun position
- `layers/gradient.test.ts` — GradientLayer DOM creation and update
- `layers/weather.test.ts` — correct HTML output for each weather icon code

Existing `sky-gradient.test.ts` stays as-is since the pure functions don't change.

## Future Extensibility

Adding a new celestial feature (e.g., stars):
1. Create `layers/stars.ts` implementing `SkyLayer`
2. Use `PhaseInfo.isDaytime`, `PhaseInfo.sun.altitude`, and `PhaseInfo.t` to control visibility/brightness
3. Register in the orchestrator's layer array
4. Add CSS to `live-window.css` (or a co-located stylesheet)
5. Add tests in `__tests__/layers/stars.test.ts`

No changes needed to the orchestrator, other modules, or existing layers.
