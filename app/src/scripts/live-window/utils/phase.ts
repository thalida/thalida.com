import type { StoreState, PhaseInfo, SunPosition, WeatherInfo } from "../types";
import { getDefaultSunTimes, findPhasePosition } from "./sky-gradient";

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

  const { phaseIdx, nextIdx, t } = findPhasePosition(now, sr, ss);

  const isDaytime = now >= sr && now <= ss;
  const sun = calculateSunPosition(now, sr, ss);

  const current = state.weather.current;
  const weather: WeatherInfo = {
    id: current?.id ?? null,
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
