# Weather ID System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace icon-based weather mapping with OpenWeatherMap condition ID-based system for granular visual control of all 50+ weather conditions.

**Architecture:** Flat config map (`WEATHER_EFFECTS`) mapping every weather ID to a `WeatherEffectConfig` with clouds, precipitation layers, lightning, atmosphere, and snow accumulation. Dual particle layers for mixed precipitation. Dynamic atmosphere styling for 7xx conditions. API proxy passes through the weather `id` field.

**Tech Stack:** TypeScript web component, Vitest, Astro playground, Cloudflare Worker API proxy

**Design doc:** `docs/plans/2026-03-06-weather-id-system-design.md`

**Test command:** `just app::test`
**API test command:** `just api::test`
**Typecheck commands:** `just app::typecheck` and `just api::typecheck`

---

### Task 1: Add weather `id` to API proxy

**Files:**
- Modify: `api/src/proxy.ts:91-108`
- Test: `api/src/__tests__/index.test.ts:219-235`

**Step 1: Write the failing test**

In `api/src/__tests__/index.test.ts`, update the weather success test (line 228-235) to expect `id` in the response:

```typescript
expect(body).toMatchObject({
  id: 800,
  main: "Clear",
  description: "clear sky",
  icon: "01d",
  temp: 22.5,
  sunrise: 1700000000,
  sunset: 1700040000,
});
```

Also update the mock response (line 220) to include `id`:

```typescript
weather: [{ id: 800, main: "Clear", description: "clear sky", icon: "01d" }],
```

**Step 2: Run test to verify it fails**

Run: `just api::test`
Expected: FAIL — response body missing `id` field

**Step 3: Implement the change**

In `api/src/proxy.ts`, update the response type (line 91-92) and response body (line 97-108):

Type (line 91):
```typescript
const data = (await res.json()) as {
  weather?: Array<{ id?: number; main?: string; description?: string; icon?: string }>;
  main?: { temp?: number };
  sys?: { sunrise?: number; sunset?: number };
};
```

Response body (line 97-108):
```typescript
return jsonResponse(
  {
    id: data.weather?.[0]?.id ?? null,
    main: data.weather?.[0]?.main ?? null,
    description: data.weather?.[0]?.description ?? null,
    icon: data.weather?.[0]?.icon ?? null,
    temp: data.main?.temp ?? null,
    sunrise: data.sys?.sunrise ?? null,
    sunset: data.sys?.sunset ?? null,
  },
  200,
  corsHeaders,
);
```

**Step 4: Run tests to verify they pass**

Run: `just api::test`
Expected: PASS

**Step 5: Commit**

```bash
git add api/src/proxy.ts api/src/__tests__/index.test.ts
git commit -m "feat(api): add weather condition id to API response"
```

---

### Task 2: Add `id` to frontend types

**Files:**
- Modify: `app/src/scripts/live-window/types.ts:23-28` (WeatherInfo)
- Modify: `app/src/scripts/live-window/types.ts:43-48` (WeatherCurrent)
- Modify: `app/src/scripts/live-window/utils/phase.ts:60-66` (buildPhaseInfo)
- Modify: `app/src/scripts/live-window/api.ts:83-97` (fetchWeather)
- Modify: `app/src/scripts/live-window/__tests__/helpers.ts:63-65` (makeTestState attrs)

**Step 1: Update types**

In `types.ts`, add `id` to both interfaces:

`WeatherInfo` (line 23-28):
```typescript
export interface WeatherInfo {
  id: number | null;
  icon: string | null;
  main: string | null;
  description: string | null;
  temp: number | null;
}
```

`WeatherCurrent` (line 43-48):
```typescript
export interface WeatherCurrent {
  id: number;
  main: string;
  description: string;
  icon: string;
  temp: number;
}
```

Remove `overrideWeatherDescription` from `LiveWindowState.attrs` (line 101-102). Remove the field entirely. The interface should no longer have `overrideWeatherDescription`.

**Step 2: Update buildPhaseInfo**

In `utils/phase.ts` (line 60-66), add `id` to the WeatherInfo construction:

```typescript
const weather: WeatherInfo = {
  id: current?.id ?? null,
  icon: current?.icon ?? null,
  main: current?.main ?? null,
  description: current?.description ?? null,
  temp: current?.temp ?? null,
};
```

**Step 3: Update fetchWeather**

In `api.ts` (line 83-97), add `id` to the stored current object:

