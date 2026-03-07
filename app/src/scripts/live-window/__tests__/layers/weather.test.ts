import { describe, it, expect, beforeEach } from "vitest";
import {
  WeatherLayer,
  ICON_WEATHER_MAP,
  PRECIP_CONFIG,
  intensityMultiplier,
  ATMOSPHERE_CONFIG,
} from "../../components/sky/WeatherLayer";
import { makeTestState } from "../helpers";

function makeState(icon: string | null, description = "test", main = "Test") {
  return makeTestState({
    store: {
      weather: {
        current: icon ? { id: 800, main, description, icon, temp: 20 } : null,
      },
    },
  });
}

describe("ICON_WEATHER_MAP", () => {
  it("maps all expected icon codes", () => {
    const expectedCodes = [
      "02d",
      "02n",
      "03d",
      "03n",
      "04d",
      "04n",
      "09d",
      "09n",
      "10d",
      "10n",
      "11d",
      "11n",
      "13d",
      "13n",
      "50d",
      "50n",
    ];
    for (const code of expectedCodes) {
      expect(ICON_WEATHER_MAP[code]).toBeDefined();
    }
  });
});

describe("PRECIP_CONFIG", () => {
  it("defines configs for all precipitation types including new ones", () => {
    expect(PRECIP_CONFIG.lightRain).toBeDefined();
    expect(PRECIP_CONFIG.rain).toBeDefined();
    expect(PRECIP_CONFIG.thunderstorm).toBeDefined();
    expect(PRECIP_CONFIG.snow).toBeDefined();
    expect(PRECIP_CONFIG.sleet).toBeDefined();
    expect(PRECIP_CONFIG.drizzle).toBeDefined();
    expect(PRECIP_CONFIG.showerRain).toBeDefined();
    expect(PRECIP_CONFIG.freezingRain).toBeDefined();
    expect(PRECIP_CONFIG.lightSnow).toBeDefined();
    expect(PRECIP_CONFIG.heavySnow).toBeDefined();
    expect(PRECIP_CONFIG.showerSnow).toBeDefined();
  });

  it("drizzle is slower than lightRain", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.drizzle.fallSpeed)).toBeGreaterThan(speed(PRECIP_CONFIG.lightRain.fallSpeed));
  });

  it("freezingRain has blue-white color distinct from regular rain", () => {
    expect(PRECIP_CONFIG.freezingRain.color).not.toBe(PRECIP_CONFIG.rain.color);
  });

  it("rain is fastest, snow is slowest", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.rain.fallSpeed)).toBeLessThan(speed(PRECIP_CONFIG.snow.fallSpeed));
  });

  it("snow has sway, rain does not", () => {
    expect(PRECIP_CONFIG.snow.hasSway).toBe(true);
    expect(PRECIP_CONFIG.rain.hasSway).toBe(false);
  });
});

describe("WeatherLayer.particleHTML", () => {
  it("generates the configured number of particles", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.rain);
    const matches = html.match(/class="particle"/g);
    expect(matches?.length).toBe(PRECIP_CONFIG.rain.count);
  });

  it("omits sway animation for non-sway configs", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.rain);
    expect(html).not.toContain("animation-name:");
  });

  it("includes sway animation for sway configs", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.snow);
    expect(html).toContain("animation-name:sway");
  });

  it("uses the configured color", () => {
    expect(WeatherLayer.particleHTML(PRECIP_CONFIG.snow)).toContain("background:#fff");
    expect(WeatherLayer.particleHTML(PRECIP_CONFIG.sleet)).toContain("background:#a0cfff");
  });

  it("produces deterministic output", () => {
    const a = WeatherLayer.particleHTML(PRECIP_CONFIG.snow);
    const b = WeatherLayer.particleHTML(PRECIP_CONFIG.snow);
    expect(a).toBe(b);
  });

  it("respects count override", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.rain, 10);
    const matches = html.match(/class="particle"/g);
    expect(matches?.length).toBe(10);
  });
});

