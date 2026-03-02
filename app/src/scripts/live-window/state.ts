import type { StoreState } from "./types";

export const CACHE_VERSION = 2;
const STORAGE_KEY = "liveWindowStore";

export const DEFAULT_STATE: StoreState = {
  location: { lastFetched: null, lat: null, lng: null, country: null },
  weather: { lastFetched: null, units: null, current: null, sunrise: null, sunset: null },
};

export function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data._v !== CACHE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
      return {
        location: { ...DEFAULT_STATE.location, ...data.location },
        weather: { ...DEFAULT_STATE.weather, ...data.weather },
      };
    }
  } catch {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

export function saveState(state: StoreState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: CACHE_VERSION, ...state }));
  } catch {
    /* ignore */
  }
}
