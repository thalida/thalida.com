import type { SceneComponent, LiveWindowState } from "../../types";

/**
 * Maps OpenWeatherMap icon codes to visual effects.
 * Icon format: two-digit condition code + "d" (day) or "n" (night).
 * See https://openweathermap.org/weather-conditions for full reference.
 */
export const ICON_WEATHER_MAP: Record<string, string[]> = {
  "02d": ["cloudSm"], // few clouds
  "02n": ["cloudSm"],
  "03d": ["cloudSm", "cloudMd"], // scattered clouds
  "03n": ["cloudSm", "cloudMd"],
  "04d": ["cloudSm", "cloudMd", "cloudLg"], // overcast
  "04n": ["cloudSm", "cloudMd", "cloudLg"],
  "09d": ["cloudMd", "lightRain"], // drizzle
  "09n": ["cloudMd", "lightRain"],
  "10d": ["cloudMd", "cloudLg", "rain"], // rain
  "10n": ["cloudMd", "cloudLg", "rain"],
  "11d": ["cloudSm", "cloudMd", "cloudLg", "thunderstorm"], // thunderstorm
  "11n": ["cloudSm", "cloudMd", "cloudLg", "thunderstorm"],
  "13d": ["snow"], // snow
  "13n": ["snow"],
  "50d": ["mist"], // mist/fog
  "50n": ["mist"],
};

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
  thunderstorm: {
    count: 40,
    fallSpeed: "3s",
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

/**
 * Derive a particle-count multiplier from the OWM description.
 * Descriptions include intensity words like "light rain", "heavy snow",
 * "very heavy rain", "extreme rain" — we scale particle density accordingly.
 */
export function intensityMultiplier(description: string): number {
  const d = description.toLowerCase();
  if (d.includes("extreme")) return 1.8;
  if (d.includes("very heavy")) return 1.6;
  if (d.includes("heavy")) return 1.4;
  if (d.includes("light")) return 0.6;
  return 1.0;
}

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
    const icon = state.computed.phase.weather.icon;
    const desc = (state.computed.phase.weather.description ?? "").toLowerCase();
    const isSleet = icon?.startsWith("13") && (desc.includes("sleet") || desc.includes("rain and snow"));

    let cls = "sky-layer weather";
    if (icon) cls += ` weather-${icon}`;
    this.el.className = cls;

    if (!icon) {
      this.el.innerHTML = "";
      return;
    }

    const effects = ICON_WEATHER_MAP[icon] ?? [];
    const has = (k: string) => effects.includes(k);

    // Determine precipitation type from effects + weather description
    let precipToken: string | null = null;
    if (has("lightRain")) precipToken = "lightRain";
    else if (has("rain")) precipToken = "rain";
    else if (has("thunderstorm")) precipToken = "thunderstorm";
    else if (has("snow")) precipToken = isSleet ? "sleet" : "snow";

    let html = "";
    if (has("cloudLg")) html += '<div class="cloud cloud-lg"></div>';
    if (has("cloudMd")) html += '<div class="cloud cloud-md"></div>';
    if (has("thunderstorm")) html += '<div class="lightning"></div>';
    if (has("cloudSm")) html += '<div class="cloud cloud-sm"></div>';
    if (has("mist")) {
      html += '<div class="mist mist-lg"></div><div class="mist mist-md"></div><div class="mist mist-sm"></div>';
    }
    if (precipToken) {
      const config = PRECIP_CONFIG[precipToken];
      const count = Math.round(config.count * intensityMultiplier(desc));
      const particles = WeatherLayer.particleHTML(config, count);
      html += `<div class="droplets" style="animation-duration:${config.fallSpeed}">`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += "</div>";
    }
    if (has("snow")) {
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
