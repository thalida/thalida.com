import type { StoreState, PhaseInfo, SunPosition, WeatherInfo } from "./types";
import { SKY_PHASES, getDefaultSunTimes, calculatePhaseTimestamps } from "./layers/gradient";

export function calculateSunPosition(now: number, sunrise: number, sunset: number): SunPosition {
  const isDaytime = now >= sunrise && now <= sunset;

  if (!isDaytime) {
    return { altitude: 0, azimuth: 0, progress: -1 };
  }

  const dayDuration = sunset - sunrise;
  const progress = dayDuration > 0 ? (now - sunrise) / dayDuration : 0;

  // Altitude: sine curve peaking at solar noon
  const maxAltitude = 90;
  const altitude = maxAltitude * Math.sin(progress * Math.PI);

  // Azimuth: linear interpolation from 90 (east) to 270 (west)
  const azimuth = 90 + progress * 180;

  return { altitude, azimuth, progress };
}

export function buildPhaseInfo(state: StoreState, now: number): PhaseInfo {
  let sr = state.weather.sunrise;
  let ss = state.weather.sunset;
  if (sr == null || ss == null) {
    const defaults = getDefaultSunTimes();
    sr = defaults.sunrise;
    ss = defaults.sunset;
  }

  const timestamps = calculatePhaseTimestamps(sr, ss);

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

  const isDaytime = now >= sr && now <= ss;
  const sun = calculateSunPosition(now, sr, ss);

  const current = state.weather.current;
  const weather: WeatherInfo = {
    icon: current?.icon ?? null,
    main: current?.main ?? null,
    description: current?.description ?? null,
    temp: current?.temp ?? null,
  };

  return {
    now,
    sunrise: state.weather.sunrise,
    sunset: state.weather.sunset,
    phaseIndex: phaseIdx,
    nextPhaseIndex: nextIdx,
    t,
    isDaytime,
    sun,
    weather,
  };
}
