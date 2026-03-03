import { describe, it, expect, beforeEach } from "vitest";
import { SkyComponent } from "../../components/SkyComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(): LiveWindowState {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return {
    store: DEFAULT_STATE,
    computed: { phase: buildPhaseInfo(DEFAULT_STATE, today.getTime()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
      timezone: null,
    },
  };
}

describe("SkyComponent", () => {
  let sky: SkyComponent;
  let container: HTMLElement;

  beforeEach(() => {
    sky = new SkyComponent();
    container = document.createElement("div");
    sky.mount(container);
  });

  it("sets sky class on container", () => {
    expect(container.className).toBe("sky");
  });

  it("mounts child layers as divs inside container", () => {
    expect(container.children.length).toBe(5);
  });

  it("populates state.ref.currentGradient after update", () => {
    const state = makeState();
    sky.update(state);
    expect(state.ref.currentGradient).toBeDefined();
  });

  it("cleans up children on destroy", () => {
    const state = makeState();
    sky.update(state);
    sky.destroy();
    for (const child of container.children) {
      expect((child as HTMLElement).innerHTML).toBe("");
    }
  });
});
