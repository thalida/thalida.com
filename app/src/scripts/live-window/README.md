# `<live-window>` Web Component

An animated window that shows a real-time sky gradient, weather effects,
clock, and temperature. Uses Shadow DOM for full style isolation — drop
it into any page without conflicts.


## Quick Start

Include the component script and add the element to your HTML:

```html
<script src="live-window.ts"></script>
<!-- or the built JS file -->
<script src="live-window.js"></script>

<live-window api-url="https://your-api.example.com"></live-window>
```

The `api-url` attribute is optional. Without it the component still renders a
time-based sky gradient and clock — it just won't show real weather data.


## Attributes

| Attribute | Values | Default | Description |
| --- | --- | --- | --- |
| `api-url` | URL string | _(none)_ | API Worker base URL (geolocation + weather) |
| `time-format` | `"12"` / `"24"` | `"24"` | Clock display format (12h shows AM/PM) |
| `temp-unit` | `"F"` / `"C"` / `"auto"` | `"auto"` | Temp unit; `"auto"` uses user country |
| `hide-clock` | boolean attribute | _(absent)_ | Hides the clock when present |
| `hide-weather-text` | boolean attribute | _(absent)_ | Hides the weather text when present |
| `theme` | `"light"` / `"dark"` / `"auto"` | `"auto"` | Color theme; `"auto"` follows OS pref |

All attributes are reactive — changing them at runtime immediately
updates the component.


## CSS Custom Properties

Override these on the `<live-window>` element to customise appearance:

| Property                     | Default                    | Description                     |
| ---------------------------- | -------------------------- | ------------------------------- |
| `--live-window-height`       | `385px`                    | Window height                   |
| `--live-window-width`        | `256px`                    | Window width                    |
| `--window-color`             | `#c4b5a0`                  | Window frame color              |
| `--window-clock-bg`          | `#1a1a2e`                  | Clock background color          |
| `--window-sky-color-default` | `#0e1a3a`                  | Fallback sky color              |
| `--color-text-red`           | `#e74c3c`                  | Accent color (clock digits)     |
| `--weather-text-color`       | `#1a1a2e` / `#e0e0e0`      | Weather text color (light/dark) |
| `--primary-font`             | `system-ui, sans-serif`    | Base font                       |
| `--clock-font`               | `"Squada One", sans-serif` | Clock font                      |
| `--weather-text-font`        | inherits `--primary-font`  | Weather text font               |


## How It Works


### Sky Gradient

The sky color is a 4-stop vertical gradient (`zenith → upper → lower → horizon`)
that transitions through 16 color phases across the day — from deep
night through dawn, sunrise, morning, midday, afternoon, golden hour,
sunset, dusk, and back to night. When weather data is available,
sunrise and sunset times from the API anchor the phase boundaries.
Without weather data, fixed hour-of-day offsets are used as a fallback.


### SkyLayer System

The sky is rendered by composable **layers** that stack inside the
`.sky` container. Each layer implements the `SceneComponent` interface
(`mount`, `update`, `destroy`) and receives a `PhaseInfo` object on
every update with the current time, phase index, interpolation factor,
sun position, and weather data.

Current layers (bottom to top):

1. **GradientLayer** — renders the sky color gradient
2. **StarsLayer** — renders procedurally generated stars with twinkle animation
3. **SunLayer** — positions the sun along a celestial arc
4. **MoonLayer** — positions the moon with lunar phase shadow
5. **WeatherLayer** — renders clouds, rain, snow, lightning, mist

Adding a new layer:

1. Create `components/sky/<Name>Layer.ts` implementing `SceneComponent`
2. Register it in the `children` array in `SkyComponent.ts`
3. Add styles to `live-window.css`


### Weather Effects

When an API URL is provided:

1. **Geolocation** — The Worker's `/location` endpoint determines the
   user's lat/lng and country code.
2. **Weather fetch** — The Worker's `/weather` endpoint returns current
   conditions, temperature, sunrise, and sunset.
