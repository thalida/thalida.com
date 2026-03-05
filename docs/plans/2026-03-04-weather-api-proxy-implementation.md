# Weather API Proxy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the OpenWeather API call from the client-side app to the Cloudflare Worker backend, removing the exposed API key.

**Architecture:** Add a `/weather` endpoint to the existing Cloudflare Worker that proxies requests to OpenWeather. The frontend sends lat/lon/units as query params; the Worker attaches the secret API key and forwards to OpenWeather, returning a normalized response.

**Tech Stack:** Cloudflare Workers (TypeScript), Astro frontend

---

### Task 1: Add `OPENWEATHER_KEY` to Worker types and config

**Files:**
- Modify: `api/src/types.ts:210-216` (Env interface)
- Modify: `api/.dev.vars.example`

**Step 1: Add `OPENWEATHER_KEY` to the `Env` interface**

In `api/src/types.ts`, add `OPENWEATHER_KEY?: string;` to the `Env` interface:

```typescript
export interface Env {
  CHAT_ROOM: DurableObjectNamespace;
  ADMIN_SECRET: string;
  ALLOWED_ORIGIN: string;
  OPENAI_API_KEY?: string;
  IPREGISTRY_KEY?: string;
  OPENWEATHER_KEY?: string;
}
```

**Step 2: Add `OPENWEATHER_KEY` to `.dev.vars.example`**

Append to `api/.dev.vars.example`:

```
# OpenWeather API key for weather data (used by /weather endpoint).
# Get one at https://openweathermap.org/api
OPENWEATHER_KEY=
```

**Step 3: Commit**

```bash
git add api/src/types.ts api/.dev.vars.example
git commit -m "feat(api): add OPENWEATHER_KEY to Worker env"
```

---

### Task 2: Add `handleWeather()` handler and route

**Files:**
- Modify: `api/src/api.ts` (add handler after `handleLocation`)
- Modify: `api/src/index.ts` (add route)

**Step 1: Add `handleWeather` to `api/src/api.ts`**

Add this function after `handleLocation`:

