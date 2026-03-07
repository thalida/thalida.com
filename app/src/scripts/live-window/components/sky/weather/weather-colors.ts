import type { SkyGradient } from "../../../types";
import type { CloudDensity, WeatherEffectConfig } from "./weather-types";
import { rgbToHex, lerpHex } from "../../../utils/color";
import { smoothstep } from "../../../utils/math";
import { CLOUD_COLORS, SKY_TINT_STRENGTH } from "./weather-configs";

/**
 * Returns 0 (full night) → 1 (full day) based on sun altitude.
 * Clouds stay light well past sunset since real clouds are illuminated
 * from below even after the sun dips below the horizon.
 */
export function getDaylightFactor(sunAltitude: number): number {
  if (sunAltitude >= 6) return 1;
  if (sunAltitude <= -10) return 0;
  const t = (sunAltitude + 10) / 16;
  return smoothstep(t);
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
    return smoothstep(t);
  }
  const t = (10 - sunAltitude) / 8;
  return smoothstep(t);
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

/** Compute an atmosphere color from its [day, night] pair, with optional sunset tinting. */
export function getAtmosphereColor(colors: [string, string], sunAltitude: number, skyGradient?: SkyGradient): string {
  const [day, night] = colors;
  const dayFactor = getDaylightFactor(sunAltitude);
  let color = lerpHex(night, day, dayFactor);

  if (skyGradient) {
    const glowFactor = getHorizonGlowFactor(sunAltitude);
    if (glowFactor > 0) {
      const warmColor = rgbToHex({
        r: Math.round((skyGradient.upper.r + skyGradient.lower.r) / 2),
        g: Math.round((skyGradient.upper.g + skyGradient.lower.g) / 2),
        b: Math.round((skyGradient.upper.b + skyGradient.lower.b) / 2),
      });
      color = lerpHex(color, warmColor, glowFactor * 0.25);
    }
  }

  return color;
}

/**
 * Computes how much to darken the sky based on weather conditions.
 * Returns opacity 0–0.55: heavier weather = darker sky.
 */
export function getSkyDarkenOpacity(config: WeatherEffectConfig): number {
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
