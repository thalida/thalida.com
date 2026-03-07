import type { SceneComponent, LiveWindowState } from "../../types";

const SWAY_NAMES = ["sway-sm", "sway", "sway-lg"] as const;

export interface PrecipConfig {
  count: number;
  /** CSS animation-duration for the falling container */
  fallSpeed: string;
  /** round = circle (snow/sleet), drop = elongated raindrop */
  shape: "round" | "drop";
  /** Width range [min, max] in px */
  sizeW: [number, number];
  /** Height = width × aspectRatio (1 for round, >1 for elongated) */
  aspectRatio: number;
  color: string;
  /** Opacity range [min, max] as 0–100 integers */
  opacityRange: [number, number];
  /** Whether particles sway side-to-side */
  hasSway: boolean;
}

export const PRECIP_CONFIG: Record<string, PrecipConfig> = {
  lightRain: {
    count: 28,
    fallSpeed: "6s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 3,
    color: "#28afff",
    opacityRange: [50, 70],
    hasSway: false,
  },
  rain: {
    count: 35,
    fallSpeed: "2s",
    shape: "drop",
    sizeW: [3, 4],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [70, 100],
    hasSway: false,
  },
  snow: {
    count: 32,
    fallSpeed: "6s",
    shape: "round",
    sizeW: [3, 7],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [50, 100],
    hasSway: true,
  },
  sleet: {
    count: 30,
    fallSpeed: "5s",
    shape: "round",
    sizeW: [3, 6],
    aspectRatio: 1,
    color: "#a0cfff",
    opacityRange: [50, 90],
    hasSway: true,
  },
  drizzle: {
    count: 22,
    fallSpeed: "8s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [40, 65],
    hasSway: false,
  },
  showerRain: {
    count: 38,
    fallSpeed: "1.5s",
    shape: "drop",
    sizeW: [3, 5],
    aspectRatio: 3,
    color: "#28afff",
    opacityRange: [75, 100],
    hasSway: false,
  },
  freezingRain: {
    count: 30,
    fallSpeed: "3s",
    shape: "drop",
    sizeW: [2, 4],
    aspectRatio: 2,
    color: "#b8deff",
    opacityRange: [60, 90],
    hasSway: false,
  },
  lightSnow: {
    count: 20,
    fallSpeed: "8s",
    shape: "round",
    sizeW: [2, 5],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [40, 80],
    hasSway: true,
  },
  heavySnow: {
    count: 45,
    fallSpeed: "4s",
    shape: "round",
    sizeW: [4, 9],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [60, 100],
    hasSway: true,
  },
  showerSnow: {
    count: 40,
    fallSpeed: "3s",
    shape: "round",
    sizeW: [3, 7],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [55, 95],
    hasSway: true,
  },
};

export interface AtmosphereConfig {
  color: string;
  opacity: number;
  layers: number;
}

export const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
  mist: { color: "#c8c8c8", opacity: 0.15, layers: 2 },
  fog: { color: "#b0b0b0", opacity: 0.35, layers: 3 },
  smoke: { color: "#8b7355", opacity: 0.3, layers: 3 },
  haze: { color: "#d4c89a", opacity: 0.2, layers: 2 },
  dust: { color: "#c4a86a", opacity: 0.25, layers: 2 },
  dustWhirls: { color: "#c4a86a", opacity: 0.35, layers: 3 },
  volcanicAsh: { color: "#555555", opacity: 0.4, layers: 3 },
  squalls: { color: "#888888", opacity: 0.3, layers: 3 },
  tornado: { color: "#666666", opacity: 0.45, layers: 3 },
  stormDark: { color: "#1a1a2e", opacity: 0.2, layers: 2 },
};

export type CloudDensity = "none" | "light" | "medium" | "heavy" | "storm";

export interface CloudConfig {
  count: number;
  /** Diameter range as % of container width */
  sizeRange: [number, number];
  opacityRange: [number, number];
  /** Vertical zone: clouds appear between yMin% and yMax% from top */
  yRange: [number, number];
}

