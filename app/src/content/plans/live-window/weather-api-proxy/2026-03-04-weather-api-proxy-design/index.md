---
title: "Design: Proxy OpenWeather API through Cloudflare Worker"
description: The OpenWeather API key is exposed client-side via
  `PUBLIC_OPENWEATHER_KEY`. Move the call behind the Cloudflare Worker, matching
  the pattern used for IP Registry geolocation.
publishedOn: 2026-03-05T02:58:48.000Z
tags:
  - design
---

# Design: Proxy OpenWeather API through Cloudflare Worker

## Problem

The OpenWeather API key is exposed client-side via `PUBLIC_OPENWEATHER_KEY`. Move the call behind the Cloudflare Worker, matching the pattern used for IP Registry geolocation.

## Design

### API (Cloudflare Worker)

New endpoint: `GET /weather?lat={lat}&lon={lon}&units={units}`

- `handleWeather()` in `api.ts` validates query params, calls `https://api.openweathermap.org/data/2.5/weather` with `env.OPENWEATHER_KEY`
- Returns normalized response:
  ```json
  {
    "main": "Clouds",
    "description": "overcast clouds",
    "icon": "04d",
    "temp": 72,
    "sunrise": 1709553600,
    "sunset": 1709594400
  }
  ```
- Route added in `index.ts` following existing pattern
- New secret `OPENWEATHER_KEY` added to `Env` type and `.dev.vars.example`

### App (Frontend)

- `fetchWeather()` in `api.ts` calls `${apiUrl}/weather?lat=...&lon=...&units=...` instead of OpenWeather directly
- Remove `PUBLIC_OPENWEATHER_KEY` from `.env.example` and all references
- Remove `owKey` parameter threading through `LiveWindow.ts` → `fetchWeather()`

### Unchanged

- Rate limiting (client-side, 30-min interval)
- Weather data consumers (WeatherLayer, InfoPanel)
- CORS config
