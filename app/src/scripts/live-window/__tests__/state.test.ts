import { describe, it, expect, beforeEach } from "vitest";
import { loadState, saveState, DEFAULT_STATE, CACHE_VERSION } from "../state";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    Reflect.deleteProperty(store, key);
  },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const STORAGE_KEY = "liveWindowStore";

describe("loadState", () => {
  beforeEach(() => {
    Reflect.deleteProperty(store, STORAGE_KEY);
  });

  it("returns default store when nothing is stored", () => {
    const result = loadState();
    expect(result.store).toEqual(DEFAULT_STATE);
  });

  it("returns stored state when version matches", () => {
    const saved = {
      _v: CACHE_VERSION,
      location: { lastFetched: 1000, lat: 40, lng: -74, country: "US" },
      weather: { lastFetched: 2000, units: "imperial", current: null, sunrise: null, sunset: null },
    };
    store[STORAGE_KEY] = JSON.stringify(saved);
    const result = loadState();
    expect(result.store.location.lat).toBe(40);
    expect(result.store.location.country).toBe("US");
  });

  it("returns default store and clears storage when version mismatches", () => {
    store[STORAGE_KEY] = JSON.stringify({ _v: 0, location: { lat: 99 } });
    const result = loadState();
    expect(result.store).toEqual(DEFAULT_STATE);
    expect(store[STORAGE_KEY]).toBeUndefined();
  });

  it("has computed, ref, and attrs sections", () => {
    const result = loadState();
    expect(result.computed).toBeDefined();
    expect(result.computed.phase).toBeDefined();
    expect(result.ref).toBeDefined();
    expect(result.attrs).toBeDefined();
  });
});

describe("saveState", () => {
  beforeEach(() => {
    Reflect.deleteProperty(store, STORAGE_KEY);
  });

  it("round-trips through loadState", () => {
    const state = loadState();
    state.store.location = { ...state.store.location, lat: 51.5, lng: -0.1, country: "GB" };
    saveState(state);
    const loaded = loadState();
    expect(loaded.store.location.lat).toBe(51.5);
    expect(loaded.store.location.country).toBe("GB");
  });

  it("does not persist computed or ref data", () => {
    const state = loadState();
    state.ref.currentGradient = {
      zenith: { r: 1, g: 2, b: 3 },
      upper: { r: 4, g: 5, b: 6 },
      lower: { r: 7, g: 8, b: 9 },
      horizon: { r: 10, g: 11, b: 12 },
    };
    saveState(state);
    const raw = JSON.parse(store[STORAGE_KEY]);
    expect(raw.currentGradient).toBeUndefined();
    expect(raw.ref).toBeUndefined();
    expect(raw.computed).toBeUndefined();
  });
});
