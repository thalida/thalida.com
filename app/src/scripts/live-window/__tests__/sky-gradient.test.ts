import { describe, it, expect } from "vitest";
import { SKY_PHASES, calculatePhaseTimestamps, getDefaultSunTimes } from "../sky-gradient";

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
});
