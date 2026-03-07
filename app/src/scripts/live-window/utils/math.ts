/** Clamp a value to [0, 1]. */
export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Linear interpolation: returns a + (b - a) * t. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Hermite smoothstep: assumes t is already in [0, 1]. */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Knuth multiplicative hash. Returns an unsigned 32-bit integer. */
export function knuthHash(i: number): number {
  return ((i + 1) * 2654435761) >>> 0;
}
