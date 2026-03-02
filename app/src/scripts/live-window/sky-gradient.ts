export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SkyGradient {
  zenith: RGB;
  upper: RGB;
  lower: RGB;
  horizon: RGB;
}

interface SkyPhase {
  name: string;
  gradient: SkyGradient;
}

// 16 sky phases ordered chronologically from midnight.
// Each defines a 4-stop vertical gradient: zenith (top) → horizon (bottom).
export const SKY_PHASES: SkyPhase[] = [
  {
    name: "night",
    gradient: {
      zenith: { r: 5, g: 5, b: 25 },
      upper: { r: 10, g: 15, b: 40 },
      lower: { r: 10, g: 15, b: 45 },
      horizon: { r: 12, g: 20, b: 50 },
    },
  },
  {
    name: "astronomicalDawn",
    gradient: {
      zenith: { r: 10, g: 15, b: 40 },
      upper: { r: 15, g: 20, b: 55 },
      lower: { r: 25, g: 25, b: 70 },
      horizon: { r: 35, g: 30, b: 80 },
    },
  },
  {
    name: "nauticalDawn",
    gradient: {
      zenith: { r: 15, g: 25, b: 60 },
      upper: { r: 30, g: 40, b: 90 },
      lower: { r: 50, g: 45, b: 100 },
      horizon: { r: 80, g: 60, b: 100 },
    },
  },
  {
    name: "civilDawn",
    gradient: {
      zenith: { r: 40, g: 60, b: 120 },
      upper: { r: 60, g: 80, b: 150 },
      lower: { r: 120, g: 100, b: 160 },
      horizon: { r: 200, g: 130, b: 120 },
    },
  },
  {
    name: "sunrise",
    gradient: {
      zenith: { r: 70, g: 130, b: 200 },
      upper: { r: 130, g: 160, b: 210 },
      lower: { r: 220, g: 160, b: 140 },
      horizon: { r: 255, g: 170, b: 80 },
    },
  },
  {
    name: "goldenHourAm",
    gradient: {
      zenith: { r: 80, g: 150, b: 220 },
      upper: { r: 140, g: 185, b: 225 },
      lower: { r: 230, g: 200, b: 170 },
      horizon: { r: 255, g: 200, b: 100 },
    },
  },
  {
    name: "earlyMorning",
    gradient: {
      zenith: { r: 90, g: 165, b: 230 },
      upper: { r: 140, g: 195, b: 235 },
      lower: { r: 180, g: 210, b: 235 },
      horizon: { r: 210, g: 215, b: 220 },
    },
  },
  {
    name: "lateMorning",
    gradient: {
      zenith: { r: 80, g: 160, b: 235 },
      upper: { r: 120, g: 185, b: 240 },
      lower: { r: 170, g: 210, b: 245 },
      horizon: { r: 200, g: 220, b: 240 },
    },
  },
  {
    name: "midday",
    gradient: {
      zenith: { r: 65, g: 150, b: 240 },
      upper: { r: 110, g: 180, b: 245 },
      lower: { r: 160, g: 210, b: 250 },
      horizon: { r: 200, g: 225, b: 245 },
    },
  },
  {
    name: "earlyAfternoon",
    gradient: {
      zenith: { r: 75, g: 155, b: 235 },
      upper: { r: 115, g: 182, b: 240 },
      lower: { r: 165, g: 205, b: 240 },
      horizon: { r: 205, g: 220, b: 235 },
    },
  },
  {
    name: "lateAfternoon",
    gradient: {
      zenith: { r: 70, g: 140, b: 220 },
      upper: { r: 120, g: 170, b: 225 },
      lower: { r: 180, g: 195, b: 210 },
      horizon: { r: 220, g: 200, b: 180 },
    },
  },
  {
    name: "goldenHourPm",
    gradient: {
      zenith: { r: 60, g: 120, b: 200 },
      upper: { r: 110, g: 140, b: 200 },
      lower: { r: 200, g: 170, b: 140 },
      horizon: { r: 255, g: 190, b: 90 },
    },
  },
  {
    name: "sunset",
    gradient: {
      zenith: { r: 50, g: 60, b: 150 },
      upper: { r: 100, g: 80, b: 160 },
      lower: { r: 220, g: 120, b: 100 },
      horizon: { r: 255, g: 100, b: 50 },
    },
  },
  {
    name: "civilDusk",
    gradient: {
      zenith: { r: 30, g: 40, b: 110 },
      upper: { r: 60, g: 50, b: 130 },
      lower: { r: 140, g: 80, b: 120 },
      horizon: { r: 200, g: 100, b: 80 },
    },
  },
  {
    name: "nauticalDusk",
    gradient: {
      zenith: { r: 15, g: 25, b: 70 },
      upper: { r: 30, g: 30, b: 90 },
      lower: { r: 50, g: 40, b: 90 },
      horizon: { r: 70, g: 45, b: 80 },
    },
  },
  {
    name: "astronomicalDusk",
    gradient: {
      zenith: { r: 10, g: 15, b: 45 },
      upper: { r: 15, g: 20, b: 55 },
      lower: { r: 25, g: 25, b: 65 },
      horizon: { r: 35, g: 28, b: 70 },
    },
  },
];

const MIN30 = 30 * 60_000;
const MIN60 = 60 * 60_000;
const MIN90 = 90 * 60_000;

/**
 * Returns default sunrise (6:00 AM) and sunset (6:00 PM) for today.
 * Used as fallback when weather API data is unavailable.
 */
