import { describe, it, expect, beforeEach } from "vitest";
import { GradientLayer } from "../../../components/sky/GradientLayer";
import type { LiveWindowState } from "../../../types";
import { buildPhaseInfo } from "../../../utils/phase";
import { DEFAULT_STATE } from "../../../state";

function makeState(overrides?: Partial<LiveWindowState>): LiveWindowState {
  const store = overrides?.store ?? DEFAULT_STATE;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return {
    store,
    computed: { phase: buildPhaseInfo(store, today.getTime()) },
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
    ...overrides,
  };
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
