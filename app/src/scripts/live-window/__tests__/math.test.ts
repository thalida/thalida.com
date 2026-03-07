import { describe, it, expect } from "vitest";
import { clamp01, lerp, smoothstep, knuthHash } from "../utils/math";

describe("clamp01", () => {
  it("returns 0 for negative values", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it("returns 1 for values above 1", () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });

  it("passes through values in [0, 1]", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });
});

describe("lerp", () => {
  it("returns a at t=0", () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it("returns b at t=1", () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("returns midpoint at t=0.5", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it("works with negative values", () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe("smoothstep", () => {
  it("returns 0 at t=0", () => {
    expect(smoothstep(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(smoothstep(1)).toBe(1);
  });

  it("returns 0.5 at t=0.5", () => {
    expect(smoothstep(0.5)).toBe(0.5);
  });

  it("has zero derivative at endpoints (S-curve)", () => {
    // Values near 0 should be very close to 0
    expect(smoothstep(0.01)).toBeLessThan(0.01);
    // Values near 1 should be very close to 1
    expect(smoothstep(0.99)).toBeGreaterThan(0.99);
  });
});

describe("knuthHash", () => {
  it("returns a deterministic value", () => {
    expect(knuthHash(0)).toBe(knuthHash(0));
    expect(knuthHash(5)).toBe(knuthHash(5));
  });

  it("returns different values for different inputs", () => {
    expect(knuthHash(0)).not.toBe(knuthHash(1));
    expect(knuthHash(1)).not.toBe(knuthHash(2));
  });

  it("returns unsigned 32-bit integers", () => {
    for (let i = 0; i < 10; i++) {
      const h = knuthHash(i);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
