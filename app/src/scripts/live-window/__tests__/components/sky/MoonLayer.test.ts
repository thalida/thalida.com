import { describe, it, expect, beforeEach, vi } from "vitest";
import { MoonLayer } from "../../../components/sky/MoonLayer";
import { makeTestState } from "../../helpers";

function makeState(hours: number) {
  return makeTestState({ hours, sunrise: 6, sunset: 18 });
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

  it("updates moon-shadow with translateX based on lunar phase", () => {
    layer.update(makeState(0));
    const shadow = container.querySelector(".moon-shadow") as HTMLElement;
    expect(shadow).toBeTruthy();
    expect(shadow.style.transform).toContain("translateX");
  });

  it("clears DOM on destroy", () => {
    layer.update(makeState(0));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
