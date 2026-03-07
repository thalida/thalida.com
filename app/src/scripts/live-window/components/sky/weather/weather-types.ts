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

export interface AtmosphereConfig {
  /** [day, night] color pair — interpolated by sun altitude like clouds. */
  color: [string, string];
  opacity: number;
  layers: number;
}

export type WindLevel = "none" | "light" | "moderate" | "strong";

export interface AtmosphereParticleConfig {
  count: number;
  /** [day, night] color pair — interpolated by sun altitude like clouds. */
  color: [string, string];
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

export type CloudDensity = "none" | "light" | "medium" | "heavy" | "storm";

export interface CloudConfig {
  count: number;
  /** Diameter range as % of container width */
  sizeRange: [number, number];
  opacityRange: [number, number];
  /** Vertical zone: clouds appear between yMin% and yMax% from top */
  yRange: [number, number];
}

export interface WeatherEffectConfig {
  clouds: CloudDensity;
  precip: PrecipLayer[];
  lightning: LightningVariant | false;
  atmosphere: AtmosphereConfig | null;
  wind: WindLevel;
  atmosphereParticles: AtmosphereParticleConfig | null;
}

/** Valid precipitation config keys — must match PRECIP_CONFIG object keys. */
export type PrecipType =
  | "lightRain"
  | "rain"
  | "snow"
  | "sleet"
  | "drizzle"
  | "showerRain"
  | "freezingRain"
  | "lightSnow"
  | "heavySnow"
  | "showerSnow"
  | "drizzleLight"
  | "drizzleHeavy"
  | "showerDrizzle"
  | "heavyRain"
  | "extremeRain"
  | "showerSleet";

export interface PrecipLayer {
  type: PrecipType;
  intensityScale: number;
}

interface CloudShapeExt {
  side: "left" | "right";
  width: number;
  height: number;
  offset: number;
  radius: string;
}

export interface CloudShape {
  bodyRadius: string;
  extensions: CloudShapeExt[];
}
