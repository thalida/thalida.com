---
title: Live Window Test Page — Design
description: Add optional `latitude`/`longitude`/`timezone` attributes to
  `<live-window>` so it can render any location without IP geolocation. Create a
  test page displaying 8 world cities side-by-side with real weather data and
  local clocks.
publishedOn: 2026-03-03T04:03:02.000Z
tags:
  - design
---

# Live Window Test Page — Design

## Goal

Add optional `latitude`/`longitude`/`timezone` attributes to `<live-window>` so it can render any location without IP geolocation. Create a test page displaying 8 world cities side-by-side with real weather data and local clocks.

## Changes to `<live-window>` Web Component

### New Attributes

| Attribute   | Type   | Default | Effect                                              |
|-------------|--------|---------|------------------------------------------------------|
| `latitude`  | number | —       | Override IP-based latitude                           |
| `longitude` | number | —       | Override IP-based longitude                          |
| `timezone`  | string | —       | IANA timezone (e.g., `"Asia/Tokyo"`) for local time  |

### Behavior

- **When `latitude` + `longitude` are set**: Skip `fetchLocation()` entirely. Inject the coordinates directly into `state.store.location` before weather fetching.
- **When `timezone` is set**: The `ClockComponent` uses `Intl.DateTimeFormat` with the `timeZone` option to display the correct local time. Phase calculations (`buildPhaseInfo`) receive a timezone-adjusted "now" timestamp.
- **When neither is set**: Existing IP-based flow — no breaking changes.

### Implementation Details

**Timezone-adjusted time**: Compute a shifted `now` value by comparing UTC offsets:
```ts
function getTimezoneAdjustedNow(timezone: string): number {
  const now = new Date();
  const localOffset = now.getTimezoneOffset() * 60_000;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value, 10);
  const targetDate = new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return targetDate.getTime();
}
```

**State isolation**: Instances with explicit lat/lng skip localStorage read/write to avoid cross-contamination between the homepage's IP-based instance and test page instances.

**Country code**: Not needed. Test page sets `temp-unit` explicitly. When lat/lng is provided without ipregistry key, `resolveUnits` defaults to metric.

### Files Modified

- `app/src/scripts/live-window/LiveWindow.ts` — add attributes to `observedAttributes`, handle in `attributeChangedCallback`, inject lat/lng before weather fetch, pass timezone through state
- `app/src/scripts/live-window/types.ts` — add `timezone: string | null` to `LiveWindowState.attrs`
- `app/src/scripts/live-window/components/ClockComponent.ts` — use timezone for time display when provided
- `app/src/scripts/live-window/utils/phase.ts` — accept optional timezone-adjusted `now`
- `app/src/scripts/live-window/state.ts` — `createDefaultState` adds timezone attr default

## Test Page

### Route

`app/src/pages/live-window-test.astro` — accessible at `/live-window-test`

### Cities

| City       | Latitude | Longitude | Timezone              |
|------------|----------|-----------|-----------------------|
| Tokyo      | 35.6762  | 139.6503  | Asia/Tokyo            |
| Reykjavik  | 64.1466  | -21.9426  | Atlantic/Reykjavik    |
| Sydney     | -33.8688 | 151.2093  | Australia/Sydney      |
| São Paulo  | -23.5505 | -46.6333  | America/Sao_Paulo     |
| New York   | 40.7128  | -74.0060  | America/New_York      |
| Cairo      | 30.0444  | 31.2357   | Africa/Cairo          |
| London     | 51.5074  | -0.1278   | Europe/London         |
| Mumbai     | 19.0760  | 72.8777   | Asia/Kolkata          |

### Layout

Responsive grid: 1 column mobile, 2 columns tablet, 3-4 columns desktop. Each card shows:
- City name and country
- Coordinates (small text)
- `<live-window>` instance with lat/lng/timezone attributes
- Real weather via OpenWeatherMap API (same key as homepage)

### Styling

Uses existing project layout (`BaseLayout`) and Tailwind utilities. Dark background (`#030a12`) to match homepage context.
