# `<live-window>` Web Component

An animated window that shows a real-time sky gradient, weather effects, clock, and temperature. Uses Shadow DOM for full style isolation — drop it into any page without conflicts.

## Quick Start

Include the component script and add the element to your HTML:

```html
<script src="live-window.ts"></script>
<!-- or the built JS file -->
<script src="live-window.js"></script>

<live-window openweather-key="YOUR_OPENWEATHER_KEY" ipregistry-key="YOUR_IPREGISTRY_KEY"></live-window>
```

Both API keys are optional. Without them the component still renders a time-based sky gradient and clock — it just won't show real weather data.

## Attributes

| Attribute           | Values                            | Default    | Description                                                                                          |
| ------------------- | --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `openweather-key`   | API key string                    | _(none)_   | [OpenWeather](https://openweathermap.org/api) API key for weather data                               |
| `ipregistry-key`    | API key string                    | _(none)_   | [IP Registry](https://ipregistry.co/) API key for geolocation                                        |
| `time-format`       | `"12"` \| `"24"`                  | `"24"`     | Clock display format. In 12-hour mode an AM/PM indicator appears                                     |
| `temp-unit`         | `"F"` \| `"C"` \| `"auto"`        | `"auto"`   | Temperature unit. `"auto"` uses the user's country (imperial for US, LR, MM; metric everywhere else) |
| `hide-clock`        | boolean attribute                 | _(absent)_ | Hides the clock when present                                                                         |
| `hide-weather-text` | boolean attribute                 | _(absent)_ | Hides the weather description text when present                                                      |
| `theme`             | `"light"` \| `"dark"` \| `"auto"` | `"auto"`   | Color theme. `"auto"` follows the user's OS preference via `prefers-color-scheme`                    |

All attributes are reactive — changing them at runtime immediately updates the component.

## CSS Custom Properties

Override these on the `<live-window>` element to customise appearance:

| Property                     | Default                                | Description                               |
| ---------------------------- | -------------------------------------- | ----------------------------------------- |
| `--live-window-height`       | `385px`                                | Window height                             |
| `--live-window-width`        | `256px`                                | Window width                              |
| `--window-color`             | `#c4b5a0`                              | Window frame color                        |
| `--window-clock-bg`          | `#1a1a2e`                              | Clock background color                    |
| `--window-sky-color-default` | `#0e1a3a`                              | Fallback sky color before data loads      |
| `--color-text-red`           | `#e74c3c`                              | Accent color (clock digits, active AM/PM) |
| `--weather-text-color`       | `#1a1a2e` (light) / `#e0e0e0` (dark)   | Weather description text color            |
| `--primary-font`             | `system-ui, -apple-system, sans-serif` | Base font                                 |
| `--clock-font`               | `"Squada One", sans-serif`             | Clock font                                |
| `--weather-text-font`        | inherits `--primary-font`              | Weather description text font             |

## How It Works

### Sky Gradient

The sky color is a smooth gradient that transitions through 8 color phases across the day (midnight → dawn → sunrise → midday → afternoon → dusk → sunset → night). When weather data is available, sunrise and sunset times from the API define the phase boundaries. Without weather data, a simpler hour-of-day mapping is used as a fallback.

### Weather Effects

When an OpenWeather API key and IP Registry key are both provided:

1. **Geolocation** — IP Registry determines the user's lat/lng and country code.
2. **Weather fetch** — OpenWeather returns current conditions, temperature, sunrise, and sunset.
3. **Visual effects** — The weather icon code maps to CSS-animated overlays: clouds (sm/md/lg), rain droplets, lightning flashes, snow, and mist.
4. **Weather text** — Displays "It's {temp}{unit} and {condition}" below the window.

### Temperature Units

The `temp-unit` attribute controls which units are sent to the OpenWeather API (`units=metric` or `units=imperial`). In `"auto"` mode, the country code from IP Registry is checked against a list of imperial countries (US, Liberia, Myanmar). The resolved unit is also cached — if the unit changes (e.g. user switches from auto to explicit), stale cached data is invalidated and a fresh fetch is made.

### Clock

Updates every second. In 24-hour mode, displays `HH:MM`. In 12-hour mode, displays `h:MM` with a stacked AM/PM indicator where the active period is highlighted.

### Blinds Animation

On first load (once the sky gradient is computed), the blinds play an opening animation: slats rotate and collapse upward over ~3 seconds.

### Caching & Rate Limits

API responses are cached in `localStorage` under the key `liveWindowStore` with a version stamp (`_v`). Location is cached for 30 minutes, weather for 30 minutes (or until the date changes, or the temperature unit changes). Bumping `CACHE_VERSION` in the source invalidates all existing caches.

### Theming (Dark / Light Mode)

The component supports dark and light color themes. By default (`theme="auto"` or no attribute), it follows the user's OS preference via `prefers-color-scheme`. Setting `theme="dark"` or `theme="light"` forces a specific mode regardless of OS settings.

Theme-sensitive properties that change between modes:

| Property                     | Light                  | Dark                    |
| ---------------------------- | ---------------------- | ----------------------- |
| `--window-color`             | `#2a2a3e` (dark frame) | `#c4b5a0` (light frame) |
| `--window-clock-bg`          | `#1a1a2e`              | `#0d0d1a`               |
| `--window-sky-color-default` | `#0e1a3a`              | `#060d1f`               |
| `--weather-text-color`       | `#1a1a2e` (dark text)  | `#f0f0f0` (white text)  |

All of these can be overridden via CSS custom properties on the host element for full control.

### Default Font

The component auto-loads [Squada One](https://fonts.google.com/specimen/Squada+One) from Google Fonts into the host document's `<head>` (Shadow DOM cannot load `@font-face` rules internally). This only happens once per page. If you override `clock-font` with your own font, you're responsible for loading it on the host page.

## Files

| File              | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `live-window.ts`  | Web Component class, all logic                   |
| `live-window.css` | All styles (loaded into Shadow DOM via `<link>`) |

## Example

```html
<live-window openweather-key="abc123" ipregistry-key="xyz789" time-format="12" temp-unit="auto"></live-window>

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
