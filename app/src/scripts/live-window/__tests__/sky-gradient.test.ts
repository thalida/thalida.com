import { describe, it, expect } from "vitest";
import { SKY_PHASES } from "../sky-gradient";

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
