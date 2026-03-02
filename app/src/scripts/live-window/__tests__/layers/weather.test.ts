import { describe, it, expect, beforeEach } from "vitest";
import { WeatherLayer, ICON_WEATHER_MAP } from "../../layers/weather";
import type { PhaseInfo } from "../../types";

function makePhaseInfo(icon: string | null): PhaseInfo {
  return {
    now: Date.now(),
    sunrise: null,
    sunset: null,
    phaseIndex: 8,
    nextPhaseIndex: 9,
    t: 0.5,
    isDaytime: true,
    sun: { altitude: 45, azimuth: 180, progress: 0.5 },
    weather: { icon, main: null, description: null, temp: null },
  };
}

describe("ICON_WEATHER_MAP", () => {
  it("maps all expected icon codes", () => {
    const expectedCodes = [
      "02d",
      "02n",
      "03d",
      "03n",
      "04d",
      "04n",
      "09d",
      "09n",
      "10d",
      "10n",
      "11d",
      "11n",
      "13d",
      "13n",
      "50d",
      "50n",
    ];
    for (const code of expectedCodes) {
      expect(ICON_WEATHER_MAP[code]).toBeDefined();
    }
  });
});

describe("WeatherLayer", () => {
  let layer: WeatherLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new WeatherLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("renders nothing when icon is null", () => {
    layer.update(makePhaseInfo(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders clouds for partly cloudy (02d)", () => {
    layer.update(makePhaseInfo("02d"));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
  });

  it("renders droplets for rain (10d)", () => {
    layer.update(makePhaseInfo("10d"));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders lightning for thunderstorm (11d)", () => {
    layer.update(makePhaseInfo("11d"));
    expect(container.querySelector(".lightning")).toBeTruthy();
  });

  it("renders mist layers for mist (50d)", () => {
    layer.update(makePhaseInfo("50d"));
    expect(container.querySelector(".mist-lg")).toBeTruthy();
    expect(container.querySelector(".mist-md")).toBeTruthy();
    expect(container.querySelector(".mist-sm")).toBeTruthy();
  });

  it("renders snow mounds for snow (13d)", () => {
    layer.update(makePhaseInfo("13d"));
    expect(container.querySelector(".snow-sill")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("cleans up on destroy", () => {
    layer.update(makePhaseInfo("10d"));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
