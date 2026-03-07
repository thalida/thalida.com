/**
 * Celestial circle utilities for sun and moon positioning.
 *
 * Both bodies sit on a 360° circle rotating once per 24 hours.
 *   angle 0     = zenith (solar noon position)
 *   angle π/2   = setting (west horizon)
 *   angle π     = nadir (midnight position)
 *   angle 3π/2  = rising (east horizon)
 *
 * A body is "visible" when its angle is in the upper semicircle
 * (roughly 3π/2 through 0 to π/2, i.e. above the horizon).
 */

import { ONE_DAY_MS } from "./constants";

const TWO_PI = 2 * Math.PI;
const HALF_PI = Math.PI / 2;
const THREE_HALF_PI = (3 * Math.PI) / 2;

/** Synodic month in milliseconds (29.53059 days). */
const SYNODIC_MS = 29.53059 * ONE_DAY_MS;

/** Known new moon: January 29, 2025 12:36 UTC. */
const NEW_MOON_EPOCH = Date.UTC(2025, 0, 29, 12, 36);

// Arc position constants — map celestial angle to window coordinates
const DEFAULT_ARC_X = 50;
const DEFAULT_ARC_Y = 100;
const ARC_X_MIN = 10;
const ARC_X_RANGE = 80;
const ARC_Y_BASE = 85;
const ARC_Y_AMPLITUDE = 42;

/**
 * Returns the sun's angle on the celestial circle.
 * 0 = zenith (solar noon), π = nadir (midnight).
 * Uses actual sunrise/sunset to derive solar noon.
 */
export function getSunAngle(now: number, sunrise: number, sunset: number): number {
  const solarNoon = (sunrise + sunset) / 2;
  const elapsed = now - solarNoon;
  const angle = ((elapsed / ONE_DAY_MS) * TWO_PI) % TWO_PI;
  return angle < 0 ? angle + TWO_PI : angle;
}

/**
 * Returns the current lunar phase as 0–1.
 * 0 = new moon, ~0.25 = first quarter, ~0.5 = full moon, ~0.75 = last quarter.
 */
export function getMoonPhase(now: number): number {
  const elapsed = now - NEW_MOON_EPOCH;
  const phase = (elapsed / SYNODIC_MS) % 1;
  return phase < 0 ? phase + 1 : phase;
}

/**
 * Returns the moon's angle on the celestial circle.
 * The moon lags behind the sun by (phase × 2π).
 */
export function getMoonAngle(sunAngle: number, moonPhase: number): number {
  const angle = (sunAngle + moonPhase * TWO_PI) % TWO_PI;
  return angle < 0 ? angle + TWO_PI : angle;
}

export interface ArcPosition {
  /** Horizontal position as percentage (0=left, 100=right). */
  x: number;
  /** Vertical position as percentage (0=top, 100=bottom). */
  y: number;
  /** Whether the body is above the horizon (visible). */
  visible: boolean;
}

/**
 * Maps a celestial angle to window x/y coordinates.
 *
 * The visible arc spans from 3π/2 (rising, left edge) through
 * 0 (zenith, center top) to π/2 (setting, right edge).
 *
 * Returns visible=false for angles in the lower semicircle (below horizon).
 */
export function getArcPosition(angle: number): ArcPosition {
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const visible = a <= HALF_PI || a >= THREE_HALF_PI;

  if (!visible) {
    return { x: DEFAULT_ARC_X, y: DEFAULT_ARC_Y, visible: false };
  }

  let shifted = a + HALF_PI;
  if (shifted >= TWO_PI) shifted -= TWO_PI;
  const progress = shifted / Math.PI;

  const x = ARC_X_MIN + progress * ARC_X_RANGE;
  const y = ARC_Y_BASE - Math.sin(progress * Math.PI) * ARC_Y_AMPLITUDE;

  return { x, y, visible };
}
