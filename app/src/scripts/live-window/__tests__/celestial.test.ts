import { describe, it, expect } from "vitest";
import { getMoonPhase, getSunAngle, getMoonAngle, getArcPosition } from "../utils/celestial";

describe("getSunAngle", () => {
  it("returns 0 (top) at solar noon", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    const noon = new Date(2026, 2, 2, 12, 0).getTime();
    expect(getSunAngle(noon, sunrise, sunset)).toBeCloseTo(0, 1);
  });

  it("returns π (bottom) at midnight", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    const midnight = new Date(2026, 2, 3, 0, 0).getTime();
    expect(getSunAngle(midnight, sunrise, sunset)).toBeCloseTo(Math.PI, 1);
  });

  it("returns ~π/2 at sunset", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    expect(getSunAngle(sunset, sunrise, sunset)).toBeCloseTo(Math.PI / 2, 1);
  });

  it("returns ~3π/2 at sunrise", () => {
    const sunrise = new Date(2026, 2, 2, 6, 0).getTime();
    const sunset = new Date(2026, 2, 2, 18, 0).getTime();
    expect(getSunAngle(sunrise, sunrise, sunset)).toBeCloseTo((3 * Math.PI) / 2, 1);
  });
});

describe("getMoonPhase", () => {
  it("returns ~0 on a known new moon date", () => {
    const newMoon = new Date(2025, 0, 29, 12, 0).getTime();
    expect(getMoonPhase(newMoon)).toBeCloseTo(0, 1);
  });

  it("returns ~0.5 approximately 14.76 days after new moon (full moon)", () => {
    const newMoon = new Date(2025, 0, 29, 12, 0).getTime();
    const fullMoon = newMoon + 14.765 * 24 * 60 * 60 * 1000;
    expect(getMoonPhase(fullMoon)).toBeCloseTo(0.5, 1);
  });

  it("returns value between 0 and 1", () => {
    const phase = getMoonPhase(Date.now());
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
  });

  it("cycles back near 0 after ~29.53 days", () => {
    const start = new Date(2025, 0, 29, 12, 0).getTime();
    const oneMonth = start + 29.53 * 24 * 60 * 60 * 1000;
    expect(getMoonPhase(oneMonth)).toBeCloseTo(0, 1);
  });
});

describe("getMoonAngle", () => {
  it("equals sun angle at new moon (phase 0)", () => {
    const sunAngle = 1.5;
    expect(getMoonAngle(sunAngle, 0)).toBeCloseTo(sunAngle, 5);
  });

  it("is opposite sun at full moon (phase 0.5)", () => {
    const sunAngle = 0;
    const moonAngle = getMoonAngle(sunAngle, 0.5);
    expect(moonAngle).toBeCloseTo(Math.PI, 1);
  });

  it("wraps around to stay in 0–2π range", () => {
    const moonAngle = getMoonAngle(0.5, 0.75);
    expect(moonAngle).toBeGreaterThanOrEqual(0);
    expect(moonAngle).toBeLessThan(2 * Math.PI);
  });
});

describe("getArcPosition", () => {
  it("returns visible=true and y near top at angle 0 (zenith)", () => {
    const pos = getArcPosition(0);
    expect(pos.visible).toBe(true);
    expect(pos.y).toBeLessThan(20);
  });

  it("returns visible=true at angle π/4 (between zenith and horizon)", () => {
    const pos = getArcPosition(Math.PI / 4);
    expect(pos.visible).toBe(true);
  });

  it("returns visible=false at angle π (nadir/bottom)", () => {
    const pos = getArcPosition(Math.PI);
    expect(pos.visible).toBe(false);
  });

  it("returns visible=false at angle 3π/4 (below horizon)", () => {
    const pos = getArcPosition((3 * Math.PI) / 4);
    expect(pos.visible).toBe(false);
  });

  it("x increases from left to right as angle goes from 3π/2 toward 0 toward π/2", () => {
    const rising = getArcPosition((3 * Math.PI) / 2);
    const zenith = getArcPosition(0);
    const setting = getArcPosition(Math.PI / 2);
    expect(rising.x).toBeLessThan(zenith.x);
    expect(zenith.x).toBeLessThan(setting.x);
  });

  it("y is lowest at horizon and highest at zenith", () => {
    const zenith = getArcPosition(0);
    const midway = getArcPosition(Math.PI / 4);
    expect(zenith.y).toBeLessThan(midway.y);
  });
});
