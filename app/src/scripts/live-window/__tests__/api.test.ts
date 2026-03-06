import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveUnits,
  shouldFetchWeather,
  fetchLocation,
  fetchWeather,
  locationChanged,
  WEATHER_RATE_LIMIT,
} from "../api";
import { DEFAULT_STORE } from "../state";
import type { StoreState } from "../types";

describe("resolveUnits", () => {
  it("returns metric by default when no attr and no country", () => {
    expect(resolveUnits(null, null)).toBe("metric");
  });

  it("returns imperial when attr is F", () => {
    expect(resolveUnits("F", null)).toBe("imperial");
  });

  it("returns metric when attr is C", () => {
    expect(resolveUnits("C", null)).toBe("metric");
  });

  it("returns imperial for US country with auto units", () => {
    expect(resolveUnits(null, "US")).toBe("imperial");
  });

  it("returns metric for non-imperial country with auto units", () => {
    expect(resolveUnits(null, "GB")).toBe("metric");
  });

  it("explicit attr overrides country", () => {
    expect(resolveUnits("C", "US")).toBe("metric");
    expect(resolveUnits("F", "GB")).toBe("imperial");
  });

  it("changes result when country becomes known (the fetchLocation scenario)", () => {
    // Before location fetch: no country → metric
    const beforeLocation = resolveUnits(null, null);
    expect(beforeLocation).toBe("metric");

    // After location fetch: country=US → imperial
    const afterLocation = resolveUnits(null, "US");
    expect(afterLocation).toBe("imperial");

    // This difference means weather must be fetched AFTER location resolves
    expect(beforeLocation).not.toBe(afterLocation);
  });
});

describe("locationChanged", () => {
  it("returns false when lat/lng are the same", () => {
    const state: StoreState = {
      ...DEFAULT_STORE,
      location: { ...DEFAULT_STORE.location, lat: 40.7, lng: -74.0 },
    };
    expect(locationChanged(state, state)).toBe(false);
  });

  it("returns true when lat changes", () => {
    const prev: StoreState = { ...DEFAULT_STORE, location: { ...DEFAULT_STORE.location, lat: 40.7, lng: -74.0 } };
    const next: StoreState = { ...DEFAULT_STORE, location: { ...DEFAULT_STORE.location, lat: 51.5, lng: -74.0 } };
    expect(locationChanged(prev, next)).toBe(true);
  });

  it("returns true when lng changes", () => {
    const prev: StoreState = { ...DEFAULT_STORE, location: { ...DEFAULT_STORE.location, lat: 40.7, lng: -74.0 } };
    const next: StoreState = { ...DEFAULT_STORE, location: { ...DEFAULT_STORE.location, lat: 40.7, lng: -0.1 } };
    expect(locationChanged(prev, next)).toBe(true);
  });

  it("returns false when both are null", () => {
    expect(locationChanged(DEFAULT_STORE, DEFAULT_STORE)).toBe(false);
  });

  it("returns true when going from null to a value", () => {
    const next: StoreState = { ...DEFAULT_STORE, location: { ...DEFAULT_STORE.location, lat: 40.7, lng: -74.0 } };
    expect(locationChanged(DEFAULT_STORE, next)).toBe(true);
  });
});

