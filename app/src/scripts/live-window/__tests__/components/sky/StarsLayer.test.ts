import { describe, it, expect, beforeEach } from "vitest";
import { StarsLayer } from "../../../components/sky/StarsLayer";
import { makeTestState } from "../../helpers";

function makeState(hours: number) {
  return makeTestState({ hours, sunrise: 6, sunset: 18 });
}

describe("StarsLayer", () => {
  let layer: StarsLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new StarsLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("sets sky-layer stars class on mount", () => {
    expect(container.className).toBe("sky-layer stars");
  });

  it("generates star elements on first update", () => {
    layer.update(makeState(1)); // 1 AM — night
    const stars = container.querySelectorAll(".star");
    expect(stars.length).toBeGreaterThanOrEqual(35);
    expect(stars.length).toBeLessThanOrEqual(45);
  });

  it("does not regenerate stars on subsequent updates (same day)", () => {
    const nightState = makeState(1);
    layer.update(nightState);
    const firstHTML = container.innerHTML;
    layer.update(nightState);
    // innerHTML should be identical — stars not re-rendered
    expect(container.innerHTML).toBe(firstHTML);
  });

  it("sets opacity > 0 at night (1 AM)", () => {
    layer.update(makeState(1));
    const opacity = parseFloat(container.style.opacity);
    expect(opacity).toBeGreaterThan(0);
  });

  it("sets opacity to 0 during daytime (12 PM)", () => {
    layer.update(makeState(12));
    expect(container.style.opacity).toBe("0");
  });

  it("each star has inline animation styles", () => {
    layer.update(makeState(1));
    const star = container.querySelector(".star") as HTMLElement;
    expect(star).toBeTruthy();
    expect(star.style.animationDuration).toBeTruthy();
    expect(star.style.animationDelay).toBeTruthy();
  });

  it("clears DOM on destroy", () => {
    layer.update(makeState(1));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
