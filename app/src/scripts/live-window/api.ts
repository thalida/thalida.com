import type { StoreState } from "./types";

export const WEATHER_RATE_LIMIT = 30 * 60_000;

export const IMPERIAL_COUNTRIES = new Set(["US", "LR", "MM"]);

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function resolveUnits(attr: string | null, country: string | null): "metric" | "imperial" {
  const normalized = (attr ?? "auto").toUpperCase();
  if (normalized === "F" || normalized === "IMPERIAL") return "imperial";
  if (normalized === "C" || normalized === "METRIC") return "metric";
  if (country && IMPERIAL_COUNTRIES.has(country)) return "imperial";
  return "metric";
}

// ---------------------------------------------------------------------------
// Rate-limit guards
// ---------------------------------------------------------------------------

export function shouldFetchWeather(state: StoreState, units: string): boolean {
  if (!state.weather.lastFetched) return true;
  if (state.weather.units !== units) return true;
  if (!isSameDate(new Date(state.weather.lastFetched), new Date())) return true;
  return Date.now() - state.weather.lastFetched >= WEATHER_RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Fetch functions (return new state instead of mutating)
// ---------------------------------------------------------------------------

export function locationChanged(prev: StoreState, next: StoreState): boolean {
  return prev.location.lat !== next.location.lat || prev.location.lng !== next.location.lng;
}

export async function fetchLocation(apiUrl: string, state: StoreState): Promise<StoreState> {
  try {
    const res = await fetch(`${apiUrl}/location`);
    if (!res.ok) return state;
    const data = await res.json();

    if (typeof data.lat !== "number" || typeof data.lng !== "number") return state;

    return {
      ...state,
      location: {
        lat: data.lat,
        lng: data.lng,
        country: typeof data.country === "string" ? data.country : null,
        name: typeof data.name === "string" ? data.name : null,
        timezone: typeof data.timezone === "string" ? data.timezone : null,
        lastFetched: Date.now(),
      },
    };
  } catch {
    return state;
  }
}

export async function fetchWeather(
  apiUrl: string,
  state: StoreState,
  units: string,
): Promise<{ state: StoreState; changed: boolean }> {
  const { lat, lng } = state.location;
  if (lat == null || lng == null) return { state, changed: false };

  try {
    const res = await fetch(`${apiUrl}/weather?units=${units}&lat=${lat}&lon=${lng}`);
    if (!res.ok) return { state, changed: false };
    const data = await res.json();

    if (typeof data.sunrise !== "number" || typeof data.sunset !== "number") {
      return { state, changed: false };
    }

    const newState: StoreState = {
      ...state,
      weather: {
        current: {
          main: typeof data.main === "string" ? data.main : "",
          description: typeof data.description === "string" ? data.description : "",
          icon: typeof data.icon === "string" ? data.icon : "",
          temp: typeof data.temp === "number" ? data.temp : 0,
        },
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
