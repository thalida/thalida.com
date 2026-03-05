import { describe, it, expect, beforeEach } from "vitest";
import { GradientLayer } from "../../../components/sky/GradientLayer";
import { makeTestState } from "../../helpers";

function makeState() {
  return makeTestState({ hours: 12 });
}

describe("GradientLayer", () => {
  let layer: GradientLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new GradientLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("sets sky-layer class on mount", () => {
    expect(container.className).toBe("sky-layer");
  });

  it("sets background gradient on update", () => {
    const state = makeState();
    layer.update(state);
    expect(container.style.background).toContain("linear-gradient");
  });

  it("writes currentGradient to state.ref", () => {
    const state = makeState();
    layer.update(state);
    expect(state.ref.currentGradient).toBeDefined();
    expect(state.ref.currentGradient?.zenith).toBeDefined();
    expect(state.ref.currentGradient?.horizon).toBeDefined();
  });

  it("clears element on destroy", () => {
    const state = makeState();
    layer.update(state);
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