```typescript
current: {
  id: typeof data.id === "number" ? data.id : 0,
  main: typeof data.main === "string" ? data.main : "",
  description: typeof data.description === "string" ? data.description : "",
  icon: typeof data.icon === "string" ? data.icon : "",
  temp: typeof data.temp === "number" ? data.temp : 0,
},
```

**Step 4: Update test helper**

In `__tests__/helpers.ts` (line 63-65), remove `overrideWeatherDescription: null,` from the attrs object.

**Step 5: Run tests and typecheck**

Run: `just app::typecheck`
Expected: May show errors in files that reference `overrideWeatherDescription` — those will be fixed in Task 3.

Run: `just app::test`
Expected: Some tests may fail due to removed `overrideWeatherDescription` — fixed in Task 3.

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/types.ts app/src/scripts/live-window/utils/phase.ts app/src/scripts/live-window/api.ts app/src/scripts/live-window/__tests__/helpers.ts
git commit -m "feat: add weather id to frontend types, remove overrideWeatherDescription"
```

---

### Task 3: Remove `override-weather-description` from LiveWindow

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts:15-33` (observedAttributes)
- Modify: `app/src/scripts/live-window/LiveWindow.ts:82-96` (attributeChangedCallback)
- Modify: `app/src/scripts/live-window/LiveWindow.ts:168-187` (refreshAttrs)
- Modify: `app/src/scripts/live-window/LiveWindow.ts:189-250` (refreshComputed)
- Modify: `app/src/scripts/live-window/__tests__/overrides.test.ts`

**Step 1: Update observedAttributes**

Remove `"override-weather-description"` from `observedAttributes` (line 29).

**Step 2: Update attributeChangedCallback**

Remove `name === "override-weather-description"` from the condition (line 88).

**Step 3: Update refreshAttrs**

Remove `overrideWeatherDescription` from attrs (line 182). It no longer exists in the type.

**Step 4: Update refreshComputed to use weather IDs**

Replace the weather override block (lines 220-247) with ID-based logic:

```typescript
// Apply weather overrides
if (overrideWeather) {
  const weatherId = parseInt(overrideWeather, 10);
  const isDaytime = now >= (store.weather.sunrise ?? 0) && now <= (store.weather.sunset ?? 0);
  // Derive icon from weather ID group for day/night
  const iconMap: Record<number, string> = {
    2: "11", 3: "09", 5: "10", 6: "13", 7: "50", 8: "01",
  };
  const group = Math.floor(weatherId / 100);
  const iconBase = iconMap[group] ?? "01";
  // Special cases for cloud coverage
  let icon: string;
  if (weatherId === 800) icon = "01";
  else if (weatherId === 801) icon = "02";
  else if (weatherId === 802) icon = "03";
  else if (weatherId === 803 || weatherId === 804) icon = "04";
  else icon = iconBase;

  store = {
    ...store,
    weather: {
      ...store.weather,
      current: {
        id: weatherId,
        main: overrideWeather,
        description: "",
        icon: icon + (isDaytime ? "d" : "n"),
        temp: store.weather.current?.temp ?? 20,
      },
    },
  };
}
```

Note: Remove the entire `else if (overrideWeatherDescription ...)` branch since that attribute no longer exists.

**Step 5: Update override tests**

In `__tests__/overrides.test.ts`, update the weather override test to use weather IDs:

```typescript
describe("override-weather", () => {
  it("injects weather id into phase info", () => {
    const state = makeTestState({
      hours: 12,
      sunrise: 6,
      sunset: 18,
      store: {
        weather: {
          current: { id: 501, main: "Rain", description: "moderate rain", icon: "10d", temp: 15 },
        },
      },
    });
    expect(state.computed.phase.weather.id).toBe(501);
    expect(state.computed.phase.weather.icon).toBe("10d");
  });
});
```

**Step 6: Run tests**

Run: `just app::test`
Expected: PASS (some weather layer tests may fail — those are rewritten in Task 5)

Run: `just app::typecheck`
Expected: PASS or errors only in WeatherLayer.ts (fixed in Task 4-5)

**Step 7: Commit**

```bash
git add app/src/scripts/live-window/LiveWindow.ts app/src/scripts/live-window/__tests__/overrides.test.ts
git commit -m "feat: switch override-weather to numeric IDs, remove override-weather-description"
```

---

