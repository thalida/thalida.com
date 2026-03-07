import { describe, it, expect, beforeEach } from "vitest";
import type { PrecipType } from "../../components/sky/WeatherLayer";
import {
  WeatherLayer,
  WEATHER_EFFECTS,
  PRECIP_CONFIG,
  ATMOSPHERE_CONFIG,
  ATMO_PARTICLE_CONFIG,
  CLOUD_CONFIGS,
} from "../../components/sky/WeatherLayer";
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

  it("thunderstorm IDs have lightning variants", () => {
    for (const id of [200, 201, 202, 210, 211, 212, 221, 230, 231, 232]) {
      expect(WEATHER_EFFECTS[id].lightning).toBeTruthy();
    }
  });

  it("light thunderstorms use distant lightning", () => {
    expect(WEATHER_EFFECTS[200].lightning).toBe("distant");
    expect(WEATHER_EFFECTS[210].lightning).toBe("distant");
  });

  it("heavy thunderstorms use intense lightning", () => {
    expect(WEATHER_EFFECTS[202].lightning).toBe("intense");
    expect(WEATHER_EFFECTS[212].lightning).toBe("intense");
    expect(WEATHER_EFFECTS[232].lightning).toBe("intense");
  });

  it("light thunderstorms have fewer clouds than heavy thunderstorms", () => {
    expect(WEATHER_EFFECTS[200].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[201].clouds).toBe("storm");
    expect(WEATHER_EFFECTS[202].clouds).toBe("storm");
    expect(WEATHER_EFFECTS[210].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[211].clouds).toBe("storm");
    expect(WEATHER_EFFECTS[212].clouds).toBe("storm");
  });

  it("heavy thunderstorms have dark atmosphere overlay", () => {
    expect(WEATHER_EFFECTS[202].atmosphere).toBe(ATMOSPHERE_CONFIG.stormDark);
    expect(WEATHER_EFFECTS[212].atmosphere).toBe(ATMOSPHERE_CONFIG.stormDark);
    expect(WEATHER_EFFECTS[232].atmosphere).toBe(ATMOSPHERE_CONFIG.stormDark);
    expect(WEATHER_EFFECTS[200].atmosphere).toBeNull();
    expect(WEATHER_EFFECTS[201].atmosphere).toBeNull();
    expect(WEATHER_EFFECTS[211].atmosphere).toBeNull();
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

  it("atmosphere IDs have atmosphere configs", () => {
    for (const id of [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]) {
      expect(WEATHER_EFFECTS[id].atmosphere).not.toBeNull();
    }
  });

  it("non-atmosphere IDs do not have atmosphere configs", () => {
    for (const id of [300, 500, 600, 800]) {
      expect(WEATHER_EFFECTS[id].atmosphere).toBeNull();
    }
  });

  it("squalls have heavy clouds and tornado has storm clouds", () => {
    expect(WEATHER_EFFECTS[771].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[781].clouds).toBe("storm");
  });

  it("squalls and tornado have precipitation", () => {
    expect(WEATHER_EFFECTS[771].precip.length).toBeGreaterThan(0);
    expect(WEATHER_EFFECTS[781].precip.length).toBeGreaterThan(0);
  });

  it("squalls and tornado have strong wind", () => {
    expect(WEATHER_EFFECTS[771].wind).toBe("strong");
    expect(WEATHER_EFFECTS[781].wind).toBe("strong");
  });

  it("clear sky (800) has no effects", () => {
    const config = WEATHER_EFFECTS[800];
    expect(config.clouds).toBe("none");
    expect(config.precip).toEqual([]);
    expect(config.lightning).toBe(false);
    expect(config.atmosphere).toBeNull();
    expect(config.wind).toBe("none");
    expect(config.atmosphereParticles).toBeNull();
  });

  it("804 (overcast) has heavy density, same as 803 (broken clouds)", () => {
    expect(WEATHER_EFFECTS[803].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[804].clouds).toBe("heavy");
  });

  it("751 (sand) and 761 (dust) have distinct atmosphere configs", () => {
    const sandAtmo = WEATHER_EFFECTS[751].atmosphere;
    const dustAtmo = WEATHER_EFFECTS[761].atmosphere;
    expect(sandAtmo).not.toBe(dustAtmo);
    expect(sandAtmo?.color).not.toBe(dustAtmo?.color);
  });

  it("shower variants have wind", () => {
    for (const id of [520, 521, 522, 620, 621, 622, 612, 613, 313, 314, 321]) {
      expect(WEATHER_EFFECTS[id].wind).not.toBe("none");
    }
  });

  it("non-shower rain/snow/drizzle have no wind", () => {
    for (const id of [300, 301, 302, 500, 501, 600, 601, 611]) {
      expect(WEATHER_EFFECTS[id].wind).toBe("none");
    }
  });

  it("atmosphere codes have atmosphere particles except haze", () => {
    for (const id of [701, 711, 731, 741, 751, 761, 762, 781]) {
      expect(WEATHER_EFFECTS[id].atmosphereParticles).not.toBeNull();
    }
    expect(WEATHER_EFFECTS[721].atmosphereParticles).toBeNull();
  });

  it("freezing rain (511) has ice glint particles", () => {
    expect(WEATHER_EFFECTS[511].atmosphereParticles).toBe(ATMO_PARTICLE_CONFIG.iceGlint);
  });
});

