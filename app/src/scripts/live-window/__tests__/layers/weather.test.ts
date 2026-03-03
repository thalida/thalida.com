import { describe, it, expect, beforeEach } from "vitest";
import { WeatherLayer, ICON_WEATHER_MAP } from "../../components/sky/WeatherLayer";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(icon: string | null): LiveWindowState {
  const store = {
    ...DEFAULT_STATE,
    weather: {
      ...DEFAULT_STATE.weather,
      current: icon ? { main: "Test", description: "test", icon, temp: 20 } : null,
    },
  };
  return {
    store,
    computed: { phase: buildPhaseInfo(store, Date.now()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
      timezone: null,
      label: null,
    },
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
    layer.update(makeState(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders clouds for partly cloudy (02d)", () => {
    layer.update(makeState("02d"));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
  });

  it("renders droplets for rain (10d)", () => {
    layer.update(makeState("10d"));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders lightning for thunderstorm (11d)", () => {
    layer.update(makeState("11d"));
    expect(container.querySelector(".lightning")).toBeTruthy();
  });

  it("renders mist layers for mist (50d)", () => {
    layer.update(makeState("50d"));
    expect(container.querySelector(".mist-lg")).toBeTruthy();
    expect(container.querySelector(".mist-md")).toBeTruthy();
    expect(container.querySelector(".mist-sm")).toBeTruthy();
  });

  it("renders snow mounds for snow (13d)", () => {
    layer.update(makeState("13d"));
    expect(container.querySelector(".snow-sill")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("cleans up on destroy", () => {
    layer.update(makeState("10d"));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
