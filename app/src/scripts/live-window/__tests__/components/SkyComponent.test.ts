import { describe, it, expect, beforeEach } from "vitest";
import { SkyComponent } from "../../components/SkyComponent";
import { makeTestState } from "../helpers";

function makeState() {
  return makeTestState({ hours: 12 });
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