```typescript
export async function handleWeather(env: Env, request: Request): Promise<Response> {
  const headers = _corsHeaders(env, request);

  if (!env.OPENWEATHER_KEY) {
    return _jsonResponse({ error: "Weather service not configured" }, 503, headers);
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const units = url.searchParams.get("units") || "metric";

  if (!lat || !lon) {
    return _jsonResponse({ error: "lat and lon query params required" }, 400, headers);
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?units=${encodeURIComponent(units)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${env.OPENWEATHER_KEY}`,
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`[weather] OpenWeather error ${res.status}: ${body}`);
      return _jsonResponse({ error: "Upstream weather service error" }, 502, headers);
    }

    const data = (await res.json()) as {
      weather?: Array<{ main?: string; description?: string; icon?: string }>;
      main?: { temp?: number };
      sys?: { sunrise?: number; sunset?: number };
    };

    return _jsonResponse(
      {
        main: data.weather?.[0]?.main ?? null,
        description: data.weather?.[0]?.description ?? null,
        icon: data.weather?.[0]?.icon ?? null,
        temp: data.main?.temp ?? null,
        sunrise: data.sys?.sunrise ?? null,
        sunset: data.sys?.sunset ?? null,
      },
      200,
      headers,
    );
  } catch {
    return _jsonResponse({ error: "Weather lookup failed" }, 502, headers);
  }
}
```

**Step 2: Add route in `api/src/index.ts`**

Add import of `handleWeather` and add the route before the health check:

```typescript
import { handleCors, handleWebSocket, handleAuth, handleConfig, handleHealthCheck, handleLocation, handleWeather } from "./api";
```

Add this clause after the `/location` route:

```typescript
    } else if (url.pathname === "/weather") {
      return handleWeather(env, request);
```

**Step 3: Run type check**

Run: `just api::typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add api/src/api.ts api/src/index.ts
git commit -m "feat(api): add /weather endpoint proxying OpenWeather"
```

---

### Task 3: Update frontend `fetchWeather()` to call the Worker

**Files:**
- Modify: `app/src/scripts/live-window/api.ts:74-104`

**Step 1: Change `fetchWeather` signature and implementation**

Replace the `fetchWeather` function. Remove the `owKey` parameter, add `apiUrl` parameter. Call the Worker's `/weather` endpoint instead of OpenWeather directly:

```typescript
export async function fetchWeather(
  apiUrl: string,
  state: StoreState,
  units: string,
): Promise<{ state: StoreState; changed: boolean }> {
  const { lat, lng } = state.location;
  if (lat == null || lng == null) return { state, changed: false };

  try {
    const res = await fetch(
      `${apiUrl}/weather?units=${units}&lat=${lat}&lon=${lng}`,
    );
    if (!res.ok) return { state, changed: false };
    const data = await res.json();

    const newState: StoreState = {
      ...state,
      weather: {
        current: { main: data.main, description: data.description, icon: data.icon, temp: data.temp },
        sunrise: data.sunrise * 1000,
        sunset: data.sunset * 1000,
        units,
        lastFetched: Date.now(),
      },
    };

    return { state: newState, changed: true };
  } catch {
    return { state, changed: false };
  }
}
```

**Step 2: Commit**

```bash
git add app/src/scripts/live-window/api.ts
git commit -m "feat(app): fetchWeather calls Worker instead of OpenWeather directly"
```

---

### Task 4: Update `LiveWindow.ts` to remove `openweather-key` attribute

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts`

**Step 1: Remove `"openweather-key"` from `observedAttributes`**

Remove `"openweather-key",` from the `static observedAttributes` array (line 16).

**Step 2: Update `attributeChangedCallback`**

Remove the condition at lines 96-98 that checks for `openweather-key`:

```typescript
    if (this.getAttribute("openweather-key") && this.getAttribute("api-url") && !this.weatherInterval) {
      this.startWeatherPolling();
    }
```

Replace with:

```typescript
    if (this.getAttribute("api-url") && !this.weatherInterval) {
      this.startWeatherPolling();
    }
```

**Step 3: Update `startUpdates`**

Replace the condition at lines 196-203:

```typescript
    const hasExplicitCoords = this.getAttribute("latitude") != null && this.getAttribute("longitude") != null;

    if (
      (hasExplicitCoords && this.getAttribute("openweather-key")) ||
      (this.getAttribute("openweather-key") && this.getAttribute("api-url"))
    ) {
      this.startWeatherPolling();
    }
```

With:

```typescript
    const apiUrl = this.getAttribute("api-url");
    const hasExplicitCoords = this.getAttribute("latitude") != null && this.getAttribute("longitude") != null;

    if (apiUrl && (hasExplicitCoords || true)) {
      this.startWeatherPolling();
    }
```

Wait — simplify. The condition was: need an OW key AND either explicit coords or api-url. Now OW key is on the Worker, so the condition is just: need `api-url`.

```typescript
    if (this.getAttribute("api-url")) {
      this.startWeatherPolling();
    }
```

**Step 4: Update `doFetchWeather`**

Replace the method. Key changes:
- Remove `owKey` check — no longer needed
- Always require `apiUrl`
- Pass `apiUrl` to `fetchWeather` instead of `owKey`
- For explicit coords, still need `apiUrl` for the weather call

```typescript
  private async doFetchWeather(): Promise<void> {
    const apiUrl = this.getAttribute("api-url");
    if (!apiUrl) return;

    const explicitLat = this.getAttribute("latitude");
    const explicitLng = this.getAttribute("longitude");
    const hasExplicitCoords = explicitLat != null && explicitLng != null;

    if (hasExplicitCoords) {
      this.state.store = {
        ...this.state.store,
        location: {
          lat: parseFloat(explicitLat),
          lng: parseFloat(explicitLng),
          country: null,
          name: null,
          timezone: null,
          lastFetched: Date.now(),
        },
      };
    } else {
      if (!shouldFetchWeather(this.state.store, this.state.attrs.resolvedUnits)) {
        this.updateAll();
        return;
      }

      this.state.store = await fetchLocation(apiUrl, this.state.store);
      saveState(this.state);
    }

    this.refreshAttrs();
    const units = this.state.attrs.resolvedUnits;

    if (!shouldFetchWeather(this.state.store, units) && !hasExplicitCoords) {
      this.updateAll();
      return;
    }

    const result = await fetchWeather(apiUrl, this.state.store, units);
    this.state.store = result.state;

    if (!hasExplicitCoords) {
      saveState(this.state);
    }

    if (result.changed) {
      this.updateAll();
      this.dispatchEvent(
        new CustomEvent("live-window:weather-update", {
          detail: { weather: this.state.store.weather },
        }),
      );
    }
  }
```

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/LiveWindow.ts
git commit -m "feat(app): remove openweather-key attribute, use api-url for weather"
```

---

### Task 5: Remove `PUBLIC_OPENWEATHER_KEY` from pages, env, and CI

**Files:**
- Modify: `app/src/pages/index.astro`
- Modify: `app/src/pages/live-window-test.astro`
- Modify: `app/.env.example`
- Modify: `.github/workflows/deploy.yml`

**Step 1: Update `index.astro`**

Remove line 8: `const openweatherKey = import.meta.env.PUBLIC_OPENWEATHER_KEY || "";`

Remove `openweather-key={openweatherKey}` from the `<live-window>` tag on line 25.

**Step 2: Update `live-window-test.astro`**

Remove line 4: `const openweatherKey = import.meta.env.PUBLIC_OPENWEATHER_KEY || "";`

Remove `openweather-key={openweatherKey}` from the `<live-window>` tag on line 29.

Add `api-url` attribute so the test page can fetch weather through the Worker. Add this to the frontmatter:

```typescript
const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL || "";
```

Add `api-url={apiBaseUrl}` to the `<live-window>` tag.

**Step 3: Update `app/.env.example`**

Remove the three lines about OpenWeather (lines 11-13):
```
# OpenWeather API key for the live window weather display.
# Get one at https://openweathermap.org/api
PUBLIC_OPENWEATHER_KEY=
```

**Step 4: Update `.github/workflows/deploy.yml`**

Remove line 108: `PUBLIC_OPENWEATHER_KEY: ${{ secrets.PUBLIC_OPENWEATHER_KEY }}`

**Step 5: Run type check and build**

Run: `just app::typecheck`
Expected: No errors

Run: `just app::build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add app/src/pages/index.astro app/src/pages/live-window-test.astro app/.env.example .github/workflows/deploy.yml
git commit -m "feat(app): remove PUBLIC_OPENWEATHER_KEY from client-side code and CI"
```

---

### Task 6: Update README

**Files:**
- Modify: `app/src/scripts/live-window/README.md`

**Step 1: Update attribute table**

Remove the `openweather-key` row. Update the description of `api-url` to mention it's used for both geolocation and weather.

**Step 2: Update data flow description**

Update the sections that describe how weather fetching works to reflect the new proxy pattern.

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/README.md
git commit -m "docs: update live-window README for weather API proxy"
```