3. **Visual effects** — The weather icon code maps to CSS-animated
   overlays: clouds (sm/md/lg), rain droplets, lightning flashes,
   snow, and mist.
4. **Weather text** — Displays
   "It's {temp}{unit} and {condition}" below the window.


### Temperature Units

The `temp-unit` attribute controls which units are sent to the
weather API (`units=metric` or `units=imperial`). In `"auto"`
mode, the country code from the location API is checked against a list of
imperial countries (US, Liberia, Myanmar). The resolved unit is also
cached — if the unit changes (e.g. user switches from auto to
explicit), stale cached data is invalidated and a fresh fetch is made.


### Clock

Updates every second. In 24-hour mode, displays `HH:MM`. In 12-hour
mode, displays `h:MM` with a stacked AM/PM indicator where the active
period is highlighted.


### Blinds Animation

On first load (once the sky gradient is computed), the blinds play an
opening animation: slats rotate and collapse upward over ~3 seconds.


### Caching & Rate Limits

API responses are cached in `localStorage` under the key
`liveWindowStore` with a version stamp (`_v`). Location is cached for
30 minutes, weather for 30 minutes (or until the date changes, or the
temperature unit changes). Bumping `CACHE_VERSION` in the source
invalidates all existing caches.


### Theming (Dark / Light Mode)

The component supports dark and light color themes. By default
(`theme="auto"` or no attribute), it follows the user's OS preference
via `prefers-color-scheme`. Setting `theme="dark"` or `theme="light"`
forces a specific mode regardless of OS settings.

Theme-sensitive properties that change between modes:

| Property                     | Light     | Dark      |
| ---------------------------- | --------- | --------- |
| `--window-color`             | `#2a2a3e` | `#c4b5a0` |
| `--window-clock-bg`          | `#1a1a2e` | `#0d0d1a` |
| `--window-sky-color-default` | `#0e1a3a` | `#060d1f` |
| `--weather-text-color`       | `#1a1a2e` | `#f0f0f0` |

All of these can be overridden via CSS custom properties on the host
element for full control.


### Default Font

The component auto-loads [Squada One][sq1] from Google Fonts into the
host document's `<head>` (Shadow DOM cannot load `@font-face` rules
internally). This only happens once per page. If you override
`clock-font` with your own font, you're responsible for loading it on
the host page.

[sq1]: https://fonts.google.com/specimen/Squada+One


## Files

| File                                | Purpose                                              |
| ----------------------------------- | ---------------------------------------------------- |
| `LiveWindow.ts`                     | Web Component orchestrator, lifecycle, intervals     |
| `live-window.css`                   | All styles (loaded into Shadow DOM via `<link>`)     |
| `types.ts`                          | Shared interfaces: RGB, SkyGradient, PhaseInfo, etc. |
| `state.ts`                          | localStorage persistence, cache versioning           |
| `api.ts`                            | Location + weather fetch via Worker + rate limiting  |
| `components/ClockComponent.ts`      | Clock rendering + time format logic                  |
| `components/BlindsComponent.ts`     | Blinds animation + rendering                         |
| `components/InfoPanelComponent.ts`  | Location, weather text, and coords display           |
| `components/SkyComponent.ts`        | Sky layer orchestrator (ordering + lifecycle)        |
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


## Example

```html
<live-window api-url="https://api.example.com" time-format="12" temp-unit="auto"></live-window>

<style>
  live-window {
    --clock-font: "Roboto Mono", monospace;
    --weather-text-font: "Georgia", serif;
  }
</style>
```

```html
<!-- Minimal: sky + clock only, no weather -->
<live-window hide-weather-text></live-window>
```

```html
<!-- Sky only, no clock or text -->
<live-window hide-clock hide-weather-text></live-window>
```

```html
<!-- Force dark mode -->
<live-window theme="dark"></live-window>

<!-- Force light mode -->
<live-window theme="light"></live-window>

<!-- Follow OS preference (default) -->
<live-window></live-window>
```
