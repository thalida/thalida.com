import { describe, it, expect, beforeEach } from "vitest";
import { InfoPanelComponent } from "../../components/InfoPanelComponent";
import type { LiveWindowState } from "../../types";
import { DEFAULT_STATE } from "../../state";
import { buildPhaseInfo } from "../../utils/phase";

function makeState(overrides?: {
  hideWeatherText?: boolean;
  temp?: number;
  description?: string;
  icon?: string;
  label?: string | null;
  locationName?: string | null;
  lat?: number | null;
  lng?: number | null;
  timezone?: string | null;
}): LiveWindowState {
  const hasWeather = overrides?.temp != null;
  const store = {
    ...DEFAULT_STATE,
    location: {
      ...DEFAULT_STATE.location,
      lat: overrides?.lat ?? null,
      lng: overrides?.lng ?? null,
      name: overrides?.locationName ?? null,
    },
    weather: {
      ...DEFAULT_STATE.weather,
      units: "metric",
      current: hasWeather
        ? {
            main: "Clouds",
            description: overrides?.description ?? "scattered clouds",
            icon: overrides?.icon ?? "03d",
            temp: overrides?.temp ?? 0,
          }
        : null,
    },
  };
  return {
    store,
    computed: { phase: buildPhaseInfo(store, Date.now()) },
    ref: {},
    attrs: {
      use12Hour: false,
      hideClock: false,
      hideWeatherText: overrides?.hideWeatherText ?? false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: "metric",
      timezone: overrides?.timezone ?? null,
      label: overrides?.label ?? null,
    },
  };
}

describe("InfoPanelComponent", () => {
  let comp: InfoPanelComponent;
  let container: HTMLElement;

  beforeEach(() => {
    comp = new InfoPanelComponent();
    container = document.createElement("div");
    comp.mount(container);
  });

  describe("mount", () => {
    it("creates info panel elements on mount", () => {
      expect(container.querySelector(".info-panel")).toBeTruthy();
      expect(container.querySelector(".info-panel-location")).toBeTruthy();
      expect(container.querySelector(".info-panel-coords")).toBeTruthy();
      expect(container.querySelector(".info-panel-weather")).toBeTruthy();
    });
  });

  describe("location name", () => {
    it("shows label attribute when provided", () => {
      comp.update(makeState({ label: "New York" }));
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.textContent).toBe("New York");
      expect(el.hidden).toBe(false);
    });

    it("shows API location name when no label", () => {
      comp.update(makeState({ locationName: "Tokyo" }));
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.textContent).toBe("Tokyo");
      expect(el.hidden).toBe(false);
    });

    it("label overrides API name", () => {
      comp.update(makeState({ label: "NYC", locationName: "New York" }));
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.textContent).toBe("NYC");
    });

    it("hides location when neither label nor name available", () => {
      comp.update(makeState());
      const el = container.querySelector(".info-panel-location") as HTMLElement;
      expect(el.hidden).toBe(true);
    });
  });

  describe("coordinates", () => {
    it("shows lat/lng when available", () => {
      comp.update(makeState({ lat: 40.7128, lng: -74.006 }));
      const el = container.querySelector(".info-panel-coords") as HTMLElement;
      expect(el.textContent).toBe("40.71°, -74.01°");
      expect(el.hidden).toBe(false);
    });

    it("shows lat/lng with timezone", () => {
      comp.update(makeState({ lat: 40.7128, lng: -74.006, timezone: "America/New_York" }));
      const el = container.querySelector(".info-panel-coords") as HTMLElement;
      expect(el.textContent).toBe("40.71°, -74.01° · America/New_York");
    });

    it("hides coords when no lat/lng", () => {
      comp.update(makeState());
      const el = container.querySelector(".info-panel-coords") as HTMLElement;
      expect(el.hidden).toBe(true);
    });
  });

  describe("weather text", () => {
    it("shows weather text when weather data exists", () => {
      comp.update(makeState({ temp: 22, description: "clear sky" }));
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.textContent).toContain("22");
      expect(el.textContent).toContain("clear sky");
      expect(el.hidden).toBe(false);
    });

    it("hides weather text when no weather data", () => {
      comp.update(makeState());
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.hidden).toBe(true);
    });

    it("hides weather text when hideWeatherText is true", () => {
      comp.update(makeState({ temp: 22, hideWeatherText: true }));
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.hidden).toBe(true);
    });

    it("formats with dot separator", () => {
      comp.update(makeState({ temp: 29, description: "few clouds" }));
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.textContent).toBe("29°C · few clouds");
    });

    it("uses imperial symbol when units are imperial", () => {
      const state = makeState({ temp: 85, description: "sunny" });
      state.attrs.resolvedUnits = "imperial";
      comp.update(state);
      const el = container.querySelector(".info-panel-weather") as HTMLElement;
      expect(el.textContent).toBe("85°F · sunny");
    });
  });

  describe("destroy", () => {
    it("cleans up on destroy", () => {
      comp.destroy();
      expect(container.innerHTML).toBe("");
    });
  });
});
