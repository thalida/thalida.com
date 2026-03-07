import type { SceneComponent, LiveWindowState, SkyGradient, RGB } from "../../types";

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
    count: 32,
    fallSpeed: "2.5s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 3.5,
    color: "#7ec8f0",
    opacityRange: [65, 95],
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
  drizzleLight: {
    count: 16,
    fallSpeed: "10s",
    shape: "drop",
    sizeW: [1, 2],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [30, 55],
    hasSway: false,
  },
  drizzleHeavy: {
    count: 28,
    fallSpeed: "6s",
    shape: "drop",
    sizeW: [2, 4],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [55, 80],
    hasSway: false,
  },
  showerDrizzle: {
    count: 25,
    fallSpeed: "4s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 3,
    color: "#28afff",
    opacityRange: [45, 70],
    hasSway: false,
  },
  heavyRain: {
    count: 42,
    fallSpeed: "1.8s",
    shape: "drop",
    sizeW: [4, 5],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [80, 100],
    hasSway: false,
  },
  extremeRain: {
    count: 50,
    fallSpeed: "1.2s",
    shape: "drop",
    sizeW: [4, 6],
    aspectRatio: 2,
    color: "#28afff",
    opacityRange: [85, 100],
    hasSway: false,
  },
  showerSleet: {
    count: 35,
    fallSpeed: "3s",
    shape: "round",
    sizeW: [3, 6],
    aspectRatio: 1,
    color: "#a0cfff",
    opacityRange: [55, 90],
    hasSway: true,
  },
};

export interface AtmosphereConfig {
  color: string;
  opacity: number;
  layers: number;
}

export type WindLevel = "none" | "light" | "moderate" | "strong";

export interface AtmosphereParticleConfig {
  count: number;
  color: string;
  /** Size range [min, max] in px */
  sizeRange: [number, number];
  /** Opacity range [min, max] as 0-100 integers */
  opacityRange: [number, number];
  /** CSS animation duration for particle motion */
  speed: string;
  /** Motion type: float = horizontal drift, swirl = circular, fall = downward, rise = upward */
  drift: "float" | "swirl" | "fall" | "rise";
  /** Width/height ratio. >1 = horizontal elongation, <1 = vertical. Default 1. */
  aspectRatio?: number;
  /** Blur radius in px. Default 4. */
  blur?: number;
  /** CSS border-radius. Default "50%". */
  borderRadius?: string;
}

export type LightningVariant = "distant" | "standard" | "intense";

export const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
  mist: { color: "#c8c8c8", opacity: 0.15, layers: 2 },
  fog: { color: "#b0b0b0", opacity: 0.35, layers: 3 },
  smoke: { color: "#8b7355", opacity: 0.3, layers: 3 },
  haze: { color: "#d4c89a", opacity: 0.2, layers: 2 },
  sand: { color: "#c4a050", opacity: 0.3, layers: 3 },
  dust: { color: "#8a7560", opacity: 0.22, layers: 2 },
  dustWhirls: { color: "#c4a86a", opacity: 0.35, layers: 3 },
  volcanicAsh: { color: "#555555", opacity: 0.4, layers: 3 },
  squalls: { color: "#888888", opacity: 0.3, layers: 3 },
  tornado: { color: "#666666", opacity: 0.45, layers: 3 },
  stormDark: { color: "#1a1a2e", opacity: 0.2, layers: 2 },
};

export const ATMO_PARTICLE_CONFIG: Record<string, AtmosphereParticleConfig> = {
  mistWisps: {
    count: 6,
    color: "#d0d0d0",
    sizeRange: [40, 80],
    opacityRange: [8, 20],
    speed: "16s",
    drift: "float",
    aspectRatio: 4,
    blur: 30,
  },
  fogBanks: {
    count: 4,
    color: "#c0c0c0",
    sizeRange: [100, 160],
    opacityRange: [20, 40],
    speed: "22s",
    drift: "float",
    aspectRatio: 1.3,
    blur: 50,
  },
  smokeWisps: {
    count: 10,
    color: "#7a6548",
    sizeRange: [35, 65],
    opacityRange: [15, 35],
    speed: "11s",
    drift: "rise",
    aspectRatio: 0.8,
    blur: 25,
  },
  dustSwirl: {
    count: 20,
    color: "#a08860",
    sizeRange: [2, 5],
    opacityRange: [30, 55],
    speed: "5s",
    drift: "swirl",
  },
  sandSwirl: {
    count: 28,
    color: "#c4a050",
    sizeRange: [2, 4],
    opacityRange: [40, 65],
    speed: "3.5s",
    drift: "swirl",
  },
  ashFall: {
    count: 18,
    color: "#444",
    sizeRange: [3, 6],
    opacityRange: [35, 65],
    speed: "7s",
    drift: "fall",
  },
  debrisSwirl: {
    count: 15,
    color: "#5a5040",
    sizeRange: [3, 8],
    opacityRange: [30, 55],
    speed: "4s",
    drift: "swirl",
  },
  iceGlint: {
    count: 12,
    color: "#e0f0ff",
    sizeRange: [1, 3],
    opacityRange: [40, 80],
    speed: "3s",
    drift: "float",
  },
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
  lightning: LightningVariant | false;
  atmosphere: AtmosphereConfig | null;
  wind: WindLevel;
  atmosphereParticles: AtmosphereParticleConfig | null;
}

