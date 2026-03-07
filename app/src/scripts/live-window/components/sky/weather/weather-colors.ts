import type { SkyGradient } from "../../../types";
import type { CloudDensity, LightningVariant, WeatherEffectConfig } from "./weather-types";
import { rgbToHex, lerpHex } from "../../../utils/color";
import { smoothstep } from "../../../utils/math";
import { CLOUD_COLORS, SKY_TINT_STRENGTH } from "./weather-configs";

// Sun altitude thresholds for daylight factor
const FULL_DAY_ALTITUDE = 6;
const FULL_NIGHT_ALTITUDE = -10;

// Sun altitude thresholds for horizon glow (sunrise/sunset tinting)
const GLOW_MIN_ALTITUDE = -4;
const GLOW_MAX_ALTITUDE = 10;
const GLOW_PEAK_ALTITUDE = 2;

// Atmosphere tint strength when sun is near horizon
const ATMOSPHERE_GLOW_TINT = 0.25;

// Sky darken contributions per cloud density
const CLOUD_DARKEN: Record<Exclude<CloudDensity, "none">, number> = {
  light: 0.05,
  medium: 0.12,
  heavy: 0.22,
  storm: 0.28,
};

const PRECIP_DARKEN_PER_UNIT = 0.05;
const LIGHTNING_DARKEN: Record<LightningVariant, number> = { intense: 0.16, distant: 0.06, standard: 0.12 };
const ATMOSPHERE_DARKEN_FACTOR = 0.3;
const MAX_SKY_DARKEN = 0.55;

/**
 * Returns 0 (full night) → 1 (full day) based on sun altitude.
 * Clouds stay light well past sunset since real clouds are illuminated
 * from below even after the sun dips below the horizon.
 */
export function getDaylightFactor(sunAltitude: number): number {
  if (sunAltitude >= FULL_DAY_ALTITUDE) return 1;
  if (sunAltitude <= FULL_NIGHT_ALTITUDE) return 0;
  const t = (sunAltitude - FULL_NIGHT_ALTITUDE) / (FULL_DAY_ALTITUDE - FULL_NIGHT_ALTITUDE);
  return smoothstep(t);
}

/**
 * Returns 0–1 factor for sky-color tinting of clouds.
 * Active whenever the sun is near the horizon (sunrise or sunset).
 * Peaks at ~1–2° altitude, fades above 10° and below -4°.
 */
export function getHorizonGlowFactor(sunAltitude: number): number {
  if (sunAltitude < GLOW_MIN_ALTITUDE || sunAltitude > GLOW_MAX_ALTITUDE) return 0;
  if (sunAltitude <= GLOW_PEAK_ALTITUDE) {
    const t = (sunAltitude - GLOW_MIN_ALTITUDE) / (GLOW_PEAK_ALTITUDE - GLOW_MIN_ALTITUDE);
    return smoothstep(t);
  }
  const t = (GLOW_MAX_ALTITUDE - sunAltitude) / (GLOW_MAX_ALTITUDE - GLOW_PEAK_ALTITUDE);
  return smoothstep(t);
}

/** Average the upper and lower sky gradient bands — gives the dominant sky color at cloud altitude. */
function averageSkyBands(skyGradient: SkyGradient): string {
  return rgbToHex({
    r: Math.round((skyGradient.upper.r + skyGradient.lower.r) / 2),
    g: Math.round((skyGradient.upper.g + skyGradient.lower.g) / 2),
    b: Math.round((skyGradient.upper.b + skyGradient.lower.b) / 2),
  });
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
      const warmColor = averageSkyBands(skyGradient);
      const tintStrength = glowFactor * SKY_TINT_STRENGTH[density];
      color = lerpHex(color, warmColor, tintStrength);
    }
  }

  return color;
}

/** Compute an atmosphere color from its [day, night] pair, with optional sunset tinting. */
export function getAtmosphereColor(colors: [string, string], sunAltitude: number, skyGradient?: SkyGradient): string {
  const [day, night] = colors;
  const dayFactor = getDaylightFactor(sunAltitude);
  let color = lerpHex(night, day, dayFactor);

  if (skyGradient) {
    const glowFactor = getHorizonGlowFactor(sunAltitude);
    if (glowFactor > 0) {
      const warmColor = averageSkyBands(skyGradient);
      color = lerpHex(color, warmColor, glowFactor * ATMOSPHERE_GLOW_TINT);
    }
  }

  return color;
}

/**
 * Computes how much to darken the sky based on weather conditions.
 * Returns opacity 0–MAX_SKY_DARKEN: heavier weather = darker sky.
 */
export function getSkyDarkenOpacity(config: WeatherEffectConfig): number {
  let opacity = 0;

  if (config.clouds !== "none") {
    opacity += CLOUD_DARKEN[config.clouds] ?? 0;
  }

  for (const layer of config.precip) {
    opacity += PRECIP_DARKEN_PER_UNIT * layer.intensityScale;
  }

  if (config.lightning) {
    opacity += LIGHTNING_DARKEN[config.lightning] ?? LIGHTNING_DARKEN.standard;
  }

  if (config.atmosphere) {
    opacity += config.atmosphere.opacity * ATMOSPHERE_DARKEN_FACTOR;
  }

  return Math.min(opacity, MAX_SKY_DARKEN);
}
