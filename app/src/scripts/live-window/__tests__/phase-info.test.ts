import { describe, it, expect } from "vitest";
import { buildPhaseInfo, calculateSunPosition } from "../utils/phase";
import { DEFAULT_STATE } from "../state";
import type { StoreState } from "../types";

describe("calculateSunPosition", () => {
  const today = new Date();
  today.setHours(7, 0, 0, 0);
  const sunrise = today.getTime();
  today.setHours(19, 0, 0, 0);
  const sunset = today.getTime();

  it("returns progress=0 at sunrise", () => {
    const pos = calculateSunPosition(sunrise, sunrise, sunset);
    expect(pos.progress).toBeCloseTo(0, 4);
    expect(pos.altitude).toBeCloseTo(0, 0);
  });

  it("returns progress=0.5 at solar noon", () => {
    const noon = (sunrise + sunset) / 2;
    const pos = calculateSunPosition(noon, sunrise, sunset);
    expect(pos.progress).toBeCloseTo(0.5, 4);
    expect(pos.altitude).toBeGreaterThan(0);
  });

  it("returns progress=1 at sunset", () => {
    const pos = calculateSunPosition(sunset, sunrise, sunset);
    expect(pos.progress).toBeCloseTo(1, 4);
    expect(pos.altitude).toBeCloseTo(0, 0);
  });

  it("returns progress=-1 at night", () => {
    const midnight = new Date(sunrise);
    midnight.setHours(2, 0, 0, 0);
    const pos = calculateSunPosition(midnight.getTime(), sunrise, sunset);
    expect(pos.progress).toBe(-1);
  });

  it("azimuth goes from ~90 (east) at sunrise to ~270 (west) at sunset", () => {
    const srPos = calculateSunPosition(sunrise, sunrise, sunset);
    const ssPos = calculateSunPosition(sunset, sunrise, sunset);
    expect(srPos.azimuth).toBeCloseTo(90, 0);
    expect(ssPos.azimuth).toBeCloseTo(270, 0);
  });
});

describe("buildPhaseInfo", () => {
  it("returns isDaytime=true during daytime", () => {
    const today = new Date();
    today.setHours(7, 0, 0, 0);
    const sunrise = today.getTime();
    today.setHours(19, 0, 0, 0);
    const sunset = today.getTime();
    today.setHours(12, 0, 0, 0);
    const noon = today.getTime();

    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, sunrise, sunset },
    };
    const info = buildPhaseInfo(state, noon);
    expect(info.isDaytime).toBe(true);
    expect(info.phaseIndex).toBeGreaterThanOrEqual(0);
    expect(info.t).toBeGreaterThanOrEqual(0);
    expect(info.t).toBeLessThanOrEqual(1);
  });

  it("returns isDaytime=false at midnight", () => {
    const today = new Date();
    today.setHours(7, 0, 0, 0);
    const sunrise = today.getTime();
    today.setHours(19, 0, 0, 0);
    const sunset = today.getTime();
    today.setHours(2, 0, 0, 0);
    const night = today.getTime();

    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: { ...DEFAULT_STATE.weather, sunrise, sunset },
    };
    const info = buildPhaseInfo(state, night);
    expect(info.isDaytime).toBe(false);
  });

  it("uses default sun times when sunrise/sunset are null", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const info = buildPhaseInfo(DEFAULT_STATE, today.getTime());
    expect(info.phaseIndex).toBeGreaterThanOrEqual(0);
    expect(info.phaseIndex).toBeLessThan(16);
  });

  it("populates weather info from state", () => {
    const state: StoreState = {
      ...DEFAULT_STATE,
      weather: {
        ...DEFAULT_STATE.weather,
        current: { main: "Clouds", description: "scattered clouds", icon: "03d", temp: 22 },
      },
    };
    const info = buildPhaseInfo(state, Date.now());
    expect(info.weather.icon).toBe("03d");
    expect(info.weather.main).toBe("Clouds");
    expect(info.weather.temp).toBe(22);
  });
});
