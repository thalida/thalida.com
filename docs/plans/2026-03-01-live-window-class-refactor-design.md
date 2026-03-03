# Live Window Class-Based Refactor Design

## Goal

Refactor the `<live-window>` web component into a class-based architecture where each scene part (sky, blinds, clock, weather text) is a self-contained class implementing a shared `SceneComponent` interface. Move utilities (color, phase calculations, sky gradient math) into a `utils/` folder. Merge state into a single `LiveWindowState` with clearly separated sections.

## Current State

The previous refactor (2026-03-01-live-window-refactor-design.md) extracted modules from a monolithic class and introduced a `SkyLayer` interface for sky layers. The codebase now has:

- `live-window.ts` — orchestrator (~290 lines), still manages DOM building, element caching, and wiring for clock/blinds/weather text
- `layers/gradient.ts` — `GradientLayer` implementing `SkyLayer`
- `layers/weather.ts` — `WeatherLayer` implementing `SkyLayer`
- `clock.ts` — standalone functions, state managed externally
- `blinds.ts` — standalone functions + `BlindsState`, state managed externally
- `color.ts`, `phase-info.ts`, `state.ts`, `api.ts` — utility/helper modules at root level

## Design Decisions

1. **Unified `SceneComponent` interface** — all scene parts (sky, blinds, clock, weather text) implement the same `mount/update/destroy` contract. The old `SkyLayer` interface is removed; `GradientLayer` and `WeatherLayer` implement `SceneComponent` directly.

2. **Merged `LiveWindowState`** — instead of separate `StoreState` (persistence) and `SceneContext` (render data), a single `LiveWindowState` with labeled sections: `store` (persisted), `computed` (derived each cycle), `ref` (written by components), `attrs` (from DOM attributes).

3. **`SkyComponent` composite** — a `SceneComponent` that internally manages `GradientLayer` and `WeatherLayer` as child `SceneComponent`s. Keeps the sky layer composition encapsulated.

4. **`utils/` folder** — pure functions (`color.ts`, `phase.ts`, `sky-gradient.ts`) move out of the root into a dedicated folder.

## Unified State: `LiveWindowState`

```ts
export interface LiveWindowState {
  /** Persisted to localStorage — API cache data */
  store: {
    location: {
      lat: number | null;
      lng: number | null;
      country: string | null;
      lastFetched: number | null;
    };
    weather: {
      current: WeatherCurrent | null;
      sunrise: number | null;
      sunset: number | null;
      units: string | null;
      lastFetched: number | null;
    };
  };

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
```

- `saveState()` serializes only `state.store` to localStorage
- `loadState()` restores `state.store`, initializes `computed`/`ref`/`attrs` to defaults
- Components receive the full `LiveWindowState` and read from whichever section they need
- Components write to `state.ref` during `update()` — update order matters

## SceneComponent Interface

```ts
export interface SceneComponent {
  /** Create DOM elements inside the provided container */
  mount(container: HTMLElement): void;
  /** Called by the orchestrator at the component's update cadence */
  update(state: LiveWindowState): void;
  /** Tear down DOM and release resources */
  destroy(): void;
}
```

## Component Breakdown

| Class | File | Responsibility | Update Behavior |
|---|---|---|---|
| `SkyComponent` | `components/SkyComponent.ts` | Mounts `.sky` container, creates GradientLayer + WeatherLayer as children | Forwards `update()` to children in order |
| `GradientLayer` | `components/sky/GradientLayer.ts` | Renders 4-stop CSS gradient based on phase | Recalculates gradient from `state.computed.phase`, writes to `state.ref.currentGradient` |
| `WeatherLayer` | `components/sky/WeatherLayer.ts` | Renders clouds/rain/snow/mist HTML | Rebuilds HTML from `state.computed.phase.weather.icon` |
| `BlindsComponent` | `components/BlindsComponent.ts` | Owns blinds slats + strings, runs open animation | Animates once on first `update()`, then no-ops |
| `ClockComponent` | `components/ClockComponent.ts` | Owns clock HTML, updates time display | Reads `state.attrs.use12Hour`, updates text every tick |
| `WeatherTextComponent` | `components/WeatherTextComponent.ts` | Owns weather description text + contrast color | Reads weather from `state.store`, gradient from `state.ref`, computes readable color |

### SkyComponent as Composite

```ts
class SkyComponent implements SceneComponent {
  private children: SceneComponent[] = [new GradientLayer(), new WeatherLayer()];

  mount(container: HTMLElement) {
    container.className = "sky";
    for (const child of this.children) {
      const div = document.createElement("div");
      container.appendChild(div);
      child.mount(div);
    }
  }

  update(state: LiveWindowState) {
    for (const child of this.children) child.update(state);
  }

  destroy() {
    for (const child of this.children) child.destroy();
  }
}
```