export const CLOUD_CONFIGS: Record<Exclude<CloudDensity, "none">, CloudConfig> = {
  light: { count: 2, sizeRange: [15, 22], opacityRange: [60, 80], yRange: [20, 60] },
  medium: { count: 4, sizeRange: [15, 25], opacityRange: [65, 90], yRange: [10, 65] },
  heavy: { count: 6, sizeRange: [18, 30], opacityRange: [70, 95], yRange: [5, 70] },
  storm: { count: 9, sizeRange: [20, 35], opacityRange: [80, 100], yRange: [0, 75] },
};

const FLOAT_NAMES = ["cloud-float-1", "cloud-float-2", "cloud-float-3"] as const;

interface CloudShapeExt {
  side: "left" | "right";
  width: number;
  height: number;
  offset: number;
  radius: string;
}

interface CloudShape {
  bodyRadius: string;
  extensions: CloudShapeExt[];
}

/** Curated cloud shapes based on the original hand-crafted clouds. */
const CLOUD_SHAPES: CloudShape[] = [
  {
    // Based on cloud-sm: rounded body with one right bump
    bodyRadius: "50% 50% 0 50%",
    extensions: [{ side: "right", width: 50, height: 55, offset: -45, radius: "50% 50% 50% 0" }],
  },
  {
    // Based on cloud-md: flat-bottom body with bumps on both sides
    bodyRadius: "40% 50% 0 0",
    extensions: [
      { side: "left", width: 60, height: 70, offset: -50, radius: "40% 50% 0 50%" },
      { side: "right", width: 50, height: 55, offset: -45, radius: "30% 50% 50% 0" },
    ],
  },
  {
    // Based on cloud-lg: rounded body with one tall right bump
    bodyRadius: "30% 50% 0 50%",
    extensions: [{ side: "right", width: 50, height: 75, offset: -45, radius: "30% 50% 50% 0" }],
  },
];

export interface WeatherEffectConfig {
  clouds: CloudDensity;
  precip: PrecipLayer[];
  lightning: boolean;
  atmosphere: AtmosphereConfig | null;
  snowAccumulation: boolean;
}

export interface PrecipLayer {
  type: string;
  intensityScale: number;
}

function fx(
  clouds: WeatherEffectConfig["clouds"],
  precip: PrecipLayer[],
  opts?: { lightning?: boolean; atmosphere?: AtmosphereConfig; snowAccumulation?: boolean },
): WeatherEffectConfig {
  return {
    clouds,
    precip,
    lightning: opts?.lightning ?? false,
    atmosphere: opts?.atmosphere ?? null,
    snowAccumulation: opts?.snowAccumulation ?? false,
  };
}

function p(type: string, intensityScale = 1.0): PrecipLayer {
  return { type, intensityScale };
}

