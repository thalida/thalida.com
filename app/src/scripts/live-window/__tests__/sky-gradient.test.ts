import { describe, it, expect } from "vitest";
import {
  SKY_PHASES,
  calculatePhaseTimestamps,
  getDefaultSunTimes,
  blendGradient,
  getCurrentSkyGradient,
} from "../layers/gradient";
import type { SkyGradient } from "../types";

describe("SKY_PHASES", () => {
  it("has exactly 16 phases", () => {
    expect(SKY_PHASES).toHaveLength(16);
  });

  it("every phase has a name and valid gradient with 4 RGB stops", () => {
    for (const phase of SKY_PHASES) {
      expect(phase.name).toBeTruthy();
      for (const stop of [phase.gradient.zenith, phase.gradient.upper, phase.gradient.lower, phase.gradient.horizon]) {
        expect(stop.r).toBeGreaterThanOrEqual(0);
        expect(stop.r).toBeLessThanOrEqual(255);
        expect(stop.g).toBeGreaterThanOrEqual(0);
        expect(stop.g).toBeLessThanOrEqual(255);
        expect(stop.b).toBeGreaterThanOrEqual(0);
        expect(stop.b).toBeLessThanOrEqual(255);
      }
    }
  });

  it("starts with night and ends with astronomicalDusk", () => {
    expect(SKY_PHASES[0].name).toBe("night");
    expect(SKY_PHASES[15].name).toBe("astronomicalDusk");
  });
});

describe("getDefaultSunTimes", () => {
  it("returns 6:00 sunrise and 18:00 sunset for today", () => {
    const { sunrise, sunset } = getDefaultSunTimes();
    const sr = new Date(sunrise);
    const ss = new Date(sunset);
    expect(sr.getHours()).toBe(6);
    expect(sr.getMinutes()).toBe(0);
    expect(ss.getHours()).toBe(18);
    expect(ss.getMinutes()).toBe(0);
  });
});

describe("calculatePhaseTimestamps", () => {
  // Use a fixed sunrise (7:00 AM) and sunset (7:00 PM) for test determinism
  const today = new Date();
  today.setHours(7, 0, 0, 0);
  const sunrise = today.getTime();
  today.setHours(19, 0, 0, 0);
  const sunset = today.getTime();

  it("returns exactly 16 timestamps", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps).toHaveLength(16);
  });

  it("timestamps are in strictly ascending order", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
    }
  });

  it("sunrise phase (index 4) matches the sunrise timestamp", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps[4]).toBe(sunrise);
  });

  it("sunset phase (index 12) matches the sunset timestamp", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps[12]).toBe(sunset);
  });

  it("twilight offsets are correct relative to sunrise/sunset", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    const MIN30 = 30 * 60_000;
    const MIN60 = 60 * 60_000;
    const MIN90 = 90 * 60_000;

    // Dawn twilights (before sunrise)
    expect(timestamps[1]).toBe(sunrise - MIN90); // astronomical dawn
    expect(timestamps[2]).toBe(sunrise - MIN60); // nautical dawn
    expect(timestamps[3]).toBe(sunrise - MIN30); // civil dawn

    // Dusk twilights (after sunset)
    expect(timestamps[13]).toBe(sunset + MIN30); // civil dusk
    expect(timestamps[14]).toBe(sunset + MIN60); // nautical dusk
    expect(timestamps[15]).toBe(sunset + MIN90); // astronomical dusk
  });

  it("solar noon (midday, index 8) is midpoint of sunrise and sunset", () => {
    const timestamps = calculatePhaseTimestamps(sunrise, sunset);
    expect(timestamps[8]).toBe((sunrise + sunset) / 2);
  });

  it("stays strictly ascending with very short days (polar winter)", () => {
    // 1 hour of daylight: sunrise 11:30 AM, sunset 12:30 PM
    const d = new Date();
    d.setHours(11, 30, 0, 0);
    const shortSunrise = d.getTime();
    d.setHours(12, 30, 0, 0);
    const shortSunset = d.getTime();
    const timestamps = calculatePhaseTimestamps(shortSunrise, shortSunset);
    expect(timestamps).toHaveLength(16);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
    }
  });

  it("stays strictly ascending with very long days (polar summer)", () => {
    // 22 hours of daylight: sunrise 1:00 AM, sunset 11:00 PM
    const d = new Date();
    d.setHours(1, 0, 0, 0);
    const longSunrise = d.getTime();
    d.setHours(23, 0, 0, 0);
    const longSunset = d.getTime();
    const timestamps = calculatePhaseTimestamps(longSunrise, longSunset);
    expect(timestamps).toHaveLength(16);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
    }
  });
});

