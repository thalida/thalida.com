import type { StoreState } from "./types";

export const IP_RATE_LIMIT = 30 * 60_000;
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

export function tempSymbol(units: "metric" | "imperial"): string {
  return units === "imperial" ? "°F" : "°C";
}

// ---------------------------------------------------------------------------
// Rate-limit guards
// ---------------------------------------------------------------------------

export function shouldFetchLocation(state: StoreState): boolean {
  if (!state.location.lastFetched) return true;
  return Date.now() - state.location.lastFetched >= IP_RATE_LIMIT;
}

export function shouldFetchWeather(state: StoreState, units: string): boolean {
  if (!state.weather.lastFetched) return true;
  if (state.weather.units !== units) return true;
  if (!isSameDate(new Date(state.weather.lastFetched), new Date())) return true;
  return Date.now() - state.weather.lastFetched >= WEATHER_RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Fetch functions (return new state instead of mutating)
// ---------------------------------------------------------------------------

export async function fetchLocation(key: string, state: StoreState): Promise<StoreState> {
  if (!shouldFetchLocation(state) && state.location.lat != null) {
    return state;
  }

  try {
    const res = await fetch(`https://api.ipregistry.co/?key=${key}`);
    if (!res.ok) return state;
    const data = await res.json();

    return {
      ...state,
      location: {
        lat: data.location.latitude,
        lng: data.location.longitude,
        country: data.location.country?.code ?? null,
        lastFetched: Date.now(),
      },
    };
  } catch {
    return state;
  }
}

export async function fetchWeather(
  owKey: string,
  state: StoreState,
  units: string,
): Promise<{ state: StoreState; changed: boolean }> {
  const { lat, lng } = state.location;
  if (lat == null || lng == null) return { state, changed: false };

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?units=${units}&lat=${lat}&lon=${lng}&appid=${owKey}`,
    );
    if (!res.ok) return { state, changed: false };
    const data = await res.json();

    const newState: StoreState = {
      ...state,
      weather: {
        current: { ...data.weather[0], temp: data.main.temp },
        sunrise: data.sys.sunrise * 1000,
        sunset: data.sys.sunset * 1000,
        units,
        lastFetched: Date.now(),
      },
    };

    return { state: newState, changed: true };
  } catch {
    return { state, changed: false };
  }
}