export const WEATHER_EFFECTS: Record<number, WeatherEffectConfig> = {
  // 2xx Thunderstorm — light variants use heavy clouds, heavy variants add dark atmosphere
  200: fx("heavy", [p("lightRain", 0.6)], { lightning: true }),
  201: fx("storm", [p("rain")], { lightning: true }),
  202: fx("storm", [p("rain", 1.4)], { lightning: true, atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  210: fx("heavy", [], { lightning: true }),
  211: fx("storm", [], { lightning: true }),
  212: fx("storm", [], { lightning: true, atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  221: fx("storm", [], { lightning: true }),
  230: fx("heavy", [p("drizzle")], { lightning: true }),
  231: fx("storm", [p("drizzle", 1.4)], { lightning: true }),
  232: fx("storm", [p("drizzle", 1.8)], { lightning: true, atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  // 3xx Drizzle
  300: fx("medium", [p("drizzle", 0.6)]),
  301: fx("medium", [p("drizzle")]),
  302: fx("medium", [p("drizzle", 1.4)]),
  310: fx("medium", [p("drizzle", 0.6), p("lightRain", 0.4)]),
  311: fx("medium", [p("drizzle", 0.7), p("lightRain", 0.7)]),
  312: fx("medium", [p("drizzle"), p("rain", 0.7)]),
  313: fx("medium", [p("showerRain", 0.7), p("drizzle", 0.5)]),
  314: fx("heavy", [p("showerRain", 1.2), p("drizzle", 0.6)]),
  321: fx("medium", [p("drizzle", 1.2)]),
  // 5xx Rain
  500: fx("medium", [p("lightRain", 0.6)]),
  501: fx("medium", [p("rain")]),
  502: fx("heavy", [p("rain", 1.4)]),
  503: fx("heavy", [p("rain", 1.6)]),
  504: fx("heavy", [p("rain", 1.8)]),
  511: fx("heavy", [p("freezingRain")], { snowAccumulation: true }),
  520: fx("medium", [p("showerRain", 0.6)]),
  521: fx("medium", [p("showerRain")]),
  522: fx("heavy", [p("showerRain", 1.4)]),
  531: fx("medium", [p("showerRain")]),
  // 6xx Snow
  600: fx("medium", [p("lightSnow", 0.6)], { snowAccumulation: true }),
  601: fx("medium", [p("snow")], { snowAccumulation: true }),
  602: fx("heavy", [p("heavySnow", 1.4)], { snowAccumulation: true }),
  611: fx("medium", [p("sleet")]),
  612: fx("medium", [p("sleet", 0.6)]),
  613: fx("medium", [p("sleet", 1.2)]),
  615: fx("medium", [p("lightRain", 0.5), p("lightSnow", 0.5)], { snowAccumulation: true }),
  616: fx("heavy", [p("rain", 0.7), p("snow", 0.7)], { snowAccumulation: true }),
  620: fx("medium", [p("showerSnow", 0.6)], { snowAccumulation: true }),
  621: fx("medium", [p("showerSnow")], { snowAccumulation: true }),
  622: fx("heavy", [p("showerSnow", 1.4)], { snowAccumulation: true }),
  // 7xx Atmosphere
  701: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.mist }),
  711: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.smoke }),
  721: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.haze }),
  731: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dustWhirls }),
  741: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.fog }),
  751: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust }),
  761: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust }),
  762: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.volcanicAsh }),
  771: fx("heavy", [], { atmosphere: ATMOSPHERE_CONFIG.squalls }),
  781: fx("heavy", [], { atmosphere: ATMOSPHERE_CONFIG.tornado }),
  // 800+ Clear/Clouds
  800: fx("none", []),
  801: fx("light", []),
  802: fx("medium", []),
  803: fx("heavy", []),
  804: fx("heavy", []),
};

/**
 * Computes how much to darken the sky based on weather conditions.
 * Returns opacity 0–0.55: heavier weather = darker sky.
 */
function getSkyDarkenOpacity(config: WeatherEffectConfig): number {
  let opacity = 0;

  switch (config.clouds) {
    case "light":
      opacity += 0.05;
      break;
    case "medium":
      opacity += 0.12;
      break;
    case "heavy":
      opacity += 0.22;
      break;
    case "storm":
      opacity += 0.28;
      break;
  }

  for (const layer of config.precip) {
    opacity += 0.05 * layer.intensityScale;
  }

  if (config.lightning) {
    opacity += 0.12;
  }

  if (config.atmosphere) {
    opacity += config.atmosphere.opacity * 0.3;
  }

  return Math.min(opacity, 0.55);
}

export class WeatherLayer implements SceneComponent {
  private el: HTMLElement | null = null;

  /**
   * Generate procedural clouds with deterministic pseudo-random placement.
   * Each cloud is a compound shape: a square body with flat-bottom border-radius
   * + 1-2 side extensions (like the old pseudo-elements), all bottom-aligned.
   */
  static cloudHTML(density: Exclude<CloudDensity, "none">): string {
    const config = CLOUD_CONFIGS[density];
    const sizeRange = config.sizeRange[1] - config.sizeRange[0];
    const opRange = config.opacityRange[1] - config.opacityRange[0];
    const ySpan = config.yRange[1] - config.yRange[0];

    let out = "";
    for (let i = 0; i < config.count; i++) {
      const h = ((i + 1) * 2654435761) >>> 0;
      const h2 = ((i + 1) * 1597334677) >>> 0; // independent hash for Y
      const left = (h % 110) - 5;
      const top = config.yRange[0] + (h2 % (ySpan + 1));
      const size = config.sizeRange[0] + (h % (sizeRange + 1));
      const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;

      const floatName = FLOAT_NAMES[i % 3];
      const dur = (4 + ((h >>> 12) % 60) / 10).toFixed(1);
      const delay = (-((h >>> 16) % 80) / 10).toFixed(1);

      // Pick a curated cloud shape, cycling through the presets
      const shape = CLOUD_SHAPES[i % CLOUD_SHAPES.length];

      out += `<div class="cloud" style="left:${left}%;top:${top}%;width:${size}%;opacity:${opacity};border-radius:${shape.bodyRadius};animation:${dur}s ease-in-out ${delay}s infinite alternate ${floatName}">`;

      for (const ext of shape.extensions) {
        const pos = ext.side === "left" ? `left:${ext.offset}%` : `right:${ext.offset}%`;
        out += `<div class="cloud-ext" style="${pos};width:${ext.width}%;height:${ext.height}%;border-radius:${ext.radius}"></div>`;
      }

      out += `</div>`;
    }
    return out;
  }

