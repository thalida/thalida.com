---
title: Weather Code Audit & Distinct Rendering Design
description: >-
  The live window has 50 weather codes (OpenWeatherMap IDs) but many render
  identically or near-identically:
publishedOn: 2026-03-07T05:28:23.000Z
subcategory: weather-code-audit
category: live-window
tags: [design]
---

# Weather Code Audit & Distinct Rendering Design

## Problem

The live window has 50 weather codes (OpenWeatherMap IDs) but many render identically or near-identically:
- 803/804 (broken/overcast clouds) are the same config
- 751/761 (sand/dust) use the same atmosphere config
- All atmosphere effects (mist, fog, smoke, haze, dust, sand, volcanic ash, squalls, tornado) are just colored blurred overlays with no unique character
- Intensity grades within the same precip type differ only by particle count
- Shower variants look identical to non-shower variants
- Lightning is rudimentary (yellow rectangle) with no variation across thunderstorm intensities
- Squalls (771) and tornado (781) have no precipitation or wind effects

## Solution: 4 New Visual Mechanisms

### 1. Wind Levels on Precipitation

Three wind animation variants that add horizontal drift to falling particles:

| Level | Lateral Shift | Used For |
|-------|--------------|----------|
| `light` | ±3% | Showers (520-522, 620-622, 612-613, 313, 321) |
| `moderate` | ±8% | Heavy showers (522, 622, 314), severe storms (202, 232, 503) |
| `strong` | ±15% | Squalls (771), tornado (781), extreme rain (504) |

Implementation: New CSS `@keyframes` variants of `precipitate` with X translation. Applied by changing `animation-name` on `.droplets`.

### 2. Atmosphere Particles

New blurred circle elements with 3 motion types, rendered in the atmosphere zone:

| Config | Weather | Motion | Count | Size (px) | Color | Opacity |
|--------|---------|--------|-------|-----------|-------|---------|
| mistWisps | 701 Mist | float | 6 | 20-45 | #d0d0d0 | 12-30% |
| fogBanks | 741 Fog | float | 4 | 35-70 | #c0c0c0 | 25-50% |
| smokeWisps | 711 Smoke | float | 10 | 25-55 | #7a6548 | 18-40% |
| dustSwirl | 761 Dust | swirl | 20 | 2-5 | #a08860 | 30-55% |
| sandSwirl | 751 Sand | swirl | 28 | 2-4 | #c4a050 | 40-65% |
| ashFall | 762 Volcanic ash | fall | 18 | 3-6 | #444 | 35-65% |
| debrisSwirl | 781 Tornado | swirl | 15 | 3-8 | #5a5040 | 30-55% |
| iceGlint | 511 Freezing rain | float | 12 | 1-3 | #e0f0ff | 40-80% |

Motion types:
- **float**: Slow horizontal oscillation (10-18s) — for mist/fog/smoke wisps
- **swirl**: Circular/erratic paths (3-6s) — for dust/sand/debris
- **fall**: Slow downward descent (6-8s) — for volcanic ash

### 3. Intensity-Differentiated Precip Configs

6 new precip configs to distinguish intensity grades beyond just particle count:

| Config | Count | Speed | Size (px) | Aspect | Color | Opacity | Sway |
|--------|-------|-------|-----------|--------|-------|---------|------|
| drizzleLight | 16 | 10s | 1-2 | 2.5 | #28afff | 30-55% | no |
| drizzleHeavy | 28 | 6s | 2-4 | 2.5 | #28afff | 55-80% | no |
| showerDrizzle | 25 | 4s | 2-3 | 3 | #28afff | 45-70% | no |
| heavyRain | 42 | 1.8s | 4-5 | 2.5 | #28afff | 80-100% | no |
| extremeRain | 50 | 1.2s | 4-6 | 2 | #28afff | 85-100% | no |
| showerSleet | 35 | 3s | 3-6 | 1 | #a0cfff | 55-90% | yes |