describe("PRECIP_CONFIG", () => {
  it("defines configs for all precipitation types", () => {
    const expected: PrecipType[] = [
      "lightRain",
      "rain",
      "snow",
      "sleet",
      "drizzle",
      "showerRain",
      "freezingRain",
      "lightSnow",
      "heavySnow",
      "showerSnow",
      "drizzleLight",
      "drizzleHeavy",
      "showerDrizzle",
      "heavyRain",
      "extremeRain",
      "showerSleet",
    ];
    for (const key of expected) {
      expect(PRECIP_CONFIG[key]).toBeDefined();
    }
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

  it("drizzleLight is slower and smaller than drizzle", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.drizzleLight.fallSpeed)).toBeGreaterThan(speed(PRECIP_CONFIG.drizzle.fallSpeed));
    expect(PRECIP_CONFIG.drizzleLight.sizeW[1]).toBeLessThanOrEqual(PRECIP_CONFIG.drizzle.sizeW[0]);
  });

  it("heavyRain has bigger drops than rain", () => {
    expect(PRECIP_CONFIG.heavyRain.sizeW[0]).toBeGreaterThan(PRECIP_CONFIG.rain.sizeW[0]);
  });

  it("extremeRain is fastest and densest", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.extremeRain.fallSpeed)).toBeLessThan(speed(PRECIP_CONFIG.heavyRain.fallSpeed));
    expect(PRECIP_CONFIG.extremeRain.count).toBeGreaterThan(PRECIP_CONFIG.heavyRain.count);
  });

  it("showerSleet is faster than regular sleet", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.showerSleet.fallSpeed)).toBeLessThan(speed(PRECIP_CONFIG.sleet.fallSpeed));
  });
});

