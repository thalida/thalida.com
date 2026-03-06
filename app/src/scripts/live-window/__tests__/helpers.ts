import type { LiveWindowState, StoreState } from "../types";
import { DEFAULT_STORE } from "../state";
import { buildPhaseInfo } from "../utils/phase";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Creates a test LiveWindowState with sensible defaults and optional overrides.
 *
 * Common usage patterns:
 *   makeTestState()                           — default state at current time
 *   makeTestState({ hours: 1 })               — state at 1 AM (night)
 *   makeTestState({ hours: 12 })              — state at noon (day)
 *   makeTestState({ use12Hour: true })         — 12-hour clock mode
 *   makeTestState({ store: customStore })      — custom store data
 *   makeTestState({ sunrise: 6, sunset: 18 })  — explicit sun times
 */
export function makeTestState(overrides?: {
  hours?: number;
  use12Hour?: boolean;
  hideClock?: boolean;
  hideWeatherText?: boolean;
  resolvedUnits?: "metric" | "imperial";
  timezone?: string | null;
  label?: string | null;
  store?: DeepPartial<StoreState>;
  sunrise?: number;
  sunset?: number;
}): LiveWindowState {
  const hasSunTimes = overrides?.sunrise != null || overrides?.sunset != null;
  const store: StoreState = {
    ...DEFAULT_STORE,
    location: { ...DEFAULT_STORE.location, ...overrides?.store?.location },
    weather: {
      ...DEFAULT_STORE.weather,
      ...overrides?.store?.weather,
      ...(hasSunTimes
        ? {
            sunrise: new Date().setHours(overrides?.sunrise ?? 6, 0, 0, 0),
            sunset: new Date().setHours(overrides?.sunset ?? 18, 0, 0, 0),
          }
        : {}),
    },
  };

  const now = new Date();
  if (overrides?.hours != null) {
    now.setHours(overrides.hours, 0, 0, 0);
  }

  return {
    store,
    computed: { phase: buildPhaseInfo(store, now.getTime()) },
    ref: {},
    attrs: {
      use12Hour: overrides?.use12Hour ?? false,
      hideClock: overrides?.hideClock ?? false,
      hideWeatherText: overrides?.hideWeatherText ?? false,
      bgColor: { r: 0, g: 0, b: 0 },
      resolvedUnits: overrides?.resolvedUnits ?? "metric",
      timezone: overrides?.timezone ?? null,
      label: overrides?.label ?? null,
    },
  };
}
