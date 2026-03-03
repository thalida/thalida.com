import { describe, it, expect, vi, afterEach } from "vitest";
import { getTimezoneAdjustedNow } from "../utils/timezone";

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
