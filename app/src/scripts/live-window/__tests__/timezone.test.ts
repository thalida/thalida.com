import { describe, it, expect, vi, afterEach } from "vitest";
import { getTimezoneAdjustedNow, shiftTimestampToTimezone } from "../utils/timezone";

describe("getTimezoneAdjustedNow", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a shifted timestamp for a positive offset timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const tokyoDate = new Date(getTimezoneAdjustedNow("Asia/Tokyo"));

    expect(tokyoDate.getHours()).toBe(21);
    expect(tokyoDate.getMinutes()).toBe(0);
  });

  it("returns a shifted timestamp for a negative offset timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const nyDate = new Date(getTimezoneAdjustedNow("America/New_York"));

    expect(nyDate.getHours()).toBe(8);
    expect(nyDate.getMinutes()).toBe(0);
  });

  it("returns correct time for a half-hour offset timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const kolkataDate = new Date(getTimezoneAdjustedNow("Asia/Kolkata"));

    expect(kolkataDate.getHours()).toBe(17);
    expect(kolkataDate.getMinutes()).toBe(30);
  });

  it("returns UTC time when timezone is UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const utcDate = new Date(getTimezoneAdjustedNow("UTC"));
    expect(utcDate.getHours()).toBe(12);
  });
});

describe("shiftTimestampToTimezone", () => {
  it("shifts an arbitrary UTC timestamp to the target timezone wall clock", () => {
    // 2025-06-15T08:30:00Z → in Asia/Tokyo (UTC+9) that's 17:30
    const utcMs = new Date("2025-06-15T08:30:00Z").getTime();
    const shifted = new Date(shiftTimestampToTimezone(utcMs, "Asia/Tokyo"));

    expect(shifted.getHours()).toBe(17);
    expect(shifted.getMinutes()).toBe(30);
  });

  it("shifts sunrise/sunset UTC timestamps to match timezone-adjusted now", () => {
    // Simulating Sydney (UTC+11) at 05:04 UTC → 16:04 AEDT
    // Sunrise at 19:30 UTC (previous day) → 06:30 AEDT
    // Sunset at 08:30 UTC → 19:30 AEDT
    const nowUtc = new Date("2025-03-03T05:04:00Z").getTime();
    const sunriseUtc = new Date("2025-03-02T19:30:00Z").getTime();
    const sunsetUtc = new Date("2025-03-03T08:30:00Z").getTime();

    const tz = "Australia/Sydney";
    const shiftedNow = shiftTimestampToTimezone(nowUtc, tz);
    const shiftedSunrise = shiftTimestampToTimezone(sunriseUtc, tz);
    const shiftedSunset = shiftTimestampToTimezone(sunsetUtc, tz);

    // now (16:04) should be between sunrise (06:30) and sunset (19:30)
    const isDaytime = shiftedNow >= shiftedSunrise && shiftedNow <= shiftedSunset;
    expect(isDaytime).toBe(true);

    // Verify wall-clock hours are correct
    expect(new Date(shiftedNow).getHours()).toBe(16);
    expect(new Date(shiftedSunrise).getHours()).toBe(6);
    expect(new Date(shiftedSunset).getHours()).toBe(19);
  });

  it("correctly identifies nighttime when shifted timestamps are used", () => {
    // Sydney at 22:00 AEDT (11:00 UTC) → should be nighttime
    const nowUtc = new Date("2025-03-03T11:00:00Z").getTime();
    const sunriseUtc = new Date("2025-03-02T19:30:00Z").getTime();
    const sunsetUtc = new Date("2025-03-03T08:30:00Z").getTime();

    const tz = "Australia/Sydney";
    const shiftedNow = shiftTimestampToTimezone(nowUtc, tz);
    const shiftedSunrise = shiftTimestampToTimezone(sunriseUtc, tz);
    const shiftedSunset = shiftTimestampToTimezone(sunsetUtc, tz);

    const isDaytime = shiftedNow >= shiftedSunrise && shiftedNow <= shiftedSunset;
    expect(isDaytime).toBe(false);

    expect(new Date(shiftedNow).getHours()).toBe(22);
  });
});
