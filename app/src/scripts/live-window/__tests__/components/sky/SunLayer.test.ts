import { describe, it, expect, beforeEach } from "vitest";
import { SunLayer } from "../../../components/sky/SunLayer";
import { makeTestState } from "../../helpers";

function makeState(hours: number) {
  return makeTestState({ hours, sunrise: 6, sunset: 18 });
}

describe("SunLayer", () => {
  let layer: SunLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new SunLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("sets sky-layer sun-layer class on mount", () => {
    expect(container.className).toBe("sky-layer sun-layer");
  });

  it("creates a sun element on first update", () => {
    layer.update(makeState(12));
    expect(container.querySelector(".sun")).toBeTruthy();
  });

  it("positions sun in visible area during daytime (noon)", () => {
    layer.update(makeState(12));
    const opacity = parseFloat(container.style.opacity);
    expect(opacity).toBeGreaterThan(0);
  });

  it("hides sun at night (1 AM)", () => {
    layer.update(makeState(1));
    const opacity = parseFloat(container.style.opacity);
    expect(opacity).toBe(0);
  });

  it("sun x position moves left to right during the day", () => {
    layer.update(makeState(8)); // morning
    const sunMorning = container.querySelector(".sun") as HTMLElement;
    const leftMorning = parseFloat(sunMorning.style.left);

    layer.update(makeState(16)); // afternoon
    const sunAfternoon = container.querySelector(".sun") as HTMLElement;
    const leftAfternoon = parseFloat(sunAfternoon.style.left);

    expect(leftAfternoon).toBeGreaterThan(leftMorning);
  });

  it("clears DOM on destroy", () => {
    layer.update(makeState(12));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