### 4. Lightning Redesign

Replace the rudimentary yellow rectangle with proper bolt shapes using CSS `clip-path`, glow effects, and 3 intensity variants:

| Variant | Bolt Size | Cycle | Glow | Visual |
|---------|-----------|-------|------|--------|
| distant | Small | 4s, single dim flash | Subtle yellow shadow | Single thin bolt, no branches |
| standard | Medium | 2.5s, single flash | Moderate yellow glow | Bolt with one branch |
| intense | Large | 1.5s, double-flash | Bright white-yellow glow | Primary bolt + secondary bolt |

Bolt shapes via `clip-path: polygon(...)` to create jagged zigzag paths.
Glow via `box-shadow` and `filter: brightness()`.

## Code-by-Code Changes

### 800+ Clear/Clouds
- 800: Clear → no change
- 801: Few clouds → no change
- 802: Scattered → no change
- 803: Broken → no change
- **804: Overcast → `storm` density (9 clouds vs 803's 6)**

### 7xx Atmosphere
- **701 Mist**: + mistWisps particles
- **711 Smoke**: + smokeWisps particles
- 721 Haze: no change (uniform by nature)
- **731 Dust whirls**: + dustSwirl particles
- **741 Fog**: + fogBanks particles
- **751 Sand**: New overlay (#c4a050, 0.30 opacity, 3 layers) + sandSwirl particles
- **761 Dust**: New overlay (#8a7560, 0.22 opacity, 2 layers) + dustSwirl particles
- **762 Volcanic ash**: + ashFall particles
- **771 Squall**: + heavyRain precip + strong wind
- **781 Tornado**: → storm clouds + extremeRain + strong wind + debrisSwirl particles

### 6xx Snow
- 600-602, 611, 615-616: no change
- **612 Light shower sleet**: → showerSleet×0.6 + light wind
- **613 Shower sleet**: → showerSleet + light wind
- **620 Light shower snow**: + light wind
- **621 Shower snow**: + light wind
- **622 Heavy shower snow**: + moderate wind

### 5xx Rain
- 500-501: no change
- **502 Heavy rain**: → heavyRain (bigger drops)
- **503 Very heavy rain**: → heavyRain×1.3 + light wind
- **504 Extreme rain**: → extremeRain + storm clouds + moderate wind + stormDark atmosphere
- **511 Freezing rain**: + iceGlint particles
- **520 Light shower rain**: + light wind
- **521 Shower rain**: + light wind
- **522 Heavy shower rain**: + moderate wind
- 531: no change

### 3xx Drizzle
- **300 Light drizzle**: → drizzleLight + light clouds
- 301: no change
- **302 Heavy drizzle**: → drizzleHeavy
- 310-311: no change
- **312 Heavy drizzle rain**: → drizzleHeavy×0.8 + rain×0.7
- **313 Shower rain+drizzle**: + light wind
- **314 Heavy shower rain+drizzle**: + moderate wind, drizzleHeavy
- **321 Shower drizzle**: → showerDrizzle + light wind

### 2xx Thunderstorm
- **200 Light rain+thunder**: → distant lightning
- 201: → standard lightning
- **202 Heavy rain+thunder**: → heavyRain + intense lightning + moderate wind
- **210 Light thunder**: → distant lightning
- 211: → standard lightning
- **212 Heavy thunder**: → intense lightning
- 221: → standard lightning
- 230: → standard lightning
- 231: → standard lightning
- **232 Heavy drizzle+thunder**: → intense lightning + moderate wind

## Files Modified

1. `app/src/scripts/live-window/components/sky/WeatherLayer.ts` — All config and rendering changes
2. `app/src/scripts/live-window/live-window.css` — New keyframes and classes
3. `app/src/scripts/live-window/types.ts` — Updated interfaces (if needed)

## Testing

Use the playground at `/dev/live-window-playground` to cycle through all 50 weather codes and verify each has a visually distinct rendering.