### Task 4: Add new precipitation configs and atmosphere configs

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts`

**Step 1: Write failing tests for new precip configs**

Create tests in `__tests__/layers/weather.test.ts` for the new precipitation types. Add to the existing `PRECIP_CONFIG` describe block:

```typescript
it("defines configs for all precipitation types including new ones", () => {
  expect(PRECIP_CONFIG.lightRain).toBeDefined();
  expect(PRECIP_CONFIG.rain).toBeDefined();
  expect(PRECIP_CONFIG.thunderstorm).toBeDefined();
  expect(PRECIP_CONFIG.snow).toBeDefined();
  expect(PRECIP_CONFIG.sleet).toBeDefined();
  expect(PRECIP_CONFIG.drizzle).toBeDefined();
  expect(PRECIP_CONFIG.showerRain).toBeDefined();
  expect(PRECIP_CONFIG.freezingRain).toBeDefined();
  expect(PRECIP_CONFIG.lightSnow).toBeDefined();
  expect(PRECIP_CONFIG.heavySnow).toBeDefined();
  expect(PRECIP_CONFIG.showerSnow).toBeDefined();
});

it("drizzle is slower than lightRain", () => {
  const speed = (s: string) => parseFloat(s);
  expect(speed(PRECIP_CONFIG.drizzle.fallSpeed)).toBeGreaterThan(speed(PRECIP_CONFIG.lightRain.fallSpeed));
});