describe("intensityMultiplier", () => {
  it("returns 0.6 for light descriptions", () => {
    expect(intensityMultiplier("light rain")).toBe(0.6);
    expect(intensityMultiplier("light snow")).toBe(0.6);
    expect(intensityMultiplier("light intensity drizzle")).toBe(0.6);
  });

  it("returns 1.0 for moderate/unqualified descriptions", () => {
    expect(intensityMultiplier("moderate rain")).toBe(1.0);
    expect(intensityMultiplier("rain")).toBe(1.0);
    expect(intensityMultiplier("snow")).toBe(1.0);
    expect(intensityMultiplier("drizzle")).toBe(1.0);
  });

  it("returns 1.4 for heavy descriptions", () => {
    expect(intensityMultiplier("heavy intensity rain")).toBe(1.4);
    expect(intensityMultiplier("heavy snow")).toBe(1.4);
  });

  it("returns 1.6 for very heavy descriptions", () => {
    expect(intensityMultiplier("very heavy rain")).toBe(1.6);
  });

  it("returns 1.8 for extreme descriptions", () => {
    expect(intensityMultiplier("extreme rain")).toBe(1.8);
  });
});

describe("WeatherLayer", () => {
  let layer: WeatherLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new WeatherLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("renders nothing when icon is null", () => {
    layer.update(makeState(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders clouds for partly cloudy (02d)", () => {
    layer.update(makeState("02d"));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
  });

  it("renders particles for rain (10d)", () => {
    layer.update(makeState("10d"));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders particles for drizzle (09d)", () => {
    layer.update(makeState("09d"));
    expect(container.querySelectorAll(".particle").length).toBe(PRECIP_CONFIG.lightRain.count * 2);
  });

  it("renders lightning for thunderstorm (11d)", () => {
    layer.update(makeState("11d"));
    expect(container.querySelector(".lightning")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
  });

  it("renders mist layers for mist (50d)", () => {
    layer.update(makeState("50d"));
    expect(container.querySelector(".mist-lg")).toBeTruthy();
    expect(container.querySelector(".mist-md")).toBeTruthy();
    expect(container.querySelector(".mist-sm")).toBeTruthy();
  });

  it("renders snow mounds and particles for snow (13d)", () => {
    layer.update(makeState("13d"));
    expect(container.querySelector(".snow-sill")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
  });

  it("renders sleet particles with blue color", () => {
    layer.update(makeState("13d", "sleet", "Snow"));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#a0cfff");
  });

  it("renders snow particles with white color", () => {
    layer.update(makeState("13d", "light snow", "Snow"));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#fff");
  });

  it("does not add weather-sleet class", () => {
    layer.update(makeState("13d", "sleet", "Snow"));
    expect(container.className).not.toContain("weather-sleet");
  });

  it("sets fall speed inline on droplets container", () => {
    layer.update(makeState("10d"));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationDuration).toBe(PRECIP_CONFIG.rain.fallSpeed);
  });

  it("scales particle count by intensity", () => {
    layer.update(makeState("10d", "light rain", "Rain"));
    const lightCount = container.querySelectorAll(".particle").length;

    layer.update(makeState("10d", "heavy intensity rain", "Rain"));
    const heavyCount = container.querySelectorAll(".particle").length;

    expect(heavyCount).toBeGreaterThan(lightCount);
  });

  it("cleans up on destroy", () => {
    layer.update(makeState("10d"));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});

describe("ATMOSPHERE_CONFIG", () => {
  it("defines configs for all atmosphere types", () => {
    expect(ATMOSPHERE_CONFIG.mist).toBeDefined();
    expect(ATMOSPHERE_CONFIG.fog).toBeDefined();
    expect(ATMOSPHERE_CONFIG.smoke).toBeDefined();
    expect(ATMOSPHERE_CONFIG.haze).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dust).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dustWhirls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.volcanicAsh).toBeDefined();
    expect(ATMOSPHERE_CONFIG.squalls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.tornado).toBeDefined();
  });

  it("fog is denser than mist", () => {
    expect(ATMOSPHERE_CONFIG.fog.opacity).toBeGreaterThan(ATMOSPHERE_CONFIG.mist.opacity);
  });

  it("smoke has brownish color distinct from mist grey", () => {
    expect(ATMOSPHERE_CONFIG.smoke.color).not.toBe(ATMOSPHERE_CONFIG.mist.color);
  });

  it("each config has required fields", () => {
    for (const key of Object.keys(ATMOSPHERE_CONFIG)) {
      const config = ATMOSPHERE_CONFIG[key];
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("opacity");
      expect(config).toHaveProperty("layers");
      expect(config.layers).toBeGreaterThanOrEqual(1);
      expect(config.layers).toBeLessThanOrEqual(3);
    }
  });
});
