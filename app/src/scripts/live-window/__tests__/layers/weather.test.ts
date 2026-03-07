import { describe, it, expect, beforeEach } from "vitest";
import { WeatherLayer, WEATHER_EFFECTS, PRECIP_CONFIG, ATMOSPHERE_CONFIG } from "../../components/sky/WeatherLayer";
import { makeTestState } from "../helpers";

function makeState(weatherId: number | null) {
  if (weatherId === null) {
    return makeTestState({ store: { weather: { current: null } } });
  }
  return makeTestState({
    store: {
      weather: {
        current: { id: weatherId, main: "Test", description: "test", icon: "01d", temp: 20 },
      },
    },
  });
}

describe("WEATHER_EFFECTS", () => {
  it("covers all thunderstorm IDs (2xx)", () => {
    for (const id of [200, 201, 202, 210, 211, 212, 221, 230, 231, 232]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all drizzle IDs (3xx)", () => {
    for (const id of [300, 301, 302, 310, 311, 312, 313, 314, 321]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all rain IDs (5xx)", () => {
    for (const id of [500, 501, 502, 503, 504, 511, 520, 521, 522, 531]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all snow IDs (6xx)", () => {
    for (const id of [600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all atmosphere IDs (7xx)", () => {
    for (const id of [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all clear/cloud IDs (800+)", () => {
    for (const id of [800, 801, 802, 803, 804]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("thunderstorm IDs have lightning", () => {
    for (const id of [200, 201, 202, 210, 211, 212, 221, 230, 231, 232]) {
      expect(WEATHER_EFFECTS[id].lightning).toBe(true);
    }
  });

  it("non-thunderstorm IDs do not have lightning", () => {
    for (const id of [300, 500, 600, 701, 800]) {
      expect(WEATHER_EFFECTS[id].lightning).toBe(false);
    }
  });

  it("rain+snow (615, 616) have dual precipitation layers", () => {
    expect(WEATHER_EFFECTS[615].precip.length).toBe(2);
    expect(WEATHER_EFFECTS[616].precip.length).toBe(2);
  });

  it("drizzle+rain combos (310-314) have dual precipitation layers", () => {
    for (const id of [310, 311, 312, 313, 314]) {
      expect(WEATHER_EFFECTS[id].precip.length).toBe(2);
    }
  });

  it("snow IDs (600-602, 615-622) have snow accumulation", () => {
    for (const id of [600, 601, 602, 615, 616, 620, 621, 622]) {
      expect(WEATHER_EFFECTS[id].snowAccumulation).toBe(true);
    }
  });

  it("sleet IDs (611-613) do not have snow accumulation", () => {
    for (const id of [611, 612, 613]) {
      expect(WEATHER_EFFECTS[id].snowAccumulation).toBe(false);
    }
  });

  it("freezing rain (511) has snow accumulation", () => {
    expect(WEATHER_EFFECTS[511].snowAccumulation).toBe(true);
  });

  it("atmosphere IDs have atmosphere configs", () => {
    for (const id of [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]) {
      expect(WEATHER_EFFECTS[id].atmosphere).not.toBeNull();
    }
  });

  it("non-atmosphere IDs do not have atmosphere configs", () => {
    for (const id of [200, 300, 500, 600, 800]) {
      expect(WEATHER_EFFECTS[id].atmosphere).toBeNull();
    }
  });

  it("squalls and tornado have heavy clouds", () => {
    expect(WEATHER_EFFECTS[771].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[781].clouds).toBe("heavy");
  });

  it("clear sky (800) has no effects", () => {
    const config = WEATHER_EFFECTS[800];
    expect(config.clouds).toBe("none");
    expect(config.precip).toEqual([]);
    expect(config.lightning).toBe(false);
    expect(config.atmosphere).toBeNull();
    expect(config.snowAccumulation).toBe(false);
  });
});

describe("PRECIP_CONFIG", () => {
  it("defines configs for all precipitation types including new ones", () => {
    expect(PRECIP_CONFIG.lightRain).toBeDefined();
    expect(PRECIP_CONFIG.rain).toBeDefined();
    expect(PRECIP_CONFIG.snow).toBeDefined();
    expect(PRECIP_CONFIG.sleet).toBeDefined();
    expect(PRECIP_CONFIG.drizzle).toBeDefined();
    expect(PRECIP_CONFIG.showerRain).toBeDefined();
    expect(PRECIP_CONFIG.freezingRain).toBeDefined();
    expect(PRECIP_CONFIG.lightSnow).toBeDefined();
    expect(PRECIP_CONFIG.heavySnow).toBeDefined();
    expect(PRECIP_CONFIG.showerSnow).toBeDefined();
  });

  it("rain is fastest, snow is slowest", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.rain.fallSpeed)).toBeLessThan(speed(PRECIP_CONFIG.snow.fallSpeed));
  });

  it("snow has sway, rain does not", () => {
    expect(PRECIP_CONFIG.snow.hasSway).toBe(true);
    expect(PRECIP_CONFIG.rain.hasSway).toBe(false);
  });

  it("drizzle is slower than lightRain", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.drizzle.fallSpeed)).toBeGreaterThan(speed(PRECIP_CONFIG.lightRain.fallSpeed));
  });

  it("freezingRain has blue-white color distinct from regular rain", () => {
    expect(PRECIP_CONFIG.freezingRain.color).not.toBe(PRECIP_CONFIG.rain.color);
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

describe("WeatherLayer", () => {
  let layer: WeatherLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new WeatherLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("renders nothing when weather id is null", () => {
    layer.update(makeState(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for clear sky (800)", () => {
    layer.update(makeState(800));
    expect(container.innerHTML).toBe("");
  });

  it("renders only small cloud for 801 (few clouds)", () => {
    layer.update(makeState(801));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
    expect(container.querySelector(".cloud-md")).toBeFalsy();
    expect(container.querySelector(".cloud-lg")).toBeFalsy();
    expect(container.querySelector(".droplets")).toBeFalsy();
  });

  it("renders sm+md clouds for 802 (scattered)", () => {
    layer.update(makeState(802));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
    expect(container.querySelector(".cloud-md")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeFalsy();
  });

  it("renders all clouds for 803 (broken)", () => {
    layer.update(makeState(803));
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
    expect(container.querySelector(".cloud-md")).toBeTruthy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders rain particles for 501 (moderate rain)", () => {
    layer.update(makeState(501));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
    expect(container.querySelector(".cloud-sm")).toBeTruthy();
    expect(container.querySelector(".cloud-md")).toBeTruthy();
  });

  it("renders lightning for thunderstorm (201)", () => {
    layer.update(makeState(201));
    expect(container.querySelector(".lightning")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("renders dry thunderstorm without precipitation (210)", () => {
    layer.update(makeState(210));
    expect(container.querySelector(".lightning")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeFalsy();
    expect(container.querySelector(".cloud-lg")).toBeTruthy();
  });

  it("renders atmosphere layers for mist (701)", () => {
    layer.update(makeState(701));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    expect(container.querySelector(".atmosphere-md")).toBeTruthy();
    expect(container.querySelector(".atmosphere-sm")).toBeFalsy(); // mist only has 2 layers
  });

  it("renders 3 atmosphere layers for fog (741)", () => {
    layer.update(makeState(741));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    expect(container.querySelector(".atmosphere-md")).toBeTruthy();
    expect(container.querySelector(".atmosphere-sm")).toBeTruthy();
  });

  it("renders atmosphere with correct color for smoke (711)", () => {
    layer.update(makeState(711));
    const el = container.querySelector(".atmosphere-lg") as HTMLElement;
    expect(el.getAttribute("style")).toContain("background:#8b7355");
  });

  it("renders snow accumulation and particles for 601 (snow)", () => {
    layer.update(makeState(601));
    expect(container.querySelector(".snow-sill")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("does not render snow accumulation for 611 (sleet)", () => {
    layer.update(makeState(611));
    expect(container.querySelector(".snow-sill")).toBeFalsy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("renders dual precipitation for rain+snow (615)", () => {
    layer.update(makeState(615));
    const droplets = container.querySelectorAll(".droplets");
    expect(droplets.length).toBe(2);
    expect(container.querySelector(".snow-sill")).toBeTruthy();
  });

  it("renders sleet particles with blue color (611)", () => {
    layer.update(makeState(611));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#a0cfff");
  });

  it("renders freezing rain with blue-white color (511)", () => {
    layer.update(makeState(511));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#b8deff");
    expect(container.querySelector(".snow-sill")).toBeTruthy();
  });

  it("sets fall speed inline on droplets container", () => {
    layer.update(makeState(501));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationDuration).toBe(PRECIP_CONFIG.rain.fallSpeed);
  });

  it("cleans up on destroy", () => {
    layer.update(makeState(501));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