export function getDefaultSunTimes(): { sunrise: number; sunset: number } {
  const now = new Date();
  const sr = new Date(now);
  sr.setHours(6, 0, 0, 0);
  const ss = new Date(now);
  ss.setHours(18, 0, 0, 0);
  return { sunrise: sr.getTime(), sunset: ss.getTime() };
}

/**
 * Calculates the timestamp for each of the 16 sky phases based on
 * sunrise and sunset times.
 *
 * Phase indices:
 *  0: night           — midnight (start of day)
 *  1: astronomicalDawn — sunrise - 90min
 *  2: nauticalDawn     — sunrise - 60min
 *  3: civilDawn        — sunrise - 30min
 *  4: sunrise          — sunrise
 *  5: goldenHourAm     — sunrise + 30min
 *  6: earlyMorning     — sunrise + 60min (golden AM end)
 *  7: lateMorning      — 1/4 of daylight core
 *  8: midday           — solar noon (midpoint of sunrise & sunset)
 *  9: earlyAfternoon   — 3/4 of daylight core
 * 10: lateAfternoon    — sunset - 60min (golden PM start)
 * 11: goldenHourPm     — sunset - 30min
 * 12: sunset           — sunset
 * 13: civilDusk        — sunset + 30min
 * 14: nauticalDusk     — sunset + 60min
 * 15: astronomicalDusk — sunset + 90min
 */
export function calculatePhaseTimestamps(sunrise: number, sunset: number): number[] {
  const midnight = new Date(sunrise);
  midnight.setHours(0, 0, 0, 0);

  const goldenAmEnd = sunrise + MIN60; // end of golden hour AM / start of early morning
  const goldenPmStart = sunset - MIN60; // start of golden hour PM / end of late afternoon
  const solarNoon = (sunrise + sunset) / 2;

  // Daylight core: from goldenAmEnd to goldenPmStart
  const coreStart = goldenAmEnd;
  const coreEnd = goldenPmStart;
  const coreDuration = coreEnd - coreStart;

  const raw = [
    midnight.getTime(), //  0: night
    sunrise - MIN90, //  1: astronomicalDawn
    sunrise - MIN60, //  2: nauticalDawn
    sunrise - MIN30, //  3: civilDawn
    sunrise, //  4: sunrise
    sunrise + MIN30, //  5: goldenHourAm
    goldenAmEnd, //  6: earlyMorning
    coreStart + coreDuration / 4, //  7: lateMorning
    solarNoon, //  8: midday
    coreStart + (coreDuration * 3) / 4, //  9: earlyAfternoon
    goldenPmStart, // 10: lateAfternoon
    sunset - MIN30, // 11: goldenHourPm
    sunset, // 12: sunset
    sunset + MIN30, // 13: civilDusk
    sunset + MIN60, // 14: nauticalDusk
    sunset + MIN90, // 15: astronomicalDusk
  ];

  // At extreme latitudes, phases can overlap or go out of order.
  // For example, with only 1 hour of daylight (sunrise=11:30, sunset=12:30):
  //   - goldenAmEnd (sunrise+60min) = 12:30, same as sunset
  //   - coreDuration becomes 0, so midday/lateMorning/earlyAfternoon collapse
  //   - some timestamps end up BEFORE earlier ones
  // This loop walks the array and bumps any out-of-order timestamp to be
  // 1ms after the previous one. Collapsed phases effectively get ~0 duration
  // and instantly blend into the next — which is correct (there's no real
  // "afternoon" in a 1-hour day).
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] <= raw[i - 1]) {
      raw[i] = raw[i - 1] + 1;
    }
  }

  return raw;
}

function blendChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function blendColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: blendChannel(a.r, b.r, t),
    g: blendChannel(a.g, b.g, t),
    b: blendChannel(a.b, b.b, t),
  };
}

export function blendGradient(a: SkyGradient, b: SkyGradient, t: number): SkyGradient {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    zenith: blendColor(a.zenith, b.zenith, clamped),
    upper: blendColor(a.upper, b.upper, clamped),
    lower: blendColor(a.lower, b.lower, clamped),
    horizon: blendColor(a.horizon, b.horizon, clamped),
  };
}

/**
 * Returns the interpolated sky gradient for a given moment in time.
 * Falls back to default sun times (6AM/6PM) when sunrise/sunset are unavailable.
 */
export function getCurrentSkyGradient(now: number, sunrise: number | null, sunset: number | null): SkyGradient {
  let sr = sunrise;
  let ss = sunset;
  if (sr == null || ss == null) {
    const defaults = getDefaultSunTimes();
    sr = defaults.sunrise;
    ss = defaults.sunset;
  }

  const timestamps = calculatePhaseTimestamps(sr, ss);

  // Find which two phases bracket the current time.
  // If before the first phase or after the last, we're in the night->night wrap.
  let phaseIdx = 0;
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (now >= timestamps[i]) {
      phaseIdx = i;
      break;
    }
  }

  const nextIdx = (phaseIdx + 1) % SKY_PHASES.length;
  const phaseStart = timestamps[phaseIdx];
  const phaseEnd =
    nextIdx === 0
      ? (() => {
          const eod = new Date(now);
          eod.setHours(23, 59, 59, 999);
          return eod.getTime();
        })()
      : timestamps[nextIdx];

  const duration = phaseEnd - phaseStart;
  const t = duration > 0 ? (now - phaseStart) / duration : 0;

  return blendGradient(SKY_PHASES[phaseIdx].gradient, SKY_PHASES[nextIdx].gradient, t);
}
