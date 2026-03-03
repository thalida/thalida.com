import { describe, it, expect, vi } from "vitest";
import { mulberry32, generateStars, getStarsOpacity, todaySeed } from "../utils/stars";

describe("mulberry32", () => {
  it("returns deterministic values for the same seed", () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
  });

  it("returns values between 0 and 1", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("returns different values for different seeds", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });
});

describe("generateStars", () => {
  it("generates 40 stars by default", () => {
    const stars = generateStars(20260302);
    expect(stars.length).toBe(40);
  });

  it("returns same stars for the same seed", () => {
    const a = generateStars(20260302);
    const b = generateStars(20260302);
    expect(a).toEqual(b);
  });

  it("returns different stars for different seeds", () => {
    const a = generateStars(20260302);
    const b = generateStars(20260303);
    expect(a).not.toEqual(b);
  });

  it("constrains star positions within bounds", () => {
    const stars = generateStars(20260302);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(100);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(70);
      expect(star.size).toBeGreaterThan(0);
      expect(star.size).toBeLessThanOrEqual(3.5);
      expect(star.baseOpacity).toBeGreaterThan(0);
      expect(star.baseOpacity).toBeLessThanOrEqual(1);
    }
  });

  it("produces a mix of tiers (dim, medium, bright)", () => {
    const stars = generateStars(20260302);
    const dims = stars.filter((s) => s.size <= 1.5);
    const mediums = stars.filter((s) => s.size > 1.5 && s.size <= 2.5);
    const brights = stars.filter((s) => s.size > 2.5);
    expect(dims.length).toBeGreaterThan(0);
    expect(mediums.length).toBeGreaterThan(0);
    expect(brights.length).toBeGreaterThan(0);
  });

  it("each star has twinkle animation properties", () => {
    const stars = generateStars(20260302);
    for (const star of stars) {
      expect(star.twinkleDuration).toBeGreaterThanOrEqual(2);
      expect(star.twinkleDuration).toBeLessThanOrEqual(5);
      expect(star.twinkleDelay).toBeGreaterThanOrEqual(0);
      expect(star.twinkleDelay).toBeLessThanOrEqual(5);
    }
  });

  it("bright stars have glow properties", () => {
    const stars = generateStars(20260302);
    const brights = stars.filter((s) => s.size > 2.5);
    for (const star of brights) {
      expect(star.glowSize).toBeGreaterThan(0);
    }
  });
});

describe("getStarsOpacity", () => {
  it("returns 1.0 for night phase (0)", () => {
    expect(getStarsOpacity(0, 0)).toBe(1.0);
  });

  it("returns 0 for daytime phases (4-12)", () => {
    for (let phase = 4; phase <= 12; phase++) {
      expect(getStarsOpacity(phase, 0)).toBe(0);
    }
  });

  it("returns decreasing opacity during dawn (phases 1-3)", () => {
    const dawn1 = getStarsOpacity(1, 0);
    const dawn2 = getStarsOpacity(2, 0);
    const dawn3 = getStarsOpacity(3, 0);
    expect(dawn1).toBeGreaterThan(dawn2);
    expect(dawn2).toBeGreaterThan(dawn3);
    expect(dawn3).toBeGreaterThan(0);
  });

  it("returns increasing opacity during dusk (phases 13-15)", () => {
    const dusk13 = getStarsOpacity(13, 0);
    const dusk14 = getStarsOpacity(14, 0);
    const dusk15 = getStarsOpacity(15, 0);
    expect(dusk15).toBeGreaterThan(dusk14);
    expect(dusk14).toBeGreaterThan(dusk13);
    expect(dusk13).toBeGreaterThan(0);
  });

  it("interpolates within a phase using t factor", () => {
    const mid = getStarsOpacity(1, 0.5);
    const start = getStarsOpacity(1, 0);
    const end = getStarsOpacity(2, 0);
    expect(mid).toBeLessThan(start);
    expect(mid).toBeGreaterThan(end);
  });
});

describe("todaySeed", () => {
  it("returns today's date when called after noon", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 14, 0)); // March 15, 2026 at 2 PM
    expect(todaySeed()).toBe(20260315);
    vi.useRealTimers();
  });

  it("returns previous day's date when called before noon", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 2, 0)); // March 15, 2026 at 2 AM
    expect(todaySeed()).toBe(20260314);
    vi.useRealTimers();
  });

  it("keeps the same seed from evening through next morning", () => {
    vi.useFakeTimers();
    // 8 PM on March 15
    vi.setSystemTime(new Date(2026, 2, 15, 20, 0));
    const eveningSeed = todaySeed();
    // 4 AM on March 16
    vi.setSystemTime(new Date(2026, 2, 16, 4, 0));
    const morningSeed = todaySeed();
    expect(eveningSeed).toBe(morningSeed);
    vi.useRealTimers();
  });
});
