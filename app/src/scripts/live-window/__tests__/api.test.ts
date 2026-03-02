import { describe, it, expect } from "vitest";
import { resolveUnits, shouldFetchLocation, shouldFetchWeather, IP_RATE_LIMIT, WEATHER_RATE_LIMIT } from "../api";
import { DEFAULT_STATE } from "../state";
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

describe("shouldFetchLocation", () => {
  it("returns true when never fetched", () => {
    expect(shouldFetchLocation(DEFAULT_STATE)).toBe(true);
  });

  it("returns false when recently fetched", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      location: { ...DEFAULT_STATE.location, lastFetched: Date.now() },
    };
    expect(shouldFetchLocation(state)).toBe(false);
  });

  it("returns true when rate limit exceeded", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      location: { ...DEFAULT_STATE.location, lastFetched: Date.now() - IP_RATE_LIMIT - 1 },
    };
    expect(shouldFetchLocation(state)).toBe(true);
  });
});

describe("shouldFetchWeather", () => {
  it("returns true when never fetched", () => {
    expect(shouldFetchWeather(DEFAULT_STATE, "metric")).toBe(true);
  });

  it("returns true when units changed", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, lastFetched: Date.now(), units: "metric" },
    };
    expect(shouldFetchWeather(state, "imperial")).toBe(true);
  });

  it("returns false when recently fetched with same units", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, lastFetched: Date.now(), units: "metric" },
    };
    expect(shouldFetchWeather(state, "metric")).toBe(false);
  });

  it("returns true when weather rate limit exceeded", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, lastFetched: Date.now() - WEATHER_RATE_LIMIT - 1, units: "metric" },
    };
    expect(shouldFetchWeather(state, "metric")).toBe(true);
  });
});
