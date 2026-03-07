import { describe, it, expect } from "vitest";
import { makeTestState } from "./helpers";

describe("override attributes", () => {
  describe("override-time", () => {
    it("uses override time instead of real time for phase calculation", () => {
      // Simulate noon — should be midday phase (index 8)
      const state = makeTestState({ hours: 12, sunrise: 6, sunset: 18 });
      expect(state.computed.phase.phaseIndex).toBe(8);

      // Simulate 1 AM — should be night phase (index 0)
      const nightState = makeTestState({ hours: 1, sunrise: 6, sunset: 18 });
      expect(nightState.computed.phase.phaseIndex).toBe(0);
    });
  });

  describe("override-weather", () => {
    it("injects weather icon into phase info", () => {
      const state = makeTestState({
        hours: 12,
        sunrise: 6,
        sunset: 18,
        store: {
          weather: {
            current: { main: "Rain", description: "heavy rain", icon: "10d", temp: 15 },
          },
        },
      });
      expect(state.computed.phase.weather.icon).toBe("10d");
      expect(state.computed.phase.weather.description).toBe("heavy rain");
    });
  });

  describe("override-sunrise/sunset", () => {
    it("changes phase timestamps based on overridden sun times", () => {
      // With sunrise at 4 AM: at 5 AM should be earlyMorning (index 6)
      // because goldenHourAm=4:30, earlyMorning=5:00 and now >= 5:00
      const earlyState = makeTestState({ hours: 5, sunrise: 4, sunset: 20 });
      expect(earlyState.computed.phase.phaseIndex).toBe(6);

      // With sunrise at 8 AM: at 5 AM should still be night (index 0)
      // because astronomicalDawn starts at 6:30 AM (sunrise - 90min)
      const lateState = makeTestState({ hours: 5, sunrise: 8, sunset: 20 });
      expect(lateState.computed.phase.phaseIndex).toBe(0);
    });
  });
});
