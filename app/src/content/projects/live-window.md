---
title: Live Window
description: An interactive sky simulation showing real-time weather, sun, moon, and stars for any location on Earth.
publishedOn: 2026-03-07
tags: [typescript, web-component, canvas, weather, astro]
category: website
---

> [!NOTE]
> This post was co-written with Claude (AI). The live window itself
> was built collaboratively — Thalida designed the vision and user
> experience, Claude helped with implementation, architecture, and
> writing this post.

| Links |  |
| --- | --- |
| [Github →](https://github.com/thalida/thalida.com) | [Playground →](https://thalida.com/playground/live-window) |


## What Is It?

The live window is a custom web component (`<live-window>`) that
renders a miniature animated scene of the sky based on your actual
location, weather, and time of day. It lives on the homepage of
[thalida.com](https://thalida.com) and simulates the full day cycle:
sunrise gradients, procedural stars, accurate sun positioning, real
moon phases, and animated weather effects like rain, snow, fog, and
thunderstorms.


## The Playground

The live window has a [public playground](/playground/live-window)
— an interactive page where anyone can experiment with every
setting:

- **Location**: Pick from preset cities, search by name, or
  enter coordinates manually
- **Weather**: Override with any of 40+ conditions
  (clear skies to volcanic ash)
- **Time of day**: Scrub through the full 24-hour cycle or jump
  to specific phases like golden hour, civil dusk, or midnight
- **Tick speed**: Fast-forward time at up to 1000x to watch
  the sky transition through an entire day
- **Sun & Moon**: Override sunrise/sunset times and moon phase
- **Display**: Toggle the clock, switch between 12h/24h format

Everything persists in the URL, so you can share a specific sky
configuration with someone.


## How It Works

The live window is vanilla TypeScript — no framework, just the
Web Components API. The sky is built as a stack of independent
layers, each responsible for one visual element:

| Layer | What It Does |
| --- | --- |
| **Gradient** | Four-color sky gradient that shifts based on time of day |
| **Stars** | 200+ procedurally placed stars that fade with daylight |
| **Sun** | Disk with atmospheric halo, positioned by real sunrise/sunset data |
| **Moon** | Accurate phase rendering using the synodic month (29.53 days) |
| **Weather** | Animated particles for rain, snow, drizzle, fog, and more |
| **Blinds** | Window blinds that open/close on interaction |
| **Clock** | Digital clock showing local time for the selected location |

This modular architecture means each layer can be developed,
tested, and rendered independently.


### Attribute-Driven Configuration

The component observes HTML attributes, so embedding it is just:

```html
<live-window
  api-url="https://api.thalida.com"
  latitude="40.7128"
  longitude="-74.0060"
  theme="dark"
></live-window>
```

Override attributes (`override-time`, `override-weather`,
`override-moon-phase`, etc.) power the
[playground](/playground/live-window) — the same mechanism that
makes it configurable for testing makes it configurable for play.


### Location & Weather

When no coordinates are provided, the live window uses IP-based
geolocation to determine where you are. Weather data comes from
the [OpenWeatherMap API](https://openweathermap.org/api), proxied
through a Cloudflare Worker to keep API keys server-side. The
[playground's](/playground/live-window) city search uses
[Nominatim](https://nominatim.openstreetmap.org/) for geocoding.


### Celestial Math

The sun's position is calculated from real sunrise and sunset
times for the given location. The moon phase uses a single
astronomical constant — the synodic month of 29.53 days — and
one known new moon epoch:

```typescript
const SYNODIC_MS = 29.53059 * 24 * 60 * 60 * 1000;
const NEW_MOON_EPOCH = Date.UTC(2025, 0, 29, 12, 36);

export function getMoonPhase(now: number): number {
  const elapsed = now - NEW_MOON_EPOCH;
  const phase = (elapsed / SYNODIC_MS) % 1;
  return phase < 0 ? phase + 1 : phase;
}
```

One epoch, one constant, and a modulo. That's the entire moon
phase tracker.


### The 16 Day Phases

The sky doesn't just flip between "day" and "night." The gradient,
star visibility, and lighting shift across 16 distinct phases:

Night → Astronomical Dawn → Nautical Dawn → Civil Dawn →
Sunrise → Golden Hour AM → Early Morning → Late Morning →
Midday → Early Afternoon → Late Afternoon → Golden Hour PM →
Sunset → Civil Dusk → Nautical Dusk → Astronomical Dusk

Each phase has its own color palette and transition behavior, so
the sky feels continuous rather than stepped.


## Ideas & Future Work

- [ ] Accessibility improvements for the playground controls
- [ ] More weather visualizations (aurora borealis, sandstorms)
- [ ] Embeddable version for other sites
- [ ] Seasonal variations (autumn leaves, spring blossoms)


## How It's Made


### Frameworks, Tools, and Services

- **Language**: TypeScript (vanilla, no framework)
- **Component**: Custom HTML Element (Web Components API)
- **Rendering**: Canvas-based sky layers
- **Testing**: Vitest
- **Build**: [Astro](https://astro.build/)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)


### Credits

- [OpenWeatherMap API](https://openweathermap.org/api) — weather
  data, sunrise/sunset times
- [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/)
  — city search in the playground
- [ipregistry](https://ipregistry.co/) — IP-based geolocation
