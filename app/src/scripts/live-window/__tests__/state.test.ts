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

  it("returns DEFAULT_STATE when nothing is stored", () => {
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it("returns stored state when version matches", () => {
    const saved = {
      _v: CACHE_VERSION,
      location: { lastFetched: 1000, lat: 40, lng: -74, country: "US" },
      weather: { lastFetched: 2000, units: "imperial", current: null, sunrise: null, sunset: null },
    };
    store[STORAGE_KEY] = JSON.stringify(saved);
    const result = loadState();
    expect(result.location.lat).toBe(40);
    expect(result.location.country).toBe("US");
  });

  it("returns DEFAULT_STATE and clears storage when version mismatches", () => {
    store[STORAGE_KEY] = JSON.stringify({ _v: 0, location: { lat: 99 } });
    const result = loadState();
    expect(result).toEqual(DEFAULT_STATE);
    expect(store[STORAGE_KEY]).toBeUndefined();
  });
});

describe("saveState", () => {
  beforeEach(() => {
    Reflect.deleteProperty(store, STORAGE_KEY);
  });

  it("round-trips through loadState", () => {
    const state = {
      ...DEFAULT_STATE,
      location: { ...DEFAULT_STATE.location, lat: 51.5, lng: -0.1, country: "GB" },
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded.location.lat).toBe(51.5);
    expect(loaded.location.country).toBe("GB");
  });
});