describe("blendGradient", () => {
  const a: SkyGradient = {
    zenith: { r: 0, g: 0, b: 0 },
    upper: { r: 0, g: 0, b: 0 },
    lower: { r: 0, g: 0, b: 0 },
    horizon: { r: 0, g: 0, b: 0 },
  };
  const b: SkyGradient = {
    zenith: { r: 100, g: 200, b: 50 },
    upper: { r: 200, g: 100, b: 150 },
    lower: { r: 50, g: 50, b: 250 },
    horizon: { r: 255, g: 255, b: 255 },
  };

  it("returns first gradient at t=0", () => {
    const result = blendGradient(a, b, 0);
    expect(result.zenith).toEqual({ r: 0, g: 0, b: 0 });
    expect(result.horizon).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("returns second gradient at t=1", () => {
    const result = blendGradient(a, b, 1);
    expect(result.zenith).toEqual({ r: 100, g: 200, b: 50 });
    expect(result.horizon).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns midpoint at t=0.5", () => {
    const result = blendGradient(a, b, 0.5);
    expect(result.zenith).toEqual({ r: 50, g: 100, b: 25 });
    expect(result.upper).toEqual({ r: 100, g: 50, b: 75 });
    expect(result.lower).toEqual({ r: 25, g: 25, b: 125 });
    expect(result.horizon).toEqual({ r: 128, g: 128, b: 128 });
  });

  it("clamps t below 0 to 0", () => {
    const result = blendGradient(a, b, -0.5);
    expect(result.zenith).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("clamps t above 1 to 1", () => {
    const result = blendGradient(a, b, 1.5);
    expect(result.zenith).toEqual({ r: 100, g: 200, b: 50 });
  });
});

describe("getCurrentSkyGradient", () => {
  // Fixed sunrise 7:00 AM, sunset 7:00 PM
  const today = new Date();
  today.setHours(7, 0, 0, 0);
  const sunrise = today.getTime();
  today.setHours(19, 0, 0, 0);
  const sunset = today.getTime();

  it("returns night gradient at midnight", () => {
    const midnight = new Date(sunrise);
    midnight.setHours(0, 0, 0, 0);
    const result = getCurrentSkyGradient(midnight.getTime(), sunrise, sunset);
    // At midnight we are between night (0) and astronomicalDawn (1),
    // but at the very start so it should be close to night
    expect(result.zenith.r).toBeLessThan(15);
    expect(result.zenith.b).toBeLessThan(50);
  });

  it("returns midday-like gradient at solar noon", () => {
    const noon = (sunrise + sunset) / 2; // solar noon = 1:00 PM for 7AM-7PM
    const result = getCurrentSkyGradient(noon, sunrise, sunset);
    // Midday phase: bright blue zenith
    expect(result.zenith).toEqual(SKY_PHASES[8].gradient.zenith);
  });

  it("returns sunrise gradient at sunrise time", () => {
    const result = getCurrentSkyGradient(sunrise, sunrise, sunset);
    expect(result.zenith).toEqual(SKY_PHASES[4].gradient.zenith);
  });

  it("returns sunset gradient at sunset time", () => {
    const result = getCurrentSkyGradient(sunset, sunrise, sunset);
    expect(result.zenith).toEqual(SKY_PHASES[12].gradient.zenith);
  });

  it("uses default sun times when sunrise/sunset are null", () => {
    const { sunrise: defSr, sunset: defSs } = getDefaultSunTimes();
    const noon = (defSr + defSs) / 2;
    const result = getCurrentSkyGradient(noon, null as unknown as number, null as unknown as number);
    // Should still return a valid gradient (using defaults)
    expect(result.zenith.r).toBeGreaterThanOrEqual(0);
    expect(result.zenith.r).toBeLessThanOrEqual(255);
  });

  it("wraps correctly for time after astronomical dusk", () => {
    // 11:00 PM — well past astronomical dusk, should be night-like
    const late = new Date(sunrise);
    late.setHours(23, 0, 0, 0);
    const result = getCurrentSkyGradient(late.getTime(), sunrise, sunset);
    expect(result.zenith.r).toBeLessThan(15);
  });
});