export interface PrecipLayer {
  type: string;
  intensityScale: number;
}

function fx(
  clouds: WeatherEffectConfig["clouds"],
  precip: PrecipLayer[],
  opts?: {
    lightning?: LightningVariant;
    atmosphere?: AtmosphereConfig;
    wind?: WindLevel;
    atmosphereParticles?: AtmosphereParticleConfig;
  },
): WeatherEffectConfig {
  return {
    clouds,
    precip,
    lightning: opts?.lightning ?? false,
    atmosphere: opts?.atmosphere ?? null,
    wind: opts?.wind ?? "none",
    atmosphereParticles: opts?.atmosphereParticles ?? null,
  };
}

function p(type: string, intensityScale = 1.0): PrecipLayer {
  return { type, intensityScale };
}

export const WEATHER_EFFECTS: Record<number, WeatherEffectConfig> = {
  // 2xx Thunderstorm
  200: fx("heavy", [p("lightRain", 0.6)], { lightning: "distant" }),
  201: fx("storm", [p("rain")], { lightning: "standard" }),
  202: fx("storm", [p("heavyRain")], {
    lightning: "intense",
    atmosphere: ATMOSPHERE_CONFIG.stormDark,
    wind: "moderate",
  }),
  210: fx("heavy", [], { lightning: "distant" }),
  211: fx("storm", [], { lightning: "standard" }),
  212: fx("storm", [], { lightning: "intense", atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  221: fx("storm", [p("lightRain", 0.4)], { lightning: "standard" }),
  230: fx("heavy", [p("drizzle")], { lightning: "standard" }),
  231: fx("storm", [p("drizzle", 1.4)], { lightning: "standard" }),
  232: fx("storm", [p("drizzle", 1.8)], {
    lightning: "intense",
    atmosphere: ATMOSPHERE_CONFIG.stormDark,
    wind: "moderate",
  }),

  // 3xx Drizzle
  300: fx("light", [p("drizzleLight")]),
  301: fx("medium", [p("drizzle")]),
  302: fx("medium", [p("drizzleHeavy")]),
  310: fx("medium", [p("drizzle", 0.6), p("lightRain", 0.4)]),
  311: fx("medium", [p("drizzle", 0.7), p("lightRain", 0.7)]),
  312: fx("medium", [p("drizzleHeavy", 0.8), p("rain", 0.7)]),
  313: fx("medium", [p("showerRain", 0.7), p("drizzle", 0.5)], { wind: "light" }),
  314: fx("heavy", [p("showerRain", 1.2), p("drizzleHeavy", 0.6)], { wind: "moderate" }),
  321: fx("medium", [p("showerDrizzle")], { wind: "light" }),

  // 5xx Rain
  500: fx("medium", [p("lightRain", 0.6)]),
  501: fx("medium", [p("rain")]),
  502: fx("heavy", [p("heavyRain")]),
  503: fx("heavy", [p("heavyRain", 1.3)], { wind: "light" }),
  504: fx("storm", [p("extremeRain")], { wind: "moderate", atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  511: fx("heavy", [p("freezingRain")], { atmosphereParticles: ATMO_PARTICLE_CONFIG.iceGlint }),
  520: fx("medium", [p("showerRain", 0.6)], { wind: "light" }),
  521: fx("medium", [p("showerRain")], { wind: "light" }),
  522: fx("heavy", [p("showerRain", 1.4)], { wind: "moderate" }),
  531: fx("medium", [p("showerRain", 0.5), p("lightRain", 0.3)]),

  // 6xx Snow
  600: fx("medium", [p("lightSnow", 0.6)]),
  601: fx("medium", [p("snow")]),
  602: fx("heavy", [p("heavySnow", 1.4)]),
  611: fx("medium", [p("sleet")]),
  612: fx("medium", [p("showerSleet", 0.6)], { wind: "light" }),
  613: fx("medium", [p("showerSleet")], { wind: "light" }),
  615: fx("medium", [p("lightRain", 0.5), p("lightSnow", 0.5)]),
  616: fx("heavy", [p("rain", 0.7), p("snow", 0.7)]),
  620: fx("medium", [p("showerSnow", 0.6)], { wind: "light" }),
  621: fx("medium", [p("showerSnow")], { wind: "light" }),
  622: fx("heavy", [p("showerSnow", 1.4)], { wind: "moderate" }),

  // 7xx Atmosphere
  701: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.mist, atmosphereParticles: ATMO_PARTICLE_CONFIG.mistWisps }),
  711: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.smoke, atmosphereParticles: ATMO_PARTICLE_CONFIG.smokeWisps }),
  721: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.haze }),
  731: fx("none", [], {
    atmosphere: ATMOSPHERE_CONFIG.dustWhirls,
    atmosphereParticles: ATMO_PARTICLE_CONFIG.dustSwirl,
  }),
  741: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.fog, atmosphereParticles: ATMO_PARTICLE_CONFIG.fogBanks }),
  751: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.sand, atmosphereParticles: ATMO_PARTICLE_CONFIG.sandSwirl }),
  761: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust, atmosphereParticles: ATMO_PARTICLE_CONFIG.dustSwirl }),
  762: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.volcanicAsh, atmosphereParticles: ATMO_PARTICLE_CONFIG.ashFall }),
  771: fx("heavy", [p("heavyRain")], { atmosphere: ATMOSPHERE_CONFIG.squalls, wind: "strong" }),
  781: fx("storm", [p("heavyRain")], {
    atmosphere: ATMOSPHERE_CONFIG.tornado,
    wind: "strong",
    atmosphereParticles: ATMO_PARTICLE_CONFIG.debrisSwirl,
  }),

  // 800+ Clear/Clouds
  800: fx("none", []),
  801: fx("light", []),
  802: fx("medium", []),
  803: fx("heavy", []),
  804: fx("storm", []),
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
    opacity += config.lightning === "intense" ? 0.16 : config.lightning === "distant" ? 0.06 : 0.12;
  }

  if (config.atmosphere) {
    opacity += config.atmosphere.opacity * 0.3;
  }

  return Math.min(opacity, 0.55);
}

