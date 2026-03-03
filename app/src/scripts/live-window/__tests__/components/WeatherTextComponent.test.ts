import { describe, it, expect, beforeEach } from "vitest";
import { WeatherTextComponent } from "../../components/WeatherTextComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(overrides?: {
  hideWeatherText?: boolean;
  temp?: number;
  description?: string;
  icon?: string;
}): LiveWindowState {
  const hasWeather = overrides?.temp != null;
  const store = {
    ...DEFAULT_STATE,
    weather: {
      ...DEFAULT_STATE.weather,
      units: "metric",
      current: hasWeather
        ? {
            main: "Clouds",
            description: overrides?.description ?? "scattered clouds",
            icon: overrides?.icon ?? "03d",
            temp: overrides?.temp ?? 0,
          }
        : null,
    },
  };
  return {
    store,
    computed: { phase: buildPhaseInfo(store, Date.now()) },
    ref: {
      currentGradient: {
        zenith: { r: 65, g: 150, b: 240 },
        upper: { r: 110, g: 180, b: 245 },
        lower: { r: 160, g: 210, b: 250 },
        horizon: { r: 200, g: 225, b: 245 },
      },
    },
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: overrides?.hideWeatherText ?? false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
      timezone: null,
      label: null,
    },
  };
}

describe("WeatherTextComponent", () => {
  let comp: WeatherTextComponent;
  let container: HTMLElement;

  beforeEach(() => {
    comp = new WeatherTextComponent();
    container = document.createElement("div");
    comp.mount(container);
  });

  it("creates weather text element on mount", () => {
    expect(container.querySelector(".current-weather-text")).toBeTruthy();
  });

  it("shows weather text when weather data exists", () => {
    comp.update(makeState({ temp: 22, description: "clear sky" }));
    const el = container.querySelector(".current-weather-text") as HTMLElement;
    expect(el.textContent).toContain("22");
    expect(el.textContent).toContain("clear sky");
    expect(el.hidden).toBe(false);
  });

  it("hides weather text when no weather data", () => {
    comp.update(makeState());
    const el = container.querySelector(".current-weather-text") as HTMLElement;
    expect(el.hidden).toBe(true);
  });

  it("hides weather text when hideWeatherText is true", () => {
    comp.update(makeState({ temp: 22, hideWeatherText: true }));
    const el = container.querySelector(".current-weather-text") as HTMLElement;
    expect(el.hidden).toBe(true);
  });

  it("cleans up on destroy", () => {
    comp.destroy();
    expect(container.innerHTML).toBe("");
  });
});