it("freezingRain has blue-white color", () => {
  expect(PRECIP_CONFIG.freezingRain.color).not.toBe(PRECIP_CONFIG.rain.color);
});
```

Add a new describe block for `ATMOSPHERE_CONFIG`:

```typescript
describe("ATMOSPHERE_CONFIG", () => {
  it("defines configs for all atmosphere types", () => {
    expect(ATMOSPHERE_CONFIG.mist).toBeDefined();
    expect(ATMOSPHERE_CONFIG.fog).toBeDefined();
    expect(ATMOSPHERE_CONFIG.smoke).toBeDefined();
    expect(ATMOSPHERE_CONFIG.haze).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dust).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dustWhirls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.volcanicAsh).toBeDefined();
    expect(ATMOSPHERE_CONFIG.squalls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.tornado).toBeDefined();
  });

  it("fog is denser than mist", () => {
    expect(ATMOSPHERE_CONFIG.fog.opacity).toBeGreaterThan(ATMOSPHERE_CONFIG.mist.opacity);
  });

  it("smoke has brownish color distinct from mist", () => {
    expect(ATMOSPHERE_CONFIG.smoke.color).not.toBe(ATMOSPHERE_CONFIG.mist.color);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test`
Expected: FAIL — new precip types and ATMOSPHERE_CONFIG not defined

**Step 3: Add new precipitation configs**

In `WeatherLayer.ts`, add to `PRECIP_CONFIG`:

```typescript
drizzle: {
  count: 22,
  fallSpeed: "8s",
  shape: "drop",
  sizeW: [1, 2],
  aspectRatio: 2.5,
  color: "#28afff",
  opacityRange: [30, 55],
  hasSway: false,
},
showerRain: {
  count: 38,
  fallSpeed: "1.5s",
  shape: "drop",
  sizeW: [3, 5],
  aspectRatio: 3,
  color: "#28afff",
  opacityRange: [75, 100],
  hasSway: false,
},
freezingRain: {
  count: 30,
  fallSpeed: "3s",
  shape: "drop",
  sizeW: [2, 4],
  aspectRatio: 2,
  color: "#b8deff",
  opacityRange: [60, 90],
  hasSway: false,
},
lightSnow: {
  count: 20,
  fallSpeed: "8s",
  shape: "round",
  sizeW: [2, 5],
  aspectRatio: 1,
  color: "#fff",
  opacityRange: [40, 80],
  hasSway: true,
},
heavySnow: {
  count: 45,
  fallSpeed: "4s",
  shape: "round",
  sizeW: [4, 9],
  aspectRatio: 1,
  color: "#fff",
  opacityRange: [60, 100],
  hasSway: true,
},
showerSnow: {
  count: 40,
  fallSpeed: "3s",
  shape: "round",
  sizeW: [3, 7],
  aspectRatio: 1,
  color: "#fff",
  opacityRange: [55, 95],
  hasSway: true,
},
```

**Step 4: Add atmosphere configs**

Add to `WeatherLayer.ts` (new export):

```typescript
export interface AtmosphereConfig {
  color: string;
  opacity: number;
  layers: number;
}

export const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
  mist:        { color: "#c8c8c8", opacity: 0.15, layers: 2 },
  fog:         { color: "#b0b0b0", opacity: 0.35, layers: 3 },
  smoke:       { color: "#8b7355", opacity: 0.3,  layers: 3 },
  haze:        { color: "#d4c89a", opacity: 0.2,  layers: 2 },
  dust:        { color: "#c4a86a", opacity: 0.25, layers: 2 },
  dustWhirls:  { color: "#c4a86a", opacity: 0.35, layers: 3 },
  volcanicAsh: { color: "#555555", opacity: 0.4,  layers: 3 },
  squalls:     { color: "#888888", opacity: 0.3,  layers: 3 },
  tornado:     { color: "#666666", opacity: 0.45, layers: 3 },
};
```

**Step 5: Run tests**

Run: `just app::test`
Expected: PASS (new config tests pass; existing WeatherLayer rendering tests may fail — fixed in Task 5)

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts app/src/scripts/live-window/__tests__/layers/weather.test.ts
git commit -m "feat: add new precipitation types and atmosphere configs"
```

---

### Task 5: Replace icon-based mapping with weather ID effects map

This is the largest task — it replaces `ICON_WEATHER_MAP` + `intensityMultiplier` with `WEATHER_EFFECTS` and rewrites `WeatherLayer.update()`.

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts`
- Modify: `app/src/scripts/live-window/__tests__/layers/weather.test.ts`

**Step 1: Write failing tests for the new system**

Replace the entire test file with tests for the new architecture. Key test groups:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  WeatherLayer,
  WEATHER_EFFECTS,
  PRECIP_CONFIG,
  ATMOSPHERE_CONFIG,
} from "../../components/sky/WeatherLayer";
import { makeTestState } from "../helpers";

function makeState(weatherId: number | null) {
  if (weatherId === null) {
    return makeTestState({ store: { weather: { current: null } } });
  }
  return makeTestState({
    store: {
      weather: {
        current: { id: weatherId, main: "Test", description: "test", icon: "01d", temp: 20 },
      },
    },
  });
}

describe("WEATHER_EFFECTS", () => {
  it("covers all thunderstorm IDs (2xx)", () => {
    for (const id of [200, 201, 202, 210, 211, 212, 221, 230, 231, 232]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all drizzle IDs (3xx)", () => {
    for (const id of [300, 301, 302, 310, 311, 312, 313, 314, 321]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all rain IDs (5xx)", () => {
    for (const id of [500, 501, 502, 503, 504, 511, 520, 521, 522, 531]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all snow IDs (6xx)", () => {
    for (const id of [600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all atmosphere IDs (7xx)", () => {
    for (const id of [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all clear/cloud IDs (800+)", () => {
    for (const id of [800, 801, 802, 803, 804]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("thunderstorm IDs have lightning", () => {
    for (const id of [200, 201, 202, 210, 211, 212, 221, 230, 231, 232]) {
      expect(WEATHER_EFFECTS[id].lightning).toBe(true);
    }
  });

  it("rain+snow (615, 616) have dual precipitation layers", () => {
    expect(WEATHER_EFFECTS[615].precip.length).toBe(2);
    expect(WEATHER_EFFECTS[616].precip.length).toBe(2);
  });

  it("snow IDs (600-602, 615-622) have snow accumulation", () => {
    for (const id of [600, 601, 602, 615, 616, 620, 621, 622]) {
      expect(WEATHER_EFFECTS[id].snowAccumulation).toBe(true);
    }
  });

  it("sleet IDs (611-613) do not have snow accumulation", () => {
    for (const id of [611, 612, 613]) {
      expect(WEATHER_EFFECTS[id].snowAccumulation).toBe(false);
    }
  });

  it("freezing rain (511) has snow accumulation", () => {
    expect(WEATHER_EFFECTS[511].snowAccumulation).toBe(true);
  });

  it("atmosphere IDs have atmosphere configs", () => {
    for (const id of [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]) {
      expect(WEATHER_EFFECTS[id].atmosphere).not.toBeNull();
    }
  });
});

describe("WeatherLayer", () => {
  let layer: WeatherLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new WeatherLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("renders nothing when weather id is null", () => {
    layer.update(makeState(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders only clouds for 801 (few clouds)", () => {
    layer.update(makeState(801));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
    expect(container.querySelector(".cloud-md")).toBeFalsy();
    expect(container.querySelector(".droplets")).toBeFalsy();
  });

  it("renders medium clouds for 802 (scattered)", () => {
    layer.update(makeState(802));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
    expect(container.querySelector(".cloud-md")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeFalsy();
  });

  it("renders heavy clouds for 803 (broken)", () => {
    layer.update(makeState(803));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
    expect(container.querySelector(".cloud-md")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders rain particles for 501 (moderate rain)", () => {
    layer.update(makeState(501));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
  });

  it("renders lightning for thunderstorm (201)", () => {
    layer.update(makeState(201));
    expect(container.querySelector(".lightning")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
  });

  it("renders atmosphere layers for mist (701)", () => {
    layer.update(makeState(701));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    expect(container.querySelector(".atmosphere-md")).toBeTruthy();
  });

  it("renders atmosphere with correct color for smoke (711)", () => {
    layer.update(makeState(711));
    const el = container.querySelector(".atmosphere-lg") as HTMLElement;
    expect(el.style.background).toContain(ATMOSPHERE_CONFIG.smoke.color);
  });

  it("renders snow accumulation for 601 (snow)", () => {
    layer.update(makeState(601));
    expect(container.querySelector(".snow-sill")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("does not render snow accumulation for 611 (sleet)", () => {
    layer.update(makeState(611));
    expect(container.querySelector(".snow-sill")).toBeFalsy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("renders dual precipitation for rain+snow (615)", () => {
    layer.update(makeState(615));
    const droplets = container.querySelectorAll(".droplets");
    expect(droplets.length).toBe(2);
  });

  it("renders nothing for clear sky (800)", () => {
    layer.update(makeState(800));
    expect(container.innerHTML).toBe("");
  });

  it("cleans up on destroy", () => {
    layer.update(makeState(501));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test`
Expected: FAIL — WEATHER_EFFECTS not defined

**Step 3: Implement WEATHER_EFFECTS map and update rendering**

In `WeatherLayer.ts`, define the new types and map:

```typescript
export interface WeatherEffectConfig {
  clouds: "none" | "light" | "medium" | "heavy";
  precip: PrecipLayer[];
  lightning: boolean;
  atmosphere: AtmosphereConfig | null;
  snowAccumulation: boolean;
}

export interface PrecipLayer {
  type: string;
  intensityScale: number;
}
```

Then define the full `WEATHER_EFFECTS` map. Use a helper to reduce repetition:

```typescript
function fx(
  clouds: WeatherEffectConfig["clouds"],
  precip: PrecipLayer[],
  opts?: { lightning?: boolean; atmosphere?: AtmosphereConfig; snowAccumulation?: boolean },
): WeatherEffectConfig {
  return {
    clouds,
    precip,
    lightning: opts?.lightning ?? false,
    atmosphere: opts?.atmosphere ?? null,
    snowAccumulation: opts?.snowAccumulation ?? false,
  };
}

function p(type: string, intensityScale = 1.0): PrecipLayer {
  return { type, intensityScale };
}

export const WEATHER_EFFECTS: Record<number, WeatherEffectConfig> = {
  // 2xx Thunderstorm
  200: fx("heavy", [p("lightRain", 0.6)], { lightning: true }),
  201: fx("heavy", [p("rain")], { lightning: true }),
  202: fx("heavy", [p("rain", 1.4)], { lightning: true }),
  210: fx("heavy", [], { lightning: true }),
  211: fx("heavy", [], { lightning: true }),
  212: fx("heavy", [], { lightning: true }),
  221: fx("heavy", [], { lightning: true }),
  230: fx("heavy", [p("drizzle", 0.6)], { lightning: true }),
  231: fx("heavy", [p("drizzle")], { lightning: true }),
  232: fx("heavy", [p("drizzle", 1.4)], { lightning: true }),
  // 3xx Drizzle
  300: fx("medium", [p("drizzle", 0.6)]),
  301: fx("medium", [p("drizzle")]),
  302: fx("medium", [p("drizzle", 1.4)]),
  310: fx("medium", [p("drizzle", 0.6), p("lightRain", 0.4)]),
  311: fx("medium", [p("drizzle", 0.7), p("lightRain", 0.7)]),
  312: fx("medium", [p("drizzle"), p("rain", 0.7)]),
  313: fx("medium", [p("showerRain", 0.7), p("drizzle", 0.5)]),
  314: fx("heavy", [p("showerRain", 1.2), p("drizzle", 0.6)]),
  321: fx("medium", [p("drizzle", 1.2)]),
  // 5xx Rain
  500: fx("medium", [p("lightRain", 0.6)]),
  501: fx("medium", [p("rain")]),
  502: fx("heavy", [p("rain", 1.4)]),
  503: fx("heavy", [p("rain", 1.6)]),
  504: fx("heavy", [p("rain", 1.8)]),
  511: fx("heavy", [p("freezingRain")], { snowAccumulation: true }),
  520: fx("medium", [p("showerRain", 0.6)]),
  521: fx("medium", [p("showerRain")]),
  522: fx("heavy", [p("showerRain", 1.4)]),
  531: fx("medium", [p("showerRain")]),
  // 6xx Snow
  600: fx("medium", [p("lightSnow", 0.6)], { snowAccumulation: true }),
  601: fx("medium", [p("snow")], { snowAccumulation: true }),
  602: fx("heavy", [p("heavySnow", 1.4)], { snowAccumulation: true }),
  611: fx("medium", [p("sleet")]),
  612: fx("medium", [p("sleet", 0.6)]),
  613: fx("medium", [p("sleet", 1.2)]),
  615: fx("medium", [p("lightRain", 0.5), p("lightSnow", 0.5)], { snowAccumulation: true }),
  616: fx("heavy", [p("rain", 0.7), p("snow", 0.7)], { snowAccumulation: true }),
  620: fx("medium", [p("showerSnow", 0.6)], { snowAccumulation: true }),
  621: fx("medium", [p("showerSnow")], { snowAccumulation: true }),
  622: fx("heavy", [p("showerSnow", 1.4)], { snowAccumulation: true }),
  // 7xx Atmosphere
  701: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.mist }),
  711: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.smoke }),
  721: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.haze }),
  731: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dustWhirls }),
  741: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.fog }),
  751: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust }),
  761: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust }),
  762: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.volcanicAsh }),
  771: fx("heavy", [], { atmosphere: ATMOSPHERE_CONFIG.squalls }),
  781: fx("heavy", [], { atmosphere: ATMOSPHERE_CONFIG.tornado }),
  // 800+ Clear/Clouds
  800: fx("none", []),
  801: fx("light", []),
  802: fx("medium", []),
  803: fx("heavy", []),
  804: fx("heavy", []),
};
```

**Step 4: Rewrite update() method**

Remove `ICON_WEATHER_MAP` and `intensityMultiplier`. Replace the `update()` method:

```typescript
update(state: LiveWindowState): void {
  if (!this.el) return;
  const weatherId = state.computed.phase.weather.id;

  if (!weatherId || !WEATHER_EFFECTS[weatherId]) {
    this.el.className = "sky-layer weather";
    this.el.innerHTML = "";
    return;
  }

  const config = WEATHER_EFFECTS[weatherId];
  const icon = state.computed.phase.weather.icon;
  let cls = "sky-layer weather";
  if (icon) cls += ` weather-${icon}`;
  this.el.className = cls;

  let html = "";

  // Clouds
  if (config.clouds === "heavy") {
    html += '<div class="cloud cloud-lg"></div>';
    html += '<div class="cloud cloud-md"></div>';
    html += '<div class="cloud cloud-sm"></div>';
  } else if (config.clouds === "medium") {
    html += '<div class="cloud cloud-md"></div>';
    html += '<div class="cloud cloud-sm"></div>';
  } else if (config.clouds === "light") {
    html += '<div class="cloud cloud-sm"></div>';
  }

  // Lightning
  if (config.lightning) {
    html += '<div class="lightning"></div>';
  }

  // Atmosphere
  if (config.atmosphere) {
    const { color, opacity, layers } = config.atmosphere;
    const sizes = ["lg", "md", "sm"];
    for (let i = 0; i < layers; i++) {
      const size = sizes[i] ?? "sm";
      html += `<div class="atmosphere-layer atmosphere-${size}" style="background:${color};opacity:${opacity}"></div>`;
    }
  }

  // Precipitation layers
  for (const layer of config.precip) {
    const precipConfig = PRECIP_CONFIG[layer.type];
    if (!precipConfig) continue;
    const count = Math.round(precipConfig.count * layer.intensityScale);
    const particles = WeatherLayer.particleHTML(precipConfig, count);
    html += `<div class="droplets" style="animation-duration:${precipConfig.fallSpeed}">`;
    html += `<div class="droplets-half">${particles}</div>`;
    html += `<div class="droplets-half">${particles}</div>`;
    html += "</div>";
  }

  // Snow accumulation
  if (config.snowAccumulation) {
    html += '<div class="snow-sill">';
    for (let i = 1; i <= 6; i++) {
      html += `<div class="snow-mound snow-mound-${i}"></div>`;
    }
    html += "</div>";
  }

  this.el.innerHTML = html;
}
```

**Step 5: Run tests**

Run: `just app::test`
Expected: PASS

**Step 6: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts app/src/scripts/live-window/__tests__/layers/weather.test.ts
git commit -m "feat: replace icon-based weather mapping with weather ID effects system"
```

---

### Task 6: Update CSS — rename mist to atmosphere, update weather-type overrides

**Files:**
- Modify: `app/src/scripts/live-window/live-window.css:404-442` (mist section)
- Modify: `app/src/scripts/live-window/live-window.css:444-487` (weather-type overrides)

**Step 1: Rename mist CSS classes**

Replace the mist section (lines 404-442):

`.mist` → `.atmosphere-layer`
`.mist-lg` → `.atmosphere-lg`
`.mist-md` → `.atmosphere-md`
`.mist-sm` → `.atmosphere-sm`
`mist-roll` → `atmosphere-roll`

Remove hardcoded `background` and `opacity` from `.atmosphere-lg`, `.atmosphere-md`, `.atmosphere-sm` since those are now applied inline from the config. Keep structure (height, box-shadow shape, animation):

```css
/* Atmosphere */

.weather .atmosphere-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 120%;
  animation: 5s linear infinite alternate atmosphere-roll;
  transform: translate(0, 0);
}