/** Day and night cloud colors per density: [day, night]. */
const CLOUD_COLORS: Record<string, [string, string]> = {
  light: ["#ffffff", "#6a7292"],
  medium: ["#ffffff", "#6a7292"],
  heavy: ["#c5c9d6", "#404862"],
  storm: ["#585e78", "#252b48"],
};

/** How much sky tint to apply per density when the sun is near the horizon. Thinner clouds catch more light. */
const SKY_TINT_STRENGTH: Record<string, number> = {
  light: 0.55,
  medium: 0.45,
  heavy: 0.35,
  storm: 0.2,
};

/**
 * Returns 0 (full night) → 1 (full day) based on sun altitude.
 * Clouds stay light well past sunset since real clouds are illuminated
 * from below even after the sun dips below the horizon.
 */
export function getDaylightFactor(sunAltitude: number): number {
  if (sunAltitude >= 6) return 1;
  if (sunAltitude <= -10) return 0;
  const t = (sunAltitude + 10) / 16;
  return t * t * (3 - 2 * t); // smoothstep
}

/**
 * Returns 0–1 factor for sky-color tinting of clouds.
 * Active whenever the sun is near the horizon (sunrise or sunset).
 * Peaks at ~1–2° altitude, fades above 10° and below -4°.
 */
export function getHorizonGlowFactor(sunAltitude: number): number {
  if (sunAltitude < -4 || sunAltitude > 10) return 0;
  if (sunAltitude <= 2) {
    const t = (sunAltitude + 4) / 6;
    return t * t * (3 - 2 * t);
  }
  const t = (10 - sunAltitude) / 8;
  return t * t * (3 - 2 * t);
}

