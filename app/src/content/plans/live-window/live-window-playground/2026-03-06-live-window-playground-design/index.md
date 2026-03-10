---
title: Live Window Playground — Design
description: "Create a dev-only interactive test page where all live-window
  visual states can be manually controlled: time of day, weather,
  sunrise/sunset, tick speed, and display settings."
publishedOn: 2026-03-07T00:47:44.000Z
tags:
  - design
---

# Live Window Playground — Design

## Goal

Create a dev-only interactive test page where all live-window visual states can be manually controlled: time of day, weather, sunrise/sunset, tick speed, and display settings.

## File Changes

### Move existing test page
- `app/src/pages/live-window-test.astro` → `app/src/pages/dev/live-window-test.astro`

### New files
- `app/src/pages/dev/live-window-playground.astro` — interactive test page with controls sidebar

### Modified files
- `app/src/scripts/live-window/LiveWindow.ts` — add override attributes + virtual clock logic

## New `<live-window>` Override Attributes

| Attribute | Format | Effect |
|---|---|---|
| `override-time` | `"HH:MM"` | Freezes window at this time of day |
| `override-weather` | Icon code (e.g. `"10d"`) | Overrides weather condition rendering |
| `override-weather-description` | e.g. `"heavy rain"` | Overrides intensity multiplier |
| `override-sunrise` | `"HH:MM"` | Overrides sunrise for phase/arc calculations |
| `override-sunset` | `"HH:MM"` | Overrides sunset for phase/arc calculations |
| `tick-speed` | Number (e.g. `"720"`) | Time multiplier for virtual clock |

When override attributes are set, they take precedence over API-fetched and real-time values.

## Approach: Override Attributes (Approach A)

Override attributes extend the existing `observedAttributes` pattern. Inside the component:

- `refreshComputed()` checks for `override-time`. If set, constructs a timestamp for today at that HH:MM and uses it as `now` instead of `Date.now()`.
- `override-sunrise` / `override-sunset` are parsed as HH:MM strings into timestamps for today and injected into `store.weather.sunrise` / `store.weather.sunset` before phase calculations.
- `override-weather` / `override-weather-description` inject directly into the weather portion of state, bypassing the API.
- When `tick-speed` is set, a virtual clock system takes over (see below).

## Virtual Clock System

When `tick-speed` > 1 and playing:

1. Component records `startRealTime = Date.now()` and `startVirtualTime` (from `override-time` or current real time).
2. Each update cycle: `virtualNow = startVirtualTime + (Date.now() - startRealTime) * tickSpeed`.
3. `virtualNow` replaces `Date.now()` in `refreshComputed()`.
4. Clock display, sky phases, sun/moon positions, star visibility all use `virtualNow`.
5. When virtual clock wraps past midnight, it loops to 00:00 (same day — sunrise/sunset stay fixed).
6. When paused, `virtualNow` freezes. Unpausing resets `startRealTime` to now.

Clock interval stays at 1s real-time. At 720x the clock ticks ~12 minutes per second; full day cycle in ~2 minutes.

## Playground Page Layout

Right sidebar layout:
- Left: single `<live-window>` component, vertically centered
- Right: scrollable controls panel

### Control Groups

**Time**
- Time slider: 0:00–23:59, displays current time. Dragging sets `override-time`.
- Phase quick-jump buttons: 16 buttons for each named phase (night, astronomical dawn, nautical dawn, civil dawn, sunrise, golden hour AM, early morning, late morning, midday, early afternoon, late afternoon, golden hour PM, sunset, civil dusk, nautical dusk, astronomical dusk).

**Tick Speed**
- Slider: 1x–1000x
- Preset buttons: 1x, 10x, 100x, 720x
- Play/pause button to start/stop virtual clock advancing

**Weather**
- Condition picker: clear, few clouds, scattered clouds, broken clouds, drizzle, rain, thunderstorm, snow, mist. Day/night suffix (d/n) auto-set based on current time.
- Intensity dropdown: light, default, heavy, very heavy, extreme

**Sun/Moon**
- Sunrise time input (HH:MM), defaults to 06:00
- Sunset time input (HH:MM), defaults to 18:00

**Display Settings**
- theme_toggle: light / dark
- clock_visibility_toggle: show / hide
- time_format_toggle: 12h / 24h
- weather_text_visibility_toggle: show / hide
- temp_unit_toggle: °C / °F

**Reset**
- Reset all button: clears all overrides back to real-time defaults

## Dev-Only Guard

Both `/dev/live-window-test` and `/dev/live-window-playground` redirect to `/404` in production via `import.meta.env.PROD` check (same pattern as existing test page).
