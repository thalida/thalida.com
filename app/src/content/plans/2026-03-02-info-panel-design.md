---
title: Info Panel Design
description: >-
  Replace `WeatherTextComponent` with a combined `InfoPanelComponent` that
  displays location, coordinates/timezone, and weather info inside the
  live-window shadow DOM. Use static white text instead of the current dynamic
  WCAG-contrast color.
publishedOn: 2026-03-03T05:02:48.000Z
planType: design
topic: info-panel
category: layout
---

# Info Panel Design

## Goal

Replace `WeatherTextComponent` with a combined `InfoPanelComponent` that displays location, coordinates/timezone, and weather info inside the live-window shadow DOM. Use static white text instead of the current dynamic WCAG-contrast color.

## Current State

- `WeatherTextComponent` renders weather text below the window with dynamic neon color
- Location info (city name, lat/lng, timezone) is rendered externally by the host page
- The component has no knowledge of city name — only uses lat/lng/timezone internally

## Design

### New `InfoPanelComponent`

Replaces `WeatherTextComponent`. Renders three sections below the window:

1. **City name** — from `label` attribute (if provided), else from weather API `data.name`, else hidden
2. **Coordinates + timezone** — `40.71°, -74.01° · America/New_York`
3. **Weather text** — `29°F · few clouds` (static white, no glow)

### Data Flow

- `label` attribute: optional, observed. Overrides API-derived city name
- Weather API (`/data/2.5/weather`): already returns `data.name` (city name) — store it in `StoreState.location.name`
- Lat/lng: read from `state.store.location`
- Timezone: read from `state.attrs.timezone`

### Styling

- Static white color (`--info-text-color: #ffffff` default)
- No dynamic WCAG contrast calculation
- No neon glow text-shadow
- Remove `getReadableColor` import from this component
- CSS classes: `.info-panel`, `.info-panel-location`, `.info-panel-coords`, `.info-panel-weather`

### Type Changes

- Add `name: string | null` to `StoreState.location`
- Add `label: string | null` to `LiveWindowState.attrs`

### API Changes

- `fetchWeather`: extract `data.name` into `state.location.name`
- `fetchLocation` (IP registry): extract city name if available from `data.location.city`
- New observed attribute: `label`

### Files Changed

| File | Change |
|------|--------|
| `components/WeatherTextComponent.ts` | Delete |
| `components/InfoPanelComponent.ts` | Create (replacement) |
| `LiveWindow.ts` | Swap component, add `label` to observed attrs |
| `types.ts` | Add `name` to location, `label` to attrs |
| `api.ts` | Extract `data.name` from weather response, city from IP response |
| `state.ts` | Add `name: null` to DEFAULT_STATE location |
| `live-window.css` | Replace `.current-weather-text` with `.info-panel` styles |
| `__tests__/components/WeatherTextComponent.test.ts` | Delete |
| `__tests__/components/InfoPanelComponent.test.ts` | Create (replacement) |
| `live-window-test.astro` | Remove external location display (now inside component) |
