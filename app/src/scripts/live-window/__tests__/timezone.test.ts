import { describe, it, expect, vi } from "vitest";
import { getTimezoneAdjustedNow } from "../utils/timezone";

describe("getTimezoneAdjustedNow", () => {
  it("returns a shifted timestamp for a different timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const tokyoNow = getTimezoneAdjustedNow("Asia/Tokyo");
    const tokyoDate = new Date(tokyoNow);

    expect(tokyoDate.getHours()).toBe(21);
    expect(tokyoDate.getMinutes()).toBe(0);

    vi.useRealTimers();
  });

  it("returns a shifted timestamp for a negative offset timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const nyNow = getTimezoneAdjustedNow("America/New_York");
    const nyDate = new Date(nyNow);

    expect(nyDate.getHours()).toBe(8);
    expect(nyDate.getMinutes()).toBe(0);

    vi.useRealTimers();
  });

  it("returns UTC time when timezone is UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const utcNow = getTimezoneAdjustedNow("UTC");
    const utcDate = new Date(utcNow);
    expect(utcDate.getHours()).toBe(12);

    vi.useRealTimers();
  });
});