function rgbToHex(c: RGB): string {
  return `#${c.r.toString(16).padStart(2, "0")}${c.g.toString(16).padStart(2, "0")}${c.b.toString(16).padStart(2, "0")}`;
}

/** Linearly interpolate two hex colors by factor t (0→a, 1→b). */
function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16),
    ag = parseInt(a.slice(3, 5), 16),
    ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16),
    bg = parseInt(b.slice(3, 5), 16),
    bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

/** Compute the cloud color for a given density, sun altitude, and optional sky gradient. */
export function getCloudColor(
  density: Exclude<CloudDensity, "none">,
  sunAltitude: number,
  skyGradient?: SkyGradient,
): string {
  const [day, night] = CLOUD_COLORS[density];
  const dayFactor = getDaylightFactor(sunAltitude);
  let color = lerpHex(night, day, dayFactor);

  // Near the horizon (sunrise/sunset), tint clouds with the sky gradient colors
  if (skyGradient) {
    const glowFactor = getHorizonGlowFactor(sunAltitude);
    if (glowFactor > 0) {
      // Average the upper and lower sky bands — gives the dominant sky color at cloud altitude
      const warmColor = rgbToHex({
        r: Math.round((skyGradient.upper.r + skyGradient.lower.r) / 2),
        g: Math.round((skyGradient.upper.g + skyGradient.lower.g) / 2),
        b: Math.round((skyGradient.upper.b + skyGradient.lower.b) / 2),
      });
      const tintStrength = glowFactor * SKY_TINT_STRENGTH[density];
      color = lerpHex(color, warmColor, tintStrength);
    }
  }

  return color;
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

  /** Generate atmosphere particles (mist wisps, dust, ash, etc.) with deterministic placement. */
  static atmosphereParticleHTML(config: AtmosphereParticleConfig): string {
    const sRange = config.sizeRange[1] - config.sizeRange[0];
    const opRange = config.opacityRange[1] - config.opacityRange[0];

    let out = "";
    for (let i = 0; i < config.count; i++) {
      const h = ((i + 1) * 2654435761) >>> 0;
      const left = h % 100;
      const top = ((h >>> 8) ^ (i * 37)) % 80;
      const size = config.sizeRange[0] + (h % (sRange + 1));
      const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;
      const dur = parseFloat(config.speed) + ((h >>> 12) % 30) / 10;
      const delay = -((h >>> 16) % 80) / 10;

      out += `<div class="atmo-particle atmo-${config.drift}" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;opacity:${opacity};background:${config.color};animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"></div>`;
    }
    return out;
  }

  /** Generate lightning bolt HTML based on variant intensity. */
  static lightningHTML(variant: LightningVariant): string {
    switch (variant) {
      case "distant":
        return '<div class="lightning lightning-distant"></div>';
      case "intense":
        return '<div class="lightning lightning-intense"></div><div class="lightning lightning-intense lightning-secondary"></div>';
      default:
        return '<div class="lightning lightning-standard"></div>';
    }
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
    let cls = "sky-layer weather";
    if (config.clouds !== "none") cls += ` weather-clouds-${config.clouds}`;
    this.el.className = cls;

    // Smooth cloud color based on sun altitude, density, and sky gradient
    if (config.clouds !== "none") {
      const color = getCloudColor(config.clouds, state.computed.phase.sun.altitude, state.ref.currentGradient);
      this.el.style.setProperty("--cloud-color", color);
    }

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
      html += WeatherLayer.lightningHTML(config.lightning);
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

    // Atmosphere particles
    if (config.atmosphereParticles) {
      html += WeatherLayer.atmosphereParticleHTML(config.atmosphereParticles);
    }

    // Precipitation layers
    const precipAnim =
      config.wind === "strong"
        ? "precipitate-strong-wind"
        : config.wind === "moderate"
          ? "precipitate-wind"
          : config.wind === "light"
            ? "precipitate-light-wind"
            : "precipitate";

    for (const precipLayer of config.precip) {
      const precipConfig = PRECIP_CONFIG[precipLayer.type];
      if (!precipConfig) continue;
      const count = Math.round(precipConfig.count * precipLayer.intensityScale);
      const particles = WeatherLayer.particleHTML(precipConfig, count);
      html += `<div class="droplets" style="animation-duration:${precipConfig.fallSpeed};animation-name:${precipAnim}">`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += "</div>";
    }

    this.el.innerHTML = html;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
  }
}
