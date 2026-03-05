import type { Star } from "../types";
import { SKY_PHASES } from "./sky-gradient";

export type { Star } from "../types";

/**
 * Mulberry32 PRNG — deterministic random from a 32-bit seed.
 * Returns a function that produces values in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a star field from a date-based seed.
 * Seed should be YYYYMMDD as an integer (e.g. 20260302).
 */
export function generateStars(seed: number, count = 40): Star[] {
  const rng = mulberry32(seed);
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rng();
    let size: number;
    let baseOpacity: number;
    let glowSize: number;

    if (roll < 0.6) {
      // Dim (60%)
      size = 1 + rng() * 0.5;
      baseOpacity = 0.4 + rng() * 0.2;
      glowSize = 0;
    } else if (roll < 0.9) {
      // Medium (30%)
      size = 1.5 + rng() * 1;
      baseOpacity = 0.6 + rng() * 0.2;
      glowSize = 2 + rng() * 2;
    } else {
      // Bright (10%)
      size = 2.5 + rng() * 1;
      baseOpacity = 0.8 + rng() * 0.2;
      glowSize = 4 + rng() * 4;
    }

    stars.push({
      x: rng() * 100,
      y: rng() * 70,
      size,
      baseOpacity,
      twinkleDuration: 2 + rng() * 3,
      twinkleDelay: rng() * 5,
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
  const clamped = Math.max(0, Math.min(1, t));
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
  const d = new Date(Date.now() - 12 * 60 * 60 * 1000);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
