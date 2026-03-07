# Weather ID System Design

Refactor live-window to use OpenWeatherMap weather condition IDs (200-804) instead of icon codes for granular visual control.

## Decisions

- **Mapping architecture**: Flat config map — one `WEATHER_EFFECTS` entry per weather ID (~50 entries)
- **Override API**: `override-weather` accepts numeric weather IDs (e.g., `"615"`) instead of icon codes
- **Mixed precipitation**: Dual particle layers — render two independent precipitation types simultaneously
- **Atmosphere effects**: Distinct color + density tiers for each 7xx condition
- **Playground**: Grouped `<optgroup>` dropdown with all conditions; intensity dropdown removed

## API Changes

Add `id` (numeric weather condition code) to the API proxy response in `api/src/proxy.ts`.

```
{ id: 615, main: "Snow", description: "light rain and snow", icon: "13d", temp: 2, sunrise: ..., sunset: ... }
```

Frontend types `WeatherCurrent` and `WeatherInfo` gain `id: number | null`. The `icon` field is kept for day/night detection.

`override-weather-description` attribute is removed (intensity is baked into weather IDs). `override-weather` changes from icon codes to numeric IDs.

## New Types

```ts
interface WeatherEffectConfig {
  clouds: "none" | "light" | "medium" | "heavy";
  precip: PrecipLayer[];
  lightning: boolean;
  atmosphere: AtmosphereConfig | null;
  snowAccumulation: boolean;
}

interface PrecipLayer {
  type: string;           // key into PRECIP_CONFIG
  intensityScale: number; // multiplier on base particle count
}

interface AtmosphereConfig {
  color: string;   // hex
  opacity: number; // 0-1
  layers: number;  // 1-3
}
```

## Precipitation Configs

Keep existing: `lightRain`, `rain`, `thunderstorm`, `snow`, `sleet`

New types:
- `drizzle` — smaller drops, slower, lower opacity
- `showerRain` — slightly faster/more intense than rain
- `freezingRain` — blue-white drops, slightly slower (icy feel)
- `lightSnow` — fewer, smaller flakes
- `heavySnow` — more, larger flakes
- `showerSnow` — fast-falling dense snow

## Atmosphere Tiers

| Condition | Color | Opacity | Layers | Feel |
|-----------|-------|---------|--------|------|
| Mist (701) | `#c8c8c8` grey | 0.15 | 2 | Light, translucent |
| Fog (741) | `#b0b0b0` grey | 0.35 | 3 | Dense, obscuring |
| Smoke (711) | `#8b7355` brown-grey | 0.3 | 3 | Warm, heavy |
| Haze (721) | `#d4c89a` warm yellow-grey | 0.2 | 2 | Warm, diffuse |
| Dust (761) / Sand (751) | `#c4a86a` tan | 0.25 | 2 | Sandy, warm |
| Dust whirls (731) | `#c4a86a` tan | 0.35 | 3 | Dense, swirling |
| Volcanic ash (762) | `#555555` dark grey | 0.4 | 3 | Dark, oppressive |
| Squalls (771) | `#888888` grey | 0.3 | 3 | Grey, turbulent |
| Tornado (781) | `#666666` dark grey | 0.45 | 3 | Very dark, dense |

## Full Weather ID Mapping

### 2xx: Thunderstorm

| ID | Clouds | Precip | Lightning |
|----|--------|--------|-----------|
| 200 | heavy | `[lightRain × 0.6]` | yes |
| 201 | heavy | `[rain × 1.0]` | yes |
| 202 | heavy | `[rain × 1.4]` | yes |
| 210 | heavy | `[]` | yes |
| 211 | heavy | `[]` | yes |
| 212 | heavy | `[]` | yes |
| 221 | heavy | `[]` | yes |
| 230 | heavy | `[drizzle × 0.6]` | yes |
| 231 | heavy | `[drizzle × 1.0]` | yes |
| 232 | heavy | `[drizzle × 1.4]` | yes |

### 3xx: Drizzle

| ID | Clouds | Precip |
|----|--------|--------|
| 300 | medium | `[drizzle × 0.6]` |
| 301 | medium | `[drizzle × 1.0]` |
| 302 | medium | `[drizzle × 1.4]` |
| 310 | medium | `[drizzle × 0.6, lightRain × 0.4]` |
| 311 | medium | `[drizzle × 0.7, lightRain × 0.7]` |
| 312 | medium | `[drizzle × 1.0, rain × 0.7]` |
| 313 | medium | `[showerRain × 0.7, drizzle × 0.5]` |
| 314 | heavy | `[showerRain × 1.2, drizzle × 0.6]` |
| 321 | medium | `[drizzle × 1.2]` |