describe("shouldFetchWeather", () => {
  it("returns true when never fetched", () => {
    expect(shouldFetchWeather(DEFAULT_STORE, "metric")).toBe(true);
  });

  it("returns true when units changed", () => {
    const state: StoreState = {
      ...DEFAULT_STORE,
      weather: { ...DEFAULT_STORE.weather, lastFetched: Date.now(), units: "metric" },
    };
    expect(shouldFetchWeather(state, "imperial")).toBe(true);
  });

  it("returns false when recently fetched with same units", () => {
    const state: StoreState = {
      ...DEFAULT_STORE,
      weather: { ...DEFAULT_STORE.weather, lastFetched: Date.now(), units: "metric" },
    };
    expect(shouldFetchWeather(state, "metric")).toBe(false);
  });

  it("returns true when weather rate limit exceeded", () => {
    const state: StoreState = {
      ...DEFAULT_STORE,
      weather: { ...DEFAULT_STORE.weather, lastFetched: Date.now() - WEATHER_RATE_LIMIT - 1, units: "metric" },
    };
    expect(shouldFetchWeather(state, "metric")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchLocation
// ---------------------------------------------------------------------------

describe("fetchLocation", () => {
  const apiUrl = "https://api.example.com";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns updated state on successful response", async () => {
    const mockData = { lat: 40.7, lng: -74.0, country: "US", name: "New York", timezone: "America/New_York" };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) } as Response);

    const result = await fetchLocation(apiUrl, DEFAULT_STORE);

    expect(fetch).toHaveBeenCalledWith(`${apiUrl}/location`);
    expect(result.location.lat).toBe(40.7);
    expect(result.location.lng).toBe(-74.0);
    expect(result.location.country).toBe("US");
    expect(result.location.name).toBe("New York");
    expect(result.location.timezone).toBe("America/New_York");
    expect(result.location.lastFetched).toBeGreaterThan(0);
  });

  it("returns original state on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    const result = await fetchLocation(apiUrl, DEFAULT_STORE);

    expect(result).toBe(DEFAULT_STORE);
  });

  it("returns original state on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network failure"));

    const result = await fetchLocation(apiUrl, DEFAULT_STORE);

    expect(result).toBe(DEFAULT_STORE);
  });

  it("always fetches even when location already exists", async () => {
    const mockData = { lat: 51.5, lng: -0.1, country: "GB", name: "London", timezone: "Europe/London" };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) } as Response);

    const state: StoreState = {
      ...DEFAULT_STORE,
      location: { lat: 1, lng: 2, country: "GB", name: "London", timezone: "Europe/London", lastFetched: Date.now() },
    };

    const result = await fetchLocation(apiUrl, state);

    expect(fetch).toHaveBeenCalledWith(`${apiUrl}/location`);
    expect(result.location.lat).toBe(51.5);
    expect(result.location.lng).toBe(-0.1);
  });

  it("handles missing optional fields with null fallbacks", async () => {
    const mockData = { lat: 51.5, lng: -0.1 };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) } as Response);

    const result = await fetchLocation(apiUrl, DEFAULT_STORE);

    expect(result.location.country).toBeNull();
    expect(result.location.name).toBeNull();
    expect(result.location.timezone).toBeNull();
  });

  it("rejects response with non-numeric lat/lng", async () => {
    const mockData = { lat: "not-a-number", lng: null };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) } as Response);

    const result = await fetchLocation(apiUrl, DEFAULT_STORE);

    expect(result).toBe(DEFAULT_STORE);
  });
});

// ---------------------------------------------------------------------------
// fetchWeather
// ---------------------------------------------------------------------------

describe("fetchWeather", () => {
  const apiUrl = "https://api.example.com";
  const stateWithLocation: StoreState = {
    ...DEFAULT_STORE,
    location: {
      lat: 40.7,
      lng: -74.0,
      country: "US",
      name: "New York",
      timezone: "America/New_York",
      lastFetched: Date.now(),
    },
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns updated state on successful response", async () => {
    const mockData = {
      main: "Clear",
      description: "clear sky",
      icon: "01d",
      temp: 72,
      sunrise: 1700000000,
      sunset: 1700040000,
    };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) } as Response);

    const { state, changed } = await fetchWeather(apiUrl, stateWithLocation, "imperial");

    expect(fetch).toHaveBeenCalledWith(`${apiUrl}/weather?units=imperial&lat=40.7&lon=-74`);
    expect(changed).toBe(true);
    expect(state.weather.current).toEqual({ main: "Clear", description: "clear sky", icon: "01d", temp: 72 });
    expect(state.weather.sunrise).toBe(1700000000000);
    expect(state.weather.sunset).toBe(1700040000000);
    expect(state.weather.units).toBe("imperial");
  });

  it("returns unchanged when lat/lng is null", async () => {
    const { state, changed } = await fetchWeather(apiUrl, DEFAULT_STORE, "metric");

    expect(fetch).not.toHaveBeenCalled();
    expect(changed).toBe(false);
    expect(state).toBe(DEFAULT_STORE);
  });

  it("returns unchanged on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    const { state, changed } = await fetchWeather(apiUrl, stateWithLocation, "metric");

    expect(changed).toBe(false);
    expect(state).toBe(stateWithLocation);
  });

  it("returns unchanged on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network failure"));

    const { state, changed } = await fetchWeather(apiUrl, stateWithLocation, "metric");

    expect(changed).toBe(false);
    expect(state).toBe(stateWithLocation);
  });

  it("rejects response with missing sunrise/sunset", async () => {
    const mockData = { main: "Clear", description: "clear", icon: "01d", temp: 20 };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) } as Response);

    const { state, changed } = await fetchWeather(apiUrl, stateWithLocation, "metric");

    expect(changed).toBe(false);
    expect(state).toBe(stateWithLocation);
  });

  it("coerces non-string weather fields to safe defaults", async () => {
    const mockData = {
      main: 123,
      description: null,
      icon: undefined,
      temp: "hot",
      sunrise: 1700000000,
      sunset: 1700040000,
    };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) } as Response);

    const { state, changed } = await fetchWeather(apiUrl, stateWithLocation, "metric");

    expect(changed).toBe(true);
    expect(state.weather.current).toEqual({ main: "", description: "", icon: "", temp: 0 });
  });
});
