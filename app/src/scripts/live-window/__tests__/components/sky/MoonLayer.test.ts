import { describe, it, expect, beforeEach, vi } from "vitest";
import { MoonLayer } from "../../../components/sky/MoonLayer";
import type { LiveWindowState } from "../../../types";
import { buildPhaseInfo } from "../../../utils/phase";
import { DEFAULT_STATE } from "../../../state";

function makeState(hours: number): LiveWindowState {
  const store = {
    ...DEFAULT_STATE,
    weather: {
      ...DEFAULT_STATE.weather,
      sunrise: new Date().setHours(6, 0, 0, 0),
      sunset: new Date().setHours(18, 0, 0, 0),
    },
  };
  const now = new Date();
  now.setHours(hours, 0, 0, 0);
  return {
    store,
    computed: { phase: buildPhaseInfo(store, now.getTime()) },
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

describe("MoonLayer", () => {
  let layer: MoonLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new MoonLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("sets sky-layer moon-layer class on mount", () => {
    expect(container.className).toBe("sky-layer moon-layer");
  });

  it("creates moon and moon-shadow elements on first update", () => {
    layer.update(makeState(1));
    expect(container.querySelector(".moon")).toBeTruthy();
    expect(container.querySelector(".moon-shadow")).toBeTruthy();
  });

  it("has opacity > 0 when moon is above horizon at night", () => {
    // At full moon (phase ~0.5), moon should be visible at midnight
    vi.useFakeTimers();
    // Set to a known full moon date: Jan 29+14.76 days = ~Feb 13, 2025
    vi.setSystemTime(new Date(2025, 1, 13, 0, 0));
    layer.update(makeState(0)); // midnight
    const opacity = parseFloat(container.style.opacity);
    // Full moon at midnight should be visible (opacity > 0)
    expect(opacity).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("updates moon-shadow with rotateY based on lunar phase", () => {
    layer.update(makeState(0));
    const shadow = container.querySelector(".moon-shadow") as HTMLElement;
    expect(shadow).toBeTruthy();
    // Shadow should have a rotateY transform for phase rendering
    expect(shadow.style.transform).toContain("rotateY");
  });

  it("clears DOM on destroy", () => {
    layer.update(makeState(0));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
