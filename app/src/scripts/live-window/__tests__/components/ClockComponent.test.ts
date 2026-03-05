import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClockComponent } from "../../components/ClockComponent";
import { makeTestState } from "../helpers";

function makeState(use12Hour = false) {
  return makeTestState({ use12Hour });
}

describe("ClockComponent", () => {
  let clock: ClockComponent;
  let container: HTMLElement;

  beforeEach(() => {
    clock = new ClockComponent();
    container = document.createElement("div");
    clock.mount(container);
  });

  it("creates clock HTML structure on mount", () => {
    expect(container.querySelector(".clock")).toBeTruthy();
    expect(container.querySelector(".clock-hour")).toBeTruthy();
    expect(container.querySelector(".clock-minute")).toBeTruthy();
    expect(container.querySelector(".clock-ampm")).toBeTruthy();
  });

  it("updates time display on update", () => {
    clock.update(makeState());
    const hourEl = container.querySelector(".clock-hour") as HTMLElement;
    const minuteEl = container.querySelector(".clock-minute") as HTMLElement;
    expect(hourEl.textContent).toBeTruthy();
    expect(minuteEl.textContent).toBeTruthy();
  });

  it("hides ampm when in 24-hour mode", () => {
    clock.update(makeState(false));
    const ampmEl = container.querySelector(".clock-ampm") as HTMLElement;
    expect(ampmEl.hidden).toBe(true);
  });

  it("shows ampm when in 12-hour mode", () => {
    clock.update(makeState(true));
    const ampmEl = container.querySelector(".clock-ampm") as HTMLElement;
    expect(ampmEl.hidden).toBe(false);
  });

  it("respects hideClock attr", () => {
    const state = makeState();
    state.attrs.hideClock = true;
    clock.update(state);
    const clockEl = container.querySelector(".clock") as HTMLElement;
    expect(clockEl.hidden).toBe(true);
  });

  it("cleans up on destroy", () => {
    clock.update(makeState());
    clock.destroy();
    expect(container.innerHTML).toBe("");
  });

  it("returns hour and minute from lastTick after update", () => {
    clock.update(makeState());
    const tick = clock.lastTick;
    expect(tick).toBeDefined();
    expect(tick?.hour).toBeGreaterThanOrEqual(0);
    expect(tick?.hour).toBeLessThan(24);
    expect(tick?.minute).toBeGreaterThanOrEqual(0);
    expect(tick?.minute).toBeLessThan(60);
  });

  describe("timezone support", () => {
    it("displays time in the specified timezone", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const state = makeState();
      state.attrs.timezone = "Asia/Tokyo"; // UTC+9 → 21:00

      clock.update(state);

      const hourEl = container.querySelector(".clock-hour") as HTMLElement;
      expect(hourEl.textContent).toBe("21");

      vi.useRealTimers();
    });

    it("falls back to local time when timezone is null", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const state = makeState();
      state.attrs.timezone = null;

      clock.update(state);

      const hourEl = container.querySelector(".clock-hour") as HTMLElement;
      expect(hourEl.textContent).toBeTruthy();

      vi.useRealTimers();
    });
  });
});
