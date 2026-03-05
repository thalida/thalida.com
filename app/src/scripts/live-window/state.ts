import type { StoreState, LiveWindowState } from "./types";
import { buildPhaseInfo } from "./utils/phase";

export const CACHE_VERSION = 5;
const STORAGE_KEY = "liveWindowStore";

export const DEFAULT_STORE: StoreState = {
  location: { lastFetched: null, lat: null, lng: null, country: null, name: null, timezone: null },
  weather: { lastFetched: null, units: null, current: null, sunrise: null, sunset: null },
};

/** Alias for backward compat with tests referencing DEFAULT_STATE */
export const DEFAULT_STATE = DEFAULT_STORE;

export function createDefaultState(store?: StoreState): LiveWindowState {
  const s = store ?? DEFAULT_STORE;
  return {
    store: s,
    computed: { phase: buildPhaseInfo(s, Date.now()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
      timezone: null,
      label: null,
    },
  };
}

export function loadState(): LiveWindowState {
  let store = JSON.parse(JSON.stringify(DEFAULT_STORE)) as StoreState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data._v !== CACHE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        store = {
          location: { ...DEFAULT_STORE.location, ...data.location },
          weather: { ...DEFAULT_STORE.weather, ...data.weather },
        };
      }
    }
  } catch (e) {
    console.debug("[live-window] failed to load state from localStorage", e);
  }
  return createDefaultState(store);
}

export function saveState(state: LiveWindowState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: CACHE_VERSION, ...state.store }));
  } catch (e) {
    console.debug("[live-window] failed to save state to localStorage", e);
  }
}