describe("ATMOSPHERE_CONFIG", () => {
  it("defines configs for all atmosphere types", () => {
    expect(ATMOSPHERE_CONFIG.mist).toBeDefined();
    expect(ATMOSPHERE_CONFIG.fog).toBeDefined();
    expect(ATMOSPHERE_CONFIG.smoke).toBeDefined();
    expect(ATMOSPHERE_CONFIG.haze).toBeDefined();
    expect(ATMOSPHERE_CONFIG.sand).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dust).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dustWhirls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.volcanicAsh).toBeDefined();
    expect(ATMOSPHERE_CONFIG.squalls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.tornado).toBeDefined();
    expect(ATMOSPHERE_CONFIG.stormDark).toBeDefined();
  });

  it("fog is denser than mist", () => {
    expect(ATMOSPHERE_CONFIG.fog.opacity).toBeGreaterThan(ATMOSPHERE_CONFIG.mist.opacity);
  });

  it("smoke has brownish color distinct from mist grey", () => {
    expect(ATMOSPHERE_CONFIG.smoke.color).not.toBe(ATMOSPHERE_CONFIG.mist.color);
  });

  it("sand and dust have distinct colors", () => {
    expect(ATMOSPHERE_CONFIG.sand.color).not.toBe(ATMOSPHERE_CONFIG.dust.color);
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

describe("ATMO_PARTICLE_CONFIG", () => {
  it("defines all atmosphere particle types", () => {
    const expected = [
      "mistWisps",
      "fogBanks",
      "smokeWisps",
      "dustSwirl",
      "sandSwirl",
      "ashFall",
      "debrisSwirl",
      "iceGlint",
    ];
    for (const key of expected) {
      expect(ATMO_PARTICLE_CONFIG[key]).toBeDefined();
    }
  });

  it("each config has required fields", () => {
    for (const key of Object.keys(ATMO_PARTICLE_CONFIG)) {
      const config = ATMO_PARTICLE_CONFIG[key];
      expect(config.count).toBeGreaterThan(0);
      expect(config.sizeRange[0]).toBeLessThan(config.sizeRange[1]);
      expect(config.opacityRange[0]).toBeLessThan(config.opacityRange[1]);
      expect(["float", "swirl", "fall", "rise"]).toContain(config.drift);
    }
  });

  it("dust and sand swirl particles have distinct colors", () => {
    expect(ATMO_PARTICLE_CONFIG.dustSwirl.color).not.toBe(ATMO_PARTICLE_CONFIG.sandSwirl.color);
  });
});

describe("WeatherLayer.cloudHTML", () => {
  it("generates the configured number of clouds for each density", () => {
    for (const [density, config] of Object.entries(CLOUD_CONFIGS)) {
      const html = WeatherLayer.cloudHTML(density as "light" | "medium" | "heavy" | "storm");
      const matches = html.match(/class="cloud"/g);
      expect(matches?.length).toBe(config.count);
    }
  });

  it("produces deterministic output", () => {
    const a = WeatherLayer.cloudHTML("heavy");
    const b = WeatherLayer.cloudHTML("heavy");
    expect(a).toBe(b);
  });

  it("storm has more clouds than heavy", () => {
    const storm = WeatherLayer.cloudHTML("storm").match(/class="cloud"/g)?.length ?? 0;
    const heavy = WeatherLayer.cloudHTML("heavy").match(/class="cloud"/g)?.length ?? 0;
    expect(storm).toBeGreaterThan(heavy);
  });

  it("distributes clouds across full width range", () => {
    const html = WeatherLayer.cloudHTML("storm");
    const leftValues = [...html.matchAll(/left:([\d.-]+)%/g)].map((m) => parseFloat(m[1]));
    // With 9 storm clouds, at least one should be past 70%
    expect(leftValues.some((l) => l > 70)).toBe(true);
    // And at least one in the first third
    expect(leftValues.some((l) => l < 35)).toBe(true);
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

describe("WeatherLayer.atmosphereParticleHTML", () => {
  it("generates the configured number of particles", () => {
    const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.dustSwirl);
    const matches = html.match(/class="atmo-particle/g);
    expect(matches?.length).toBe(ATMO_PARTICLE_CONFIG.dustSwirl.count);
  });

  it("uses correct drift class", () => {
    expect(WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.mistWisps)).toContain("atmo-float");
    expect(WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.dustSwirl)).toContain("atmo-swirl");
    expect(WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.ashFall)).toContain("atmo-fall");
  });

  it("produces deterministic output", () => {
    const a = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.fogBanks);
    const b = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.fogBanks);
    expect(a).toBe(b);
  });

  it("renders blur and aspect ratio from config", () => {
    const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.mistWisps);
    // mistWisps has aspectRatio: 4, blur: 30
    expect(html).toContain("filter:blur(30px)");
    // Height should differ from width (aspect ratio applied)
    // For a particle with e.g. width 40px, height = 40/4 = 10px
    expect(html).not.toMatch(/width:(\d+)px;height:\1px/);
  });

  it("renders rise drift class for smoke", () => {
    const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.smokeWisps);
    expect(html).toContain("atmo-rise");
  });

  it("uses default blur when not specified", () => {
    const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.dustSwirl);
    expect(html).toContain("filter:blur(4px)");
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

  it("renders procedural clouds for 801 (few clouds)", () => {
    layer.update(makeState(801));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.light.count);
    expect(container.querySelector(".droplets")).toBeFalsy();
  });

  it("renders more clouds for 802 (scattered) than 801 (few)", () => {
    layer.update(makeState(802));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.medium.count);
    expect(clouds.length).toBeGreaterThan(CLOUD_CONFIGS.light.count);
  });

  it("renders more clouds for 803 (broken) than 802 (scattered)", () => {
    layer.update(makeState(803));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.heavy.count);
    expect(clouds.length).toBeGreaterThan(CLOUD_CONFIGS.medium.count);
  });

  it("renders heavy clouds for 804 (overcast), same count as 803", () => {
    layer.update(makeState(804));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.heavy.count);
  });

  it("renders rain particles for 501 (moderate rain)", () => {
    layer.update(makeState(501));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
    expect(container.querySelectorAll(".cloud").length).toBe(CLOUD_CONFIGS.medium.count);
  });

  it("renders standard lightning for thunderstorm (201)", () => {
    layer.update(makeState(201));
    expect(container.querySelector(".lightning-standard")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("renders distant lightning for light thunderstorm (210)", () => {
    layer.update(makeState(210));
    expect(container.querySelector(".lightning-distant")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeFalsy();
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.heavy.count);
  });

  it("renders intense lightning for heavy thunderstorm (212)", () => {
    layer.update(makeState(212));
    expect(container.querySelector(".lightning-intense")).toBeTruthy();
    expect(container.querySelector(".lightning-secondary")).toBeTruthy();
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
  });

  it("renders storm-density clouds for regular thunderstorm (211)", () => {
    layer.update(makeState(211));
    expect(container.querySelector(".lightning-standard")).toBeTruthy();
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.storm.count);
    expect(clouds.length).toBeGreaterThan(CLOUD_CONFIGS.heavy.count);
  });

  it("renders atmosphere layers for mist (701) with wisps", () => {
    layer.update(makeState(701));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    expect(container.querySelector(".atmosphere-md")).toBeTruthy();
    expect(container.querySelector(".atmosphere-sm")).toBeFalsy();
    expect(container.querySelector(".atmo-particle")).toBeTruthy();
    expect(container.querySelector(".atmo-float")).toBeTruthy();
  });

  it("renders 3 atmosphere layers for fog (741) with fog banks", () => {
    layer.update(makeState(741));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    expect(container.querySelector(".atmosphere-md")).toBeTruthy();
    expect(container.querySelector(".atmosphere-sm")).toBeTruthy();
    expect(container.querySelector(".atmo-float")).toBeTruthy();
  });

  it("renders atmosphere with correct color for smoke (711)", () => {
    layer.update(makeState(711));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    // Atmosphere color is set as a CSS variable on the parent
    expect(container.style.getPropertyValue("--atmo-color")).toBeTruthy();
    expect(container.querySelector(".atmo-rise")).toBeTruthy();
  });

  it("renders swirling particles for dust whirls (731)", () => {
    layer.update(makeState(731));
    expect(container.querySelector(".atmo-swirl")).toBeTruthy();
  });

  it("renders falling particles for volcanic ash (762)", () => {
    layer.update(makeState(762));
    expect(container.querySelector(".atmo-fall")).toBeTruthy();
  });

  it("renders particles for 601 (snow)", () => {
    layer.update(makeState(601));
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("renders dual precipitation for rain+snow (615)", () => {
    layer.update(makeState(615));
    const droplets = container.querySelectorAll(".droplets");
    expect(droplets.length).toBe(2);
  });

  it("renders sleet particles with blue color (611)", () => {
    layer.update(makeState(611));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#a0cfff");
  });

  it("renders freezing rain with distinct icy-blue color and ice glint (511)", () => {
    layer.update(makeState(511));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#7ec8f0");
    expect(container.querySelector(".atmo-float")).toBeTruthy();
  });

  it("renders wind-driven precipitation for shower rain (521)", () => {
    layer.update(makeState(521));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationName).toBe("precipitate");
    expect(droplets.style.transform).toContain("skewX");
  });

  it("renders strong wind for squalls (771)", () => {
    layer.update(makeState(771));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationName).toBe("precipitate");
    expect(droplets.style.transform).toContain("skewX");
  });

  it("sets fall speed inline on droplets container", () => {
    layer.update(makeState(501));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationDuration).toBe(PRECIP_CONFIG.rain.fallSpeed);
  });

  it("does not rebuild innerHTML when weather and color are unchanged", () => {
    layer.update(makeState(501));
    const firstHTML = container.innerHTML;
    // Second update with same state should not change innerHTML
    layer.update(makeState(501));
    expect(container.innerHTML).toBe(firstHTML);
  });

  it("rebuilds innerHTML when weather id changes", () => {
    layer.update(makeState(501));
    const firstHTML = container.innerHTML;
    layer.update(makeState(601));
    expect(container.innerHTML).not.toBe(firstHTML);
  });

  it("cleans up on destroy", () => {
    layer.update(makeState(501));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
