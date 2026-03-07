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

export interface SunPosition {
  /** Degrees above horizon: 0 at horizon, ~90 at zenith */
  altitude: number;
  /** Compass bearing: 0=N, 90=E, 180=S, 270=W */
  azimuth: number;
  /** Daytime progress: 0=sunrise, 0.5=solar noon, 1=sunset. -1 when nighttime */
  progress: number;
}

export interface WeatherInfo {
  icon: string | null;
  main: string | null;
  description: string | null;
  temp: number | null;
}

export interface PhaseInfo {
  now: number;
  sunrise: number | null;
  sunset: number | null;
  phaseIndex: number;
  nextPhaseIndex: number;
  /** Interpolation factor 0-1 within the current phase */
  t: number;
  isDaytime: boolean;
  sun: SunPosition;
  weather: WeatherInfo;
}

export interface WeatherCurrent {
  main: string;
  description: string;
  icon: string;
  temp: number;
}

export interface StoreState {
  location: {
    lastFetched: number | null;
    lat: number | null;
    lng: number | null;
    country: string | null;
    name: string | null;
    timezone: string | null;
  };
  weather: {
    lastFetched: number | null;
    units: string | null;
    current: WeatherCurrent | null;
    sunrise: number | null;
    sunset: number | null;
  };
}

export interface LiveWindowState {
  /** Persisted to localStorage — API cache data */
  store: StoreState;
  /** Recomputed each update cycle from store + current time */
  computed: {
    phase: PhaseInfo;
  };
  /**
   * Transient references written by components during update() and read by
   * downstream components in the same cycle. Not persisted to localStorage.
   *
   * Ordering contract: GradientLayer writes `currentGradient` first (it is
   * the first child of SkyComponent). Subsequent layers or components may
   * read it to adapt their visuals to the current sky color.
   */
  ref: {
    currentGradient?: SkyGradient;
    /** True once celestial position data is reliable (weather fetched or no API). */
    celestialReady?: boolean;
    /** Override timestamp set by playground controls; used by ClockComponent. */
    nowOverride?: number;
  };
  /** Derived from web component attributes each cycle */
  attrs: {
    use12Hour: boolean;
    hideClock: boolean;
    hideWeatherText: boolean;
    bgColor: RGB;
    resolvedUnits: string;
    timezone: string | null;
    label: string | null;
    // Override attributes (dev playground)
    overrideTime: string | null;
    overrideWeather: string | null;
    overrideWeatherDescription: string | null;
    overrideSunrise: string | null;
    overrideSunset: string | null;
    tickSpeed: number;
  };
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleDuration: number;
  twinkleDelay: number;
  glowSize: number;
}

export interface SceneComponent {
  /** Create DOM elements inside the provided container */
  mount(container: HTMLElement): void;
  /** Called by the orchestrator at the component's update cadence */
  update(state: LiveWindowState): void;
  /** Tear down DOM and release resources */
  destroy(): void;
}
