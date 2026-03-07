/** One day in milliseconds. */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** One hour in milliseconds. */
export const ONE_HOUR_MS = 60 * 60 * 1000;

/** Twelve hours in milliseconds. */
export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/** Clock update interval (1 second). */
export const CLOCK_INTERVAL_MS = 1_000;

/** Sky gradient update interval (10 seconds). */
export const SKY_UPDATE_INTERVAL_MS = 10_000;

/** Thirty minutes in milliseconds. */
export const THIRTY_MINUTES_MS = 30 * 60_000;

/** Ninety minutes in milliseconds. */
export const NINETY_MINUTES_MS = 90 * 60_000;

/** Minimum tick speed multiplier for the virtual clock. */
export const MIN_TICK_SPEED = 1;

/** Maximum tick speed multiplier for the virtual clock. */
export const MAX_TICK_SPEED = 1000;

/** Default temperature in Celsius when weather data is unavailable. */
export const DEFAULT_TEMP_CELSIUS = 20;

/** Default background color (black) when no bg-color attribute or computed style is available. */
export const DEFAULT_BG_COLOR = { r: 0, g: 0, b: 0 } as const;

/** Fallback sky color for night when no gradient data is available. Matches SKY_PHASES[0]. */
export const FALLBACK_NIGHT_SKY_RGB = "rgb(14,26,58)";

/** Moon glow color (warm cream) as CSS rgba channel values. Matches #e8e8d0. */
export const MOON_GLOW_COLOR_RGB = "232, 232, 208";

/** Moon glow blur radius in pixels. */
export const MOON_GLOW_BLUR_PX = 10;