.weather .atmosphere-lg {
  height: 45%;
  box-shadow: 0 -10px 20px 10px currentColor;
}

.weather .atmosphere-md {
  height: 20%;
  box-shadow: 0 -10px 40px 30px currentColor;
}

.weather .atmosphere-sm {
  height: 0;
  box-shadow: 0 -10px 30px 20px currentColor;
}

@keyframes atmosphere-roll {
  0% {
    transform: translate(-20%, 0%);
  }
  100% {
    transform: translate(0%, 20%);
  }
}
```

Note: Use `currentColor` for `box-shadow` so it inherits from the inline `color` style set in the HTML. Or alternatively, set the `box-shadow` via inline style in the TypeScript. Choose whichever approach is cleaner. If `currentColor` doesn't work for `box-shadow`, instead have the TypeScript generate the box-shadow inline alongside background and opacity.

**Step 2: Update weather-type overrides**

The icon-based CSS classes (`.weather-09d`, `.weather-10d`, `.weather-11d`, `.weather-50d`) stay for now since we still add `weather-{icon}` to the class. The thunderstorm dark cloud styling (`.weather-11d .cloud`) still works since thunderstorm icon `11d`/`11n` is derived from the group. Keep these as-is.

Remove the `.weather-50d` references if atmosphere rendering is handled entirely inline.

**Step 3: Run tests**

Run: `just app::test`
Expected: PASS — atmosphere layer tests should find `.atmosphere-lg` etc.

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/live-window.css
git commit -m "refactor: rename mist CSS to atmosphere, use dynamic inline styles"
```

