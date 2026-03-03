const TWO_PI = 2 * Math.PI;
const SYNODIC_MS = 29.53059 * 24 * 60 * 60 * 1000;
const NEW_MOON_EPOCH = Date.UTC(2025, 0, 29, 12, 36);

export function getSunAngle(now: number, sunrise: number, sunset: number): number {
  const solarNoon = (sunrise + sunset) / 2;
  const dayMs = 24 * 60 * 60 * 1000;
  const elapsed = now - solarNoon;
  const angle = ((elapsed / dayMs) * TWO_PI) % TWO_PI;
  return angle < 0 ? angle + TWO_PI : angle;
}

export function getMoonPhase(now: number): number {
  const elapsed = now - NEW_MOON_EPOCH;
  const phase = (elapsed / SYNODIC_MS) % 1;
  return phase < 0 ? phase + 1 : phase;
}

export function getMoonAngle(sunAngle: number, moonPhase: number): number {
  const angle = (sunAngle + moonPhase * TWO_PI) % TWO_PI;
  return angle < 0 ? angle + TWO_PI : angle;
}

export interface ArcPosition {
  x: number;
  y: number;
  visible: boolean;
}

export function getArcPosition(angle: number): ArcPosition {
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const visible = a <= Math.PI / 2 || a >= (3 * Math.PI) / 2;

  if (!visible) {
    return { x: 50, y: 100, visible: false };
  }

  let shifted = a + Math.PI / 2;
  if (shifted >= TWO_PI) shifted -= TWO_PI;
  const progress = shifted / Math.PI;

  const x = 10 + progress * 80;
  const y = 70 - Math.sin(progress * Math.PI) * 60;

  return { x, y, visible };
}
