import type { RGB } from "./types";

/**
 * Parse a 6-digit hex color string (with or without leading #) into RGB.
 * Returns null if the string is not a valid 6-digit hex color.
 */
export function parseHexColor(hex: string): RGB | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/**
 * Parse a computed CSS color string like "rgb(r, g, b)" into RGB.
 * Returns null if the string does not match the expected format.
 */
export function parseComputedColor(computed: string): RGB | null {
  const match = computed.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  return { r: +match[1], g: +match[2], b: +match[3] };
}

/**
 * Calculate the relative luminance of an RGB color per WCAG 2.0.
 * Returns a value between 0 (black) and 1 (white).
 */
export function relativeLuminance(c: RGB): number {
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
}

/**
 * Calculate the WCAG contrast ratio between two RGB colors.
 * Returns a value between 1 (identical) and 21 (black on white).
 */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Adjust a foreground color so it meets the minimum contrast ratio against
 * the given background. If the color already meets the threshold it is
 * returned unchanged. Otherwise its lightness is boosted (with a neon-style
 * saturation bump) via binary search until the contrast target is met.
 */
export function getReadableColor(color: RGB, bg: RGB, minContrast = 4.5): RGB {
  if (contrastRatio(color, bg) >= minContrast) return color;

  // Convert to HSL, then increase lightness until contrast is met
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = (max + min) / 2 > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / (max - min) + 2) / 6;
    else h = ((r - g) / (max - min) + 4) / 6;
  }

  // Boost saturation for a neon look
  s = Math.min(s + (1 - s) * 0.6, 1);

  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const hslToRgb = (l: number): RGB => {
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hueToRgb(p, q, h) * 255),
      b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
    };
  };

  // Binary search for the minimum lightness that meets the contrast ratio
  let lo = (max + min) / 2;
  let hi = 1;
  let result = hslToRgb(hi);
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const candidate = hslToRgb(mid);
    if (contrastRatio(candidate, bg) >= minContrast) {
      result = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return result;
}