### Component Update Order

The orchestrator calls `update()` in this order to ensure `state.ref` is populated before downstream consumers read it:

1. `SkyComponent` (GradientLayer writes `state.ref.currentGradient`, then WeatherLayer)
2. `BlindsComponent`
3. `ClockComponent`
4. `WeatherTextComponent` (reads `state.ref.currentGradient` for contrast calculation)

## File Structure

```
live-window/
├── components/
│   ├── sky/
│   │   ├── GradientLayer.ts       # SceneComponent, writes state.ref.currentGradient
│   │   └── WeatherLayer.ts        # SceneComponent, renders weather effects
│   ├── SkyComponent.ts            # composite: mounts .sky, forwards to children
│   ├── BlindsComponent.ts         # SceneComponent, owns slats + strings + animation
│   ├── ClockComponent.ts          # SceneComponent, owns clock HTML + time display
│   └── WeatherTextComponent.ts    # SceneComponent, owns weather description text
├── utils/
│   ├── color.ts                   # parseHex, luminance, contrastRatio, getReadableColor
│   ├── phase.ts                   # buildPhaseInfo, calculateSunPosition (renamed from phase-info.ts)
│   └── sky-gradient.ts            # SKY_PHASES, calculatePhaseTimestamps, getCurrentSkyGradient, blend*
├── __tests__/                     # existing tests, updated for new imports
│   ├── layers/
│   │   └── weather.test.ts
│   ├── api.test.ts
│   ├── color.test.ts
│   ├── phase-info.test.ts
│   ├── sky-gradient.test.ts
│   └── state.test.ts
├── types.ts                       # RGB, SkyGradient, PhaseInfo, LiveWindowState, SceneComponent, etc.
├── state.ts                       # loadState, saveState (serializes only state.store)
├── api.ts                         # fetchLocation, fetchWeather, rate-limit guards
├── LiveWindow.ts                  # slim orchestrator web component (~100-150 lines)
└── live-window.css                # unchanged
```

## Orchestrator (LiveWindow.ts)

The refactored orchestrator handles only:
- Shadow DOM setup and stylesheet loading
- Instantiating components: `[SkyComponent, BlindsComponent, ClockComponent, WeatherTextComponent]`
- Building `LiveWindowState` (reading attributes, computing phase)
- Interval management (clock every 1s, sky every 15min, weather every 60min)
- Calling `update(state)` on components in defined order
- Attribute change handling (delegates to re-computing attrs + triggering updates)
- Custom event dispatch (`live-window:clock-update`, `live-window:weather-update`)
- API fetch orchestration (calls api.ts, updates `state.store`, saves to localStorage)

Each component builds its own HTML in `mount()` — the orchestrator does NOT build any component DOM.

## What Moves Where

| Current File | Destination | Notes |
|---|---|---|
| `color.ts` | `utils/color.ts` | Move as-is |
| `phase-info.ts` | `utils/phase.ts` | Rename |
| `layers/gradient.ts` (pure functions) | `utils/sky-gradient.ts` | Extract `SKY_PHASES`, `calculatePhaseTimestamps`, `blendGradient`, etc. |
| `layers/gradient.ts` (GradientLayer class) | `components/sky/GradientLayer.ts` | Rewrite to implement `SceneComponent` |
| `layers/weather.ts` | `components/sky/WeatherLayer.ts` | Rewrite to implement `SceneComponent` |
| `clock.ts` | `components/ClockComponent.ts` | Wrap in class, own its HTML |
| `blinds.ts` | `components/BlindsComponent.ts` | Wrap in class, own its HTML + animation |
| Weather text logic (in live-window.ts) | `components/WeatherTextComponent.ts` | Extract into new class |
| `live-window.ts` | `LiveWindow.ts` | Slim down to orchestrator only |
| `state.ts` | `state.ts` | Update to serialize only `state.store` portion of `LiveWindowState` |
| `api.ts` | `api.ts` | Update types to use `LiveWindowState['store']` |
| `types.ts` | `types.ts` | Add `SceneComponent`, `LiveWindowState`; remove `SkyLayer` |

## Test Strategy

Existing tests update import paths but logic stays the same. New component classes can be tested by:
- Providing a container element + mock `LiveWindowState`
- Calling `mount()`, then `update()`, then asserting DOM contents
- No additional test files required in this refactor (existing coverage carries over)