  /** Generate scattered particles with deterministic pseudo-random placement. */
  static particleHTML(config: PrecipConfig, count?: number): string {
    const n = count ?? config.count;
    const wRange = config.sizeW[1] - config.sizeW[0];
    const opRange = config.opacityRange[1] - config.opacityRange[0];
    const radius = config.shape === "round" ? "50%" : "40%";

    let out = "";
    for (let i = 0; i < n; i++) {
      // Deterministic hash per index (Knuth multiplicative)
      const h = ((i + 1) * 2654435761) >>> 0;
      const left = h % 100;
      const top = ((h >>> 8) ^ (i * 37)) % 100;
      const w = config.sizeW[0] + (h % (wRange + 1));
      const height = Math.round(w * config.aspectRatio);
      const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;

      let animStyle = "";
      if (config.hasSway) {
        const sway = SWAY_NAMES[i % 3];
        const dur = (2 + ((h >>> 12) % 18) / 10).toFixed(1);
        const delay = (-((h >>> 16) % 40) / 10).toFixed(1);
        animStyle = `animation-name:${sway};animation-duration:${dur}s;animation-delay:${delay}s`;
      }

      out += `<div class="particle" style="left:${left}%;top:${top}%;width:${w}px;height:${height}px;opacity:${opacity};background:${config.color};border-radius:${radius};${animStyle}"></div>`;
    }
    return out;
  }

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer weather";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;
    const weatherId = state.computed.phase.weather.id;

    if (!weatherId || !WEATHER_EFFECTS[weatherId]) {
      this.el.className = "sky-layer weather";
      this.el.innerHTML = "";
      return;
    }

    const config = WEATHER_EFFECTS[weatherId];
    const icon = state.computed.phase.weather.icon;
    let cls = "sky-layer weather";
    if (icon) {
      cls += ` weather-${icon}`;
      if (icon.endsWith("n")) cls += " weather-night";
    }
    if (config.clouds !== "none") cls += ` weather-clouds-${config.clouds}`;
    this.el.className = cls;

    let html = "";

    // Sky darkening overlay
    const darken = getSkyDarkenOpacity(config);
    if (darken > 0) {
      html += `<div class="sky-darken" style="opacity:${darken.toFixed(2)}"></div>`;
    }

    // Clouds
    if (config.clouds !== "none") {
      html += WeatherLayer.cloudHTML(config.clouds);
    }

    // Lightning
    if (config.lightning) {
      html += '<div class="lightning"></div>';
    }

    // Atmosphere
    if (config.atmosphere) {
      const { color, opacity, layers } = config.atmosphere;
      const sizes = ["lg", "md", "sm"];
      for (let i = 0; i < layers; i++) {
        const size = sizes[i] ?? "sm";
        html += `<div class="atmosphere-layer atmosphere-${size}" style="background:linear-gradient(to top, ${color}, transparent);opacity:${opacity}"></div>`;
      }
    }

    // Precipitation layers
    for (const precipLayer of config.precip) {
      const precipConfig = PRECIP_CONFIG[precipLayer.type];
      if (!precipConfig) continue;
      const count = Math.round(precipConfig.count * precipLayer.intensityScale);
      const particles = WeatherLayer.particleHTML(precipConfig, count);
      html += `<div class="droplets" style="animation-duration:${precipConfig.fallSpeed}">`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += "</div>";
    }

    // Snow accumulation
    if (config.snowAccumulation) {
      html += '<div class="snow-sill">';
      for (let i = 1; i <= 6; i++) {
        html += `<div class="snow-mound snow-mound-${i}"></div>`;
      }
      html += "</div>";
    }

    this.el.innerHTML = html;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
  }
}
