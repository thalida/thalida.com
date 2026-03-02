import { describe, it, expect, beforeEach } from "vitest";
import { BlindsComponent } from "../../components/BlindsComponent";

describe("BlindsComponent", () => {
  let blinds: BlindsComponent;
  let container: HTMLElement;

  beforeEach(() => {
    blinds = new BlindsComponent();
    container = document.createElement("div");
    blinds.mount(container);
  });

  it("creates blinds HTML structure on mount", () => {
    expect(container.querySelector(".blinds")).toBeTruthy();
    expect(container.querySelector(".blinds-string-left")).toBeTruthy();
    expect(container.querySelector(".blinds-string-right")).toBeTruthy();
  });

  it("renders slats on mount", () => {
    expect(container.querySelector(".slats")).toBeTruthy();
    expect(container.querySelector(".slat")).toBeTruthy();
  });

  it("cleans up on destroy", () => {
    blinds.destroy();
    expect(container.innerHTML).toBe("");
  });
});
