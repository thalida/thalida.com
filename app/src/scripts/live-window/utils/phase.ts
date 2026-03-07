import type { StoreState, PhaseInfo, SunPosition, WeatherInfo } from "../types";
import { getSunTimesWithDefaults, findPhasePosition } from "./sky-gradient";

const MAX_SUN_ALTITUDE = 90;
const AZIMUTH_EAST = 90;
const AZIMUTH_RANGE = 180;

export function calculateSunPosition(now: number, sunrise: number, sunset: number): SunPosition {
  const isDaytime = now >= sunrise && now <= sunset;

  if (!isDaytime) {
    return { altitude: 0, azimuth: 0, progress: -1 };
  }

  const dayDuration = sunset - sunrise;
  const progress = dayDuration > 0 ? (now - sunrise) / dayDuration : 0;

  // Altitude: sine curve peaking at solar noon
  const altitude = MAX_SUN_ALTITUDE * Math.sin(progress * Math.PI);

  // Azimuth: linear interpolation from east (90°) to west (270°)
  const azimuth = AZIMUTH_EAST + progress * AZIMUTH_RANGE;

  return { altitude, azimuth, progress };
}

export function buildPhaseInfo(state: StoreState, now: number): PhaseInfo {
  const { sunrise: sr, sunset: ss } = getSunTimesWithDefaults(state.weather.sunrise, state.weather.sunset);

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
