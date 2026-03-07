import type { PrecipConfig, AtmosphereParticleConfig, CloudDensity, LightningVariant } from "./weather-types";
import { knuthHash } from "../../../utils/math";
import { CLOUD_CONFIGS, CLOUD_SHAPES, FLOAT_NAMES, SWAY_NAMES } from "./weather-configs";

// --- Deterministic animation timing ranges ---
// Each element gets a pseudo-random duration and a negative delay
// (negative delays start the animation mid-cycle so elements aren't synchronized)

/** Cloud floating animation: duration 4.0s–9.9s */
const CLOUD_BASE_DURATION = 4;
const CLOUD_DURATION_JITTER = 60; // hash modulo value (divided by 10 → 0.0–5.9s jitter)
/** Cloud animation negative delay: 0.0s to -7.9s */
const CLOUD_MAX_DELAY_TENTHS = 80; // hash modulo value (divided by 10 → 0.0–7.9s)

/** Precipitation sway: duration 2.0s–3.7s */
const SWAY_BASE_DURATION = 2;
const SWAY_DURATION_JITTER = 18; // hash modulo value (divided by 10 → 0.0–1.7s jitter)
/** Precipitation sway negative delay: 0.0s to -3.9s */
const SWAY_MAX_DELAY_TENTHS = 40; // hash modulo value (divided by 10 → 0.0–3.9s)

/** Atmosphere particle jitter: 0.0s–2.9s added to base speed */
const ATMO_DURATION_JITTER = 30; // hash modulo value (divided by 10 → 0.0–2.9s)
/** Atmosphere particle negative delay: 0.0s to -7.9s */
const ATMO_MAX_DELAY_TENTHS = 80; // hash modulo value (divided by 10 → 0.0–7.9s)

/** Atmosphere particles are constrained to the top 80% of the scene vertically. */
const ATMO_Y_RANGE = 80;

/** Golden ratio conjugate — produces evenly-spaced distribution when used as (i * φ) % 1. */
const GOLDEN_RATIO = 0.618033;
/** Initial offset for golden ratio cloud distribution. */
const GOLDEN_RATIO_OFFSET = 0.3;
/** Cloud X range: maps [0,1) to [-5%, 105%] of container (allows partial overflow). */
const CLOUD_X_SCALE = 110;
const CLOUD_X_OFFSET = -5;

/** Second hash constant for Y-position, decorrelated from Knuth hash. */
const Y_HASH_MULTIPLIER = 1597334677;
/** Prime multiplier for decorrelating vertical from horizontal positions. */
const POSITION_DECORRELATION_PRIME = 37;

/**
 * Generate procedural clouds with deterministic pseudo-random placement.
 * Each cloud is a compound shape: a square body with flat-bottom border-radius
 * + 1-2 side extensions (like the old pseudo-elements), all bottom-aligned.
 */
export function cloudHTML(density: Exclude<CloudDensity, "none">, startIdx = 0, endIdx?: number): string {
  const config = CLOUD_CONFIGS[density];
  const end = endIdx ?? config.count;
  const sizeRange = config.sizeRange[1] - config.sizeRange[0];
  const opRange = config.opacityRange[1] - config.opacityRange[0];
  const ySpan = config.yRange[1] - config.yRange[0];

  let out = "";
  for (let i = startIdx; i < end; i++) {
    const h = knuthHash(i);
    const yHash = ((i + 1) * Y_HASH_MULTIPLIER) >>> 0;
    const left = ((i * GOLDEN_RATIO + GOLDEN_RATIO_OFFSET) % 1) * CLOUD_X_SCALE + CLOUD_X_OFFSET;
    const top = config.yRange[0] + (yHash % (ySpan + 1));
    const size = config.sizeRange[0] + (h % (sizeRange + 1));
    const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;

    const floatName = FLOAT_NAMES[i % 3];
    const dur = (CLOUD_BASE_DURATION + ((h >>> 12) % CLOUD_DURATION_JITTER) / 10).toFixed(1);
    const delay = (-((h >>> 16) % CLOUD_MAX_DELAY_TENTHS) / 10).toFixed(1);

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
export function particleHTML(config: PrecipConfig, count?: number): string {
  const n = count ?? config.count;
  const wRange = config.sizeW[1] - config.sizeW[0];
  const opRange = config.opacityRange[1] - config.opacityRange[0];
  const radius = config.shape === "round" ? "50%" : "40%";

  let out = "";
  for (let i = 0; i < n; i++) {
    const h = knuthHash(i);
    const left = h % 100;
    const top = ((h >>> 8) ^ (i * POSITION_DECORRELATION_PRIME)) % 100;
    const w = config.sizeW[0] + (h % (wRange + 1));
    const height = Math.round(w * config.aspectRatio);
    const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;

    let animStyle = "";
    if (config.hasSway) {
      const sway = SWAY_NAMES[i % 3];
      const dur = (SWAY_BASE_DURATION + ((h >>> 12) % SWAY_DURATION_JITTER) / 10).toFixed(1);
      const delay = (-((h >>> 16) % SWAY_MAX_DELAY_TENTHS) / 10).toFixed(1);
      animStyle = `animation-name:${sway};animation-duration:${dur}s;animation-delay:${delay}s`;
    }

    out += `<div class="particle" style="left:${left}%;top:${top}%;width:${w}px;height:${height}px;opacity:${opacity};background:${config.color};border-radius:${radius};${animStyle}"></div>`;
  }
  return out;
}

/** Generate atmosphere particles (mist wisps, dust, ash, etc.) with deterministic placement. */
export function atmosphereParticleHTML(config: AtmosphereParticleConfig): string {
  const sRange = config.sizeRange[1] - config.sizeRange[0];
  const opRange = config.opacityRange[1] - config.opacityRange[0];
  const ar = config.aspectRatio ?? 1;
  const blur = config.blur ?? 4;
  const radius = config.borderRadius ?? "50%";

  let out = "";
  for (let i = 0; i < config.count; i++) {
    const h = knuthHash(i);
    const left = h % 100;
    const top = ((h >>> 8) ^ (i * POSITION_DECORRELATION_PRIME)) % ATMO_Y_RANGE;
    const size = config.sizeRange[0] + (h % (sRange + 1));
    const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;
    const dur = parseFloat(config.speed) + ((h >>> 12) % ATMO_DURATION_JITTER) / 10;
    const delay = -((h >>> 16) % ATMO_MAX_DELAY_TENTHS) / 10;

    const w = ar >= 1 ? size : Math.round(size * ar);
    const ht = ar >= 1 ? Math.round(size / ar) : size;

    out += `<div class="atmo-particle atmo-${config.drift}" style="left:${left}%;top:${top}%;width:${w}px;height:${ht}px;opacity:${opacity};border-radius:${radius};filter:blur(${blur}px);animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"></div>`;
  }
  return out;
}

/** Generate lightning bolt HTML based on variant intensity. */
export function lightningHTML(variant: LightningVariant): string {
  switch (variant) {
    case "distant":
      return '<div class="lightning lightning-distant"></div>';
    case "intense":
      return '<div class="lightning lightning-intense"></div><div class="lightning lightning-intense lightning-secondary"></div>';
    default:
      return '<div class="lightning lightning-standard"></div>';
  }
}