---

### Task 7: Update the playground

**Files:**
- Modify: `app/src/pages/dev/live-window-playground.astro`

**Step 1: Replace weather dropdown with grouped optgroup select**

Replace the weather fieldset (lines 64-91) with:

```html
<fieldset class="control-group">
  <legend>Weather</legend>
  <div class="control-row">
    <label for="weather-select">Condition</label>
  </div>
  <select id="weather-select">
    <option value="">None (Clear Sky)</option>
    <optgroup label="Thunderstorm">
      <option value="200">200 - Thunderstorm + Light Rain</option>
      <option value="201">201 - Thunderstorm + Rain</option>
      <option value="202">202 - Thunderstorm + Heavy Rain</option>
      <option value="210">210 - Light Thunderstorm</option>
      <option value="211">211 - Thunderstorm</option>
      <option value="212">212 - Heavy Thunderstorm</option>
      <option value="221">221 - Ragged Thunderstorm</option>
      <option value="230">230 - Thunderstorm + Light Drizzle</option>
      <option value="231">231 - Thunderstorm + Drizzle</option>
      <option value="232">232 - Thunderstorm + Heavy Drizzle</option>
    </optgroup>
    <optgroup label="Drizzle">
      <option value="300">300 - Light Drizzle</option>
      <option value="301">301 - Drizzle</option>
      <option value="302">302 - Heavy Drizzle</option>
      <option value="310">310 - Light Drizzle Rain</option>
      <option value="311">311 - Drizzle Rain</option>
      <option value="312">312 - Heavy Drizzle Rain</option>
      <option value="313">313 - Shower Rain + Drizzle</option>
      <option value="314">314 - Heavy Shower Rain + Drizzle</option>
      <option value="321">321 - Shower Drizzle</option>
    </optgroup>
    <optgroup label="Rain">
      <option value="500">500 - Light Rain</option>
      <option value="501">501 - Moderate Rain</option>
      <option value="502">502 - Heavy Rain</option>
      <option value="503">503 - Very Heavy Rain</option>
      <option value="504">504 - Extreme Rain</option>
      <option value="511">511 - Freezing Rain</option>
      <option value="520">520 - Light Shower Rain</option>
      <option value="521">521 - Shower Rain</option>
      <option value="522">522 - Heavy Shower Rain</option>
      <option value="531">531 - Ragged Shower Rain</option>
    </optgroup>
    <optgroup label="Snow">
      <option value="600">600 - Light Snow</option>
      <option value="601">601 - Snow</option>
      <option value="602">602 - Heavy Snow</option>
      <option value="611">611 - Sleet</option>
      <option value="612">612 - Light Shower Sleet</option>
      <option value="613">613 - Shower Sleet</option>
      <option value="615">615 - Light Rain + Snow</option>
      <option value="616">616 - Rain + Snow</option>
      <option value="620">620 - Light Shower Snow</option>
      <option value="621">621 - Shower Snow</option>
      <option value="622">622 - Heavy Shower Snow</option>
    </optgroup>
    <optgroup label="Atmosphere">
      <option value="701">701 - Mist</option>
      <option value="711">711 - Smoke</option>
      <option value="721">721 - Haze</option>
      <option value="731">731 - Sand/Dust Whirls</option>
      <option value="741">741 - Fog</option>
      <option value="751">751 - Sand</option>
      <option value="761">761 - Dust</option>
      <option value="762">762 - Volcanic Ash</option>
      <option value="771">771 - Squalls</option>
      <option value="781">781 - Tornado</option>
    </optgroup>
    <optgroup label="Clouds">
      <option value="801">801 - Few Clouds</option>
      <option value="802">802 - Scattered Clouds</option>
      <option value="803">803 - Broken Clouds</option>
      <option value="804">804 - Overcast</option>
    </optgroup>
  </select>
</fieldset>
```

