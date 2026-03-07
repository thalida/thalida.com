import type { Star } from "../types";
import { clamp01 } from "./math";
import { TWELVE_HOURS_MS } from "./constants";
import { SKY_PHASES } from "./sky-gradient";

/**
 * Mulberry32 PRNG — deterministic random from a 32-bit seed.
 * Returns a function that produces values in [0, 1).
 * @see https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

const DEFAULT_STAR_COUNT = 40;
const STAR_FIELD_WIDTH = 100;
const STAR_FIELD_HEIGHT = 70;
const TWINKLE_DURATION_MIN = 2;
const TWINKLE_DURATION_RANGE = 3;
const TWINKLE_DELAY_MAX = 5;

// Star tiers: probability thresholds and visual properties
const DIM_THRESHOLD = 0.6;
const MEDIUM_THRESHOLD = 0.9;

const STAR_TIERS = {
  dim: { sizeMin: 1, sizeRange: 0.5, opacityMin: 0.4, opacityRange: 0.2, glowMin: 0, glowRange: 0 },
  medium: { sizeMin: 1.5, sizeRange: 1, opacityMin: 0.6, opacityRange: 0.2, glowMin: 2, glowRange: 2 },
  bright: { sizeMin: 2.5, sizeRange: 1, opacityMin: 0.8, opacityRange: 0.2, glowMin: 4, glowRange: 4 },
} as const;

/**
 * Generates a star field from a date-based seed.
 * Seed should be YYYYMMDD as an integer (e.g. 20260302).
 */
export function generateStars(seed: number, count = DEFAULT_STAR_COUNT): Star[] {
  const rng = mulberry32(seed);
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rng();
    const tier =
      roll < DIM_THRESHOLD ? STAR_TIERS.dim : roll < MEDIUM_THRESHOLD ? STAR_TIERS.medium : STAR_TIERS.bright;

    const size = tier.sizeMin + rng() * tier.sizeRange;
    const baseOpacity = tier.opacityMin + rng() * tier.opacityRange;
    const glowSize = tier.glowMin + rng() * tier.glowRange;

    stars.push({
      x: rng() * STAR_FIELD_WIDTH,
      y: rng() * STAR_FIELD_HEIGHT,
      size,
      baseOpacity,
      twinkleDuration: TWINKLE_DURATION_MIN + rng() * TWINKLE_DURATION_RANGE,
      twinkleDelay: rng() * TWINKLE_DELAY_MAX,
      glowSize,
    });
  }

  return stars;
}

/**
 * Phase-index to base star opacity (before interpolation).
 *
 * Phase indices correspond to sky phases (see SKY_PHASES in sky-gradient.ts):
 *  0 = night (full stars), 1 = astronomical dawn, 2 = nautical dawn,
 *  3 = civil dawn (stars fading), 4–12 = daytime (no stars),
 *  13 = civil dusk (stars appearing), 14 = nautical dusk, 15 = astronomical dusk.
 *
 * Unlisted indices default to 0 (no stars visible during daytime phases).
 */
const PHASE_OPACITY: Record<number, number> = {
  0: 1.0, // night — full brightness
  1: 0.7, // astronomical dawn — fading
  2: 0.4, // nautical dawn — dim
  3: 0.1, // civil dawn — barely visible
  13: 0.1, // civil dusk — just appearing
  14: 0.4, // nautical dusk — growing
  15: 0.7, // astronomical dusk — bright
};

/**
 * Returns the overall stars-layer opacity for the given phase + interpolation factor.
 * Smoothly blends between the current phase opacity and the next phase opacity.
 */
export function getStarsOpacity(phaseIndex: number, t: number): number {
  const clamped = clamp01(t);
  const current = PHASE_OPACITY[phaseIndex] ?? 0;
  const nextPhase = (phaseIndex + 1) % SKY_PHASES.length;
  const next = PHASE_OPACITY[nextPhase] ?? 0;
  return current + (next - current) * clamped;
}

/**
 * Returns the current "star night" seed as YYYYMMDD integer.
 *
 * The seed rolls over at noon instead of midnight so that the entire
 * night (sunset → sunrise) shares the same star field.  Before noon
 * the previous calendar day's seed is used; after noon the current
 * day's seed kicks in — but stars are invisible during the day anyway.
 */
export function todaySeed(): number {
  const d = new Date(Date.now() - TWELVE_HOURS_MS);
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
}
