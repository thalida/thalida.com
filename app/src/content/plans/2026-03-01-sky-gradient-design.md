---
title: "Sky Gradient Revamp — Design"
description: "Replace the live window's 8-color flat gradient system with a 16-phase, 4-stop vertical gradient that matches real-world sky appearance based on sunrise, sunset, and twilight phases."
publishedOn: 2026-03-01
planType: "design"
topic: "sky-gradient"
status: "completed"
---

# Sky Gradient Revamp — Design

## Goal

Replace the live window's 8-color flat gradient system with a 16-phase, 4-stop vertical gradient that matches real-world sky appearance based on sunrise, sunset, and twilight phases.

## Approach: Phase-Based Keyframe System

Define 16 named sky phases, each with a 4-stop vertical gradient (zenith → upper sky → lower sky → horizon). At any moment, find the two adjacent phases bracketing the current time and interpolate all 4 stops.

## Sky Phases

| # | Phase | Timing | Character |
|---|-------|--------|-----------|
| 1 | Night | Full darkness | Near-black deep blue |
| 2 | Astronomical Dawn | ~90min before sunrise | First faint glow, very dark |
| 3 | Nautical Dawn | ~60min before sunrise | Dark blue, purple hints on horizon |
| 4 | Civil Dawn | ~30min before sunrise | Blues & lavender, warm rose horizon |
| 5 | Sunrise | Sunrise moment | Peach-pink sky, orange-gold horizon |
| 6 | Golden Hour AM | ~30min after sunrise | Warm light, golden horizon, blue zenith |
| 7 | Early Morning | ~1-2hr after sunrise | Light blue, fading warmth at horizon |
| 8 | Late Morning | Midpoint sunrise→solar noon | Brightening blue, clean horizon |
| 9 | Midday | Solar noon (midpoint sunrise-sunset) | Brightest blue, pale horizon |
| 10 | Early Afternoon | After solar noon | Slightly warmer blue |
| 11 | Late Afternoon | ~2hr before sunset | Warmer tones creeping in |
| 12 | Golden Hour PM | ~1hr before sunset | Warm golden light, deepening sky |
| 13 | Sunset | Sunset moment | Deep orange-red horizon, purple sky |
| 14 | Civil Dusk | ~30min after sunset | Rose-purple sky, deep orange horizon |
| 15 | Nautical Dusk | ~60min after sunset | Deep purple-blue, muted horizon |
| 16 | Astronomical Dusk | ~90min after sunset | Nearly night, faint purple glow |

Each phase defines 4 RGB color stops: `{ zenith, upper, lower, horizon }`.

## Gradient Structure

Each sky gradient is a 4-stop CSS gradient rendered top-to-bottom:

```css
linear-gradient(180deg, zenith, upperSky, lowerSky, horizon)
```

## Twilight Time Calculation

From OpenWeather's `sunrise` and `sunset` timestamps, derive all phase times:

- Civil twilight: ±30 minutes from sunrise/sunset
- Nautical twilight: ±60 minutes from sunrise/sunset
- Astronomical twilight: ±90 minutes from sunrise/sunset
- Golden hour: ±30 minutes from sunrise/sunset (daylight side)
- Solar noon: Midpoint of sunrise and sunset

Daytime phases (early morning through late afternoon) divide proportionally between golden hour AM end and golden hour PM start.

**Fallback:** When no weather data is available, assume sunrise=6:00 and sunset=18:00.

## Interpolation

At any given time:

1. Calculate all 16 phase timestamps from sunrise/sunset
2. Find the two adjacent phases bracketing current time
3. Calculate progress `t` (0→1) between them
4. Interpolate all 4 gradient stops between the two phases
5. Render the 4-stop gradient

The "1 hour lookback" trick from the current implementation is removed — we render the current sky state directly.

## Code Changes

### File: `app/src/scripts/live-window/live-window.ts`

**Removed:**
- `TIME_COLORS` array (8 flat RGB values)
- `SUNRISE_COLOR_IDX`, `SUNSET_COLOR_IDX` constants
- `getRealisticColor()` — single-color lookup
- `getRealisticColorGradient()` — 2-color gradient with lookback
- `getColorGradient()` — fallback 2-color gradient
- `gradient` field type `{start: RGB | null, end: RGB | null}`

**Added:**
- `SkyGradient` type — `{ zenith: RGB; upper: RGB; lower: RGB; horizon: RGB }`
- `SKY_PHASES` — 16 entries, each with a name and `SkyGradient`
- `calculatePhaseTimestamps(sunrise: number, sunset: number): number[]` — all 16 phase times
- `getCurrentSkyGradient(): SkyGradient` — finds phase pair, interpolates
- `getDefaultSunTimes(): { sunrise: number; sunset: number }` — 6:00/18:00 fallback

**Modified:**
- `gradient` field → `SkyGradient | null`
- `renderSkyColor()` → renders 4-stop gradient
- `updateGradient()` → simplified, single path for both real and fallback data
- `getReadableColor()` call site → passes horizon color for contrast check

**Unchanged:** Blinds logic, weather effects, clock, API fetching, state persistence, DOM structure.

## Scope

- Sun position only — no weather condition effects on gradient
- No new API calls or dependencies
- No CSS file changes needed (gradient is set via inline style)