Remove the intensity dropdown entirely (lines 81-90).

**Step 2: Simplify the weather update JavaScript**

Replace the `updateWeather()` function and related code (lines 218-235):

```typescript
function updateWeather() {
  const value = weatherSelect.value;
  if (value) {
    win.setAttribute("override-weather", value);
  } else {
    win.removeAttribute("override-weather");
  }
}

weatherSelect.addEventListener("change", updateWeather);
updateWeather();
```

Remove all references to `intensitySelect` (lines 140, 220-221, 229-230, 234, 277).

Remove `override-weather-description` setAttribute calls.

**Step 3: Update the reset handler**

In the reset handler (line 267-289), update:

```typescript
weatherSelect.value = "";
updateWeather();
```

Remove `intensitySelect.value = "";` line.

**Step 4: Verify visually**

Run: `just app::serve`
Open the playground in browser, test several conditions. Verify:
- Selecting "615 - Light Rain + Snow" shows rain drops AND snowflakes
- Selecting "711 - Smoke" shows brownish atmosphere
- Selecting "201 - Thunderstorm + Rain" shows lightning + rain + dark clouds
- Selecting "800" or empty shows clear sky (no effects)

**Step 5: Commit**

```bash
git add app/src/pages/dev/live-window-playground.astro
git commit -m "feat: update playground with grouped weather ID dropdown, remove intensity select"
```

---

### Task 8: Run all tests and typecheck

**Step 1: Run app tests**

Run: `just app::test`
Expected: PASS

**Step 2: Run API tests**

Run: `just api::test`
Expected: PASS

**Step 3: Run typechecks**

Run: `just app::typecheck && just api::typecheck`
Expected: PASS

**Step 4: Build**

Run: `just app::build`
Expected: PASS

**Step 5: Fix any failures**

If any tests fail, fix the root cause. Common issues:
- Old references to `ICON_WEATHER_MAP` or `intensityMultiplier` in other test files
- Missing `id` field in test state helpers
- CSS class name mismatches (`.mist-lg` → `.atmosphere-lg`)

**Step 6: Final commit if needed**

```bash
git add -A
git commit -m "fix: resolve remaining test/typecheck issues from weather ID refactor"
```