### 5xx: Rain

| ID | Clouds | Precip | Notes |
|----|--------|--------|-------|
| 500 | medium | `[lightRain × 0.6]` | |
| 501 | medium | `[rain × 1.0]` | |
| 502 | heavy | `[rain × 1.4]` | |
| 503 | heavy | `[rain × 1.6]` | |
| 504 | heavy | `[rain × 1.8]` | |
| 511 | heavy | `[freezingRain × 1.0]` | + snow accumulation |
| 520 | medium | `[showerRain × 0.6]` | |
| 521 | medium | `[showerRain × 1.0]` | |
| 522 | heavy | `[showerRain × 1.4]` | |
| 531 | medium | `[showerRain × 1.0]` | |

### 6xx: Snow

| ID | Clouds | Precip | Accumulation |
|----|--------|--------|-------------|
| 600 | medium | `[lightSnow × 0.6]` | yes |
| 601 | medium | `[snow × 1.0]` | yes |
| 602 | heavy | `[heavySnow × 1.4]` | yes |
| 611 | medium | `[sleet × 1.0]` | no |
| 612 | medium | `[sleet × 0.6]` | no |
| 613 | medium | `[sleet × 1.2]` | no |
| 615 | medium | `[lightRain × 0.5, lightSnow × 0.5]` | yes |
| 616 | heavy | `[rain × 0.7, snow × 0.7]` | yes |
| 620 | medium | `[showerSnow × 0.6]` | yes |
| 621 | medium | `[showerSnow × 1.0]` | yes |
| 622 | heavy | `[showerSnow × 1.4]` | yes |

### 7xx: Atmosphere

| ID | Clouds | Atmosphere config key |
|----|--------|-----------------------|
| 701 | none | mist |
| 711 | none | smoke |
| 721 | none | haze |
| 731 | none | dustWhirls |
| 741 | none | fog |
| 751 | none | dust |
| 761 | none | dust |
| 762 | none | volcanicAsh |
| 771 | heavy | squalls |
| 781 | heavy | tornado |

### 800+: Clear & Clouds

| ID | Clouds |
|----|--------|
| 800 | none |
| 801 | light |
| 802 | medium |
| 803 | heavy |
| 804 | heavy |

## Rendering Changes

`WeatherLayer.update()` changes from icon-based to ID-based lookup:

1. **Clouds**: `config.clouds` level → render appropriate cloud divs (none/light/medium/heavy)
2. **Precipitation**: Loop over `config.precip[]` — each layer gets a separate `.droplets` container with its own particle config and intensity
3. **Atmosphere**: Render `.atmosphere-layer` divs with dynamic `background` and `opacity` inline styles
4. **Lightning**: Rendered when `config.lightning === true`
5. **Snow accumulation**: Rendered when `config.snowAccumulation === true`

### CSS Renames

- `.mist` → `.atmosphere-layer`
- `.mist-lg` → `.atmosphere-lg`
- `.mist-md` → `.atmosphere-md`
- `.mist-sm` → `.atmosphere-sm`
- `mist-roll` animation → `atmosphere-roll`
- `.weather-{icon}` CSS classes → `.weather-{id}` (for thunderstorm dark clouds, etc.)

### Removed

- `ICON_WEATHER_MAP` — replaced by `WEATHER_EFFECTS`
- `intensityMultiplier()` function — intensity baked into weather ID configs
- `override-weather-description` attribute — no longer needed

## Playground Updates

- Replace condition dropdown with `<optgroup>`-based select showing all 50+ conditions grouped by category
- Remove intensity dropdown (intensity inherent in weather IDs)
- `override-weather` attribute set to numeric ID (e.g., `"615"`)
- Remove `override-weather-description` attribute usage

## Test Impact

- `weather.test.ts`: Rewrite to test ID-based lookup, dual precipitation layers, atmosphere rendering, new precip types
- `overrides.test.ts`: Update override-weather tests for numeric IDs, remove override-weather-description tests
- `helpers.ts`: Update `makeTestState()` for new `WeatherInfo.id` field
- API tests: Add `id` field to weather response tests
