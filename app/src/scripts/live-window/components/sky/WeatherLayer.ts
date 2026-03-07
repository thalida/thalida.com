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
    sizeW: [1, 2],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [30, 55],
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
};

export interface WeatherEffectConfig {
  clouds: "none" | "light" | "medium" | "heavy";
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
  // 2xx Thunderstorm
  200: fx("heavy", [p("lightRain", 0.6)], { lightning: true }),
  201: fx("heavy", [p("rain")], { lightning: true }),
  202: fx("heavy", [p("rain", 1.4)], { lightning: true }),
  210: fx("heavy", [], { lightning: true }),
  211: fx("heavy", [], { lightning: true }),
  212: fx("heavy", [], { lightning: true }),
  221: fx("heavy", [], { lightning: true }),
  230: fx("heavy", [p("drizzle", 0.6)], { lightning: true }),
  231: fx("heavy", [p("drizzle")], { lightning: true }),
  232: fx("heavy", [p("drizzle", 1.4)], { lightning: true }),
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

export class WeatherLayer implements SceneComponent {
  private el: HTMLElement | null = null;

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
    if (icon) cls += ` weather-${icon}`;
    this.el.className = cls;

    let html = "";

    // Clouds
    if (config.clouds === "heavy") {
      html += '<div class="cloud cloud-lg"></div>';
      html += '<div class="cloud cloud-md"></div>';
      html += '<div class="cloud cloud-sm"></div>';
    } else if (config.clouds === "medium") {
      html += '<div class="cloud cloud-md"></div>';
      html += '<div class="cloud cloud-sm"></div>';
    } else if (config.clouds === "light") {
      html += '<div class="cloud cloud-sm"></div>';
    }

    // Lightning
    if (config.lightning) {
      html += '<div class="lightning"></div>';
    }

    // Atmosphere
    if (config.atmosphere) {
      const { color, opacity, layers } = config.atmosphere;
      const sizes = ["lg", "md", "sm"];
      const shadows: Record<string, string> = {
        lg: `0 -10px 20px 10px ${color}`,
        md: `0 -10px 40px 30px ${color}`,
        sm: `0 -10px 30px 20px ${color}`,
      };
      for (let i = 0; i < layers; i++) {
        const size = sizes[i] ?? "sm";
        html += `<div class="atmosphere-layer atmosphere-${size}" style="background:${color};opacity:${opacity};box-shadow:${shadows[size]}"></div>`;
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
