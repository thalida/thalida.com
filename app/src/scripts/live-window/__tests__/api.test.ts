import { describe, it, expect } from "vitest";
import { shouldFetchLocation, shouldFetchWeather, IP_RATE_LIMIT, WEATHER_RATE_LIMIT } from "../api";
import { DEFAULT_STATE } from "../state";
import type { StoreState } from "../types";

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
