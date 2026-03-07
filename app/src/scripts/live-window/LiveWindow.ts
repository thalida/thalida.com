import type { SceneComponent, LiveWindowState, RGB } from "./types";
import { loadState, saveState } from "./state";
import { resolveUnits, shouldFetchWeather, fetchLocation, fetchWeather, locationChanged } from "./api";
import { parseHexColor, parseComputedColor } from "./utils/color";
import {
  ONE_DAY_MS,
  ONE_HOUR_MS,
  CLOCK_INTERVAL_MS,
  SKY_UPDATE_INTERVAL_MS,
  MIN_TICK_SPEED,
  MAX_TICK_SPEED,
  DEFAULT_TEMP_CELSIUS,
  DEFAULT_BG_COLOR,
} from "./utils/constants";
import { buildPhaseInfo } from "./utils/phase";
import { getTimezoneAdjustedNow, shiftTimestampToTimezone } from "./utils/timezone";
import { SkyComponent } from "./components/SkyComponent";
import { BlindsComponent } from "./components/BlindsComponent";
import { ClockComponent } from "./components/ClockComponent";
import { InfoPanelComponent } from "./components/InfoPanelComponent";

import STYLES_URL from "./live-window.css?url";

/** OpenWeatherMap weather ID → human-readable description (lowercase, matching API format). */
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  200: "thunderstorm with light rain",
  201: "thunderstorm with rain",
  202: "thunderstorm with heavy rain",
  210: "light thunderstorm",
  211: "thunderstorm",
  212: "heavy thunderstorm",
  221: "ragged thunderstorm",
  230: "thunderstorm with light drizzle",
  231: "thunderstorm with drizzle",
  232: "thunderstorm with heavy drizzle",
  300: "light intensity drizzle",
  301: "drizzle",
  302: "heavy intensity drizzle",
  310: "light intensity drizzle rain",
  311: "drizzle rain",
  312: "heavy intensity drizzle rain",
  313: "shower rain and drizzle",
  314: "heavy shower rain and drizzle",
  321: "shower drizzle",
  500: "light rain",
  501: "moderate rain",
  502: "heavy intensity rain",
  503: "very heavy rain",
  504: "extreme rain",
  511: "freezing rain",
  520: "light intensity shower rain",
  521: "shower rain",
  522: "heavy intensity shower rain",
  531: "ragged shower rain",
  600: "light snow",
  601: "snow",
  602: "heavy snow",
  611: "sleet",
  612: "light shower sleet",
  613: "shower sleet",
  615: "light rain and snow",
  616: "rain and snow",
  620: "light shower snow",
  621: "shower snow",
  622: "heavy shower snow",
  701: "mist",
  711: "smoke",
  721: "haze",
  731: "sand/dust whirls",
  741: "fog",
  751: "sand",
  761: "dust",
  762: "volcanic ash",
  771: "squalls",
  781: "tornado",
  800: "clear sky",
  801: "few clouds",
  802: "scattered clouds",
  803: "broken clouds",
  804: "overcast clouds",
};

/** Google Fonts stylesheet URL for the clock font. */
const FONT_STYLESHEET_URL = "https://fonts.googleapis.com/css2?family=Squada+One&display=swap";

/** Data attribute used to detect/mark the font <link> element in the host document. */
const FONT_DATA_ATTR = "data-live-window-font";

/**
 * OpenWeatherMap weather group ID → icon code.
 * The group is derived as Math.floor(weatherId / 100).
 */
const WEATHER_GROUP_ICON: Record<number, string> = {
  2: "11", // Thunderstorm
  3: "09", // Drizzle → shower rain icon
  5: "10", // Rain
  6: "13", // Snow
  7: "50", // Atmosphere (fog/mist)
  8: "01", // Clear/Clouds (overridden below for specific cloud IDs)
};

/**
 * Specific OWM weather IDs for cloud coverage → icon code.
 * These override the group-level mapping above.
 */
const CLOUD_COVERAGE_ICON: Record<number, string> = {
  800: "01", // Clear sky
  801: "02", // Few clouds (11-25%)
  802: "03", // Scattered clouds (25-50%)
  803: "04", // Broken clouds (51-84%)
  804: "04", // Overcast clouds (85-100%)
};

class LiveWindowElement extends HTMLElement {
  static observedAttributes = [
    "api-url",
    "time-format",
    "hide-clock",
    "hide-weather-text",
    "temp-unit",
    "theme",
    "bg-color",
    "latitude",
    "longitude",
    "timezone",
    "label",
    "override-time",
    "override-weather",
    "override-sunrise",
    "override-sunset",
    "override-moon-phase",
    "tick-speed",
  ];

  private shadow: ShadowRoot;
  private state: LiveWindowState;

  private skyComponent = new SkyComponent();
  private blindsComponent = new BlindsComponent();
  private clockComponent = new ClockComponent();
  private infoPanelComponent = new InfoPanelComponent();

  private components: SceneComponent[];

  private clockInterval: number | null = null;
  private skyInterval: number | null = null;
  private weatherInterval: number | null = null;

  private virtualTime: number | null = null;
  private virtualTimeAnchorReal: number | null = null;
  private virtualTimePlaying = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.state = loadState();
    this.components = [this.skyComponent, this.blindsComponent, this.clockComponent, this.infoPanelComponent];
  }

  // -- Lifecycle --------------------------------------------------------------

  connectedCallback() {
    if (!document.querySelector(`link[${FONT_DATA_ATTR}]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_STYLESHEET_URL;
      link.setAttribute(FONT_DATA_ATTR, "");
      // Font loaded in host document <head> because Shadow DOM can't load
      // external @font-face stylesheets internally
      document.head.appendChild(link);
    }

    if (!this.shadow.querySelector(".scene")) {
      this.buildDOM();
    }
    this.startUpdates();
  }

  disconnectedCallback() {
    this.stopUpdates();
    for (const c of this.components) c.destroy();
  }

  attributeChangedCallback(
    name: (typeof LiveWindowElement.observedAttributes)[number],
    oldVal: string | null,
    newVal: string | null,
  ) {
    if (oldVal === newVal) return;

    if (
      name === "override-time" ||
      name === "override-weather" ||
      name === "override-sunrise" ||
      name === "override-sunset" ||
      name === "override-moon-phase" ||
      name === "tick-speed"
    ) {
      this.refreshAttrs();
      this.handleOverrideChange();
      return;
    }

    if (name === "time-format" || name === "hide-clock") {
      this.refreshAttrs();
      this.clockComponent.update(this.state);
      return;
    }
    if (name === "hide-weather-text" || name === "bg-color" || name === "label") {
      this.refreshAttrs();
      this.infoPanelComponent.update(this.state);
      return;
    }
    if (name === "temp-unit") {
      this.refreshAttrs();
      this.doFetchWeather();
      return;
    }
    if (name === "latitude" || name === "longitude" || name === "timezone") {
      this.refreshAttrs();
      this.doFetchWeather();
      return;
    }
    if (this.getAttribute("api-url") && !this.weatherInterval) {
      this.startWeatherPolling();
    }
  }

  // -- DOM --------------------------------------------------------------------

  private buildDOM() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLES_URL;
    this.shadow.appendChild(link);

    const scene = document.createElement("div");
    scene.className = "scene";

    const liveWindow = document.createElement("div");
    liveWindow.className = "live-window";
    scene.appendChild(liveWindow);

    // Mount sky
    const skyContainer = document.createElement("div");
    liveWindow.appendChild(skyContainer);
    this.skyComponent.mount(skyContainer);

    // Horizontal bar
    const bar = document.createElement("div");
    bar.className = "horizontal-bar";
    liveWindow.appendChild(bar);

    // Mount blinds
    const blindsContainer = document.createElement("div");
    liveWindow.appendChild(blindsContainer);
    this.blindsComponent.mount(blindsContainer);

    // Mount clock
    const clockContainer = document.createElement("div");
    liveWindow.appendChild(clockContainer);
    this.clockComponent.mount(clockContainer);

    // Mount info panel (outside .live-window, inside .scene)
    const infoPanelContainer = document.createElement("div");
    scene.appendChild(infoPanelContainer);
    this.infoPanelComponent.mount(infoPanelContainer);

    this.shadow.appendChild(scene);
  }

  // -- State ------------------------------------------------------------------

  private refreshAttrs() {
    const tickSpeedRaw = this.getAttribute("tick-speed");
    const tickSpeed = tickSpeedRaw ? Math.max(MIN_TICK_SPEED, Math.min(MAX_TICK_SPEED, parseFloat(tickSpeedRaw))) : 1;

    this.state.attrs = {
      use12Hour: this.getAttribute("time-format") === "12",
      hideClock: this.hasAttribute("hide-clock"),
      hideWeatherText: this.hasAttribute("hide-weather-text"),
      bgColor: this.getBgColor(),
      resolvedUnits: resolveUnits(this.getAttribute("temp-unit"), this.state.store.location.country),
      timezone: this.getAttribute("timezone") || this.state.store.location.timezone || null,
      label: this.getAttribute("label") || null,
      overrideTime: this.getAttribute("override-time"),
      overrideWeather: this.getAttribute("override-weather"),
      overrideSunrise: this.getAttribute("override-sunrise"),
      overrideSunset: this.getAttribute("override-sunset"),
      overrideMoonPhase: this.parseMoonPhase(this.getAttribute("override-moon-phase")),
      tickSpeed,
    };
  }

  private refreshComputed() {
    const { overrideWeather, overrideSunrise, overrideSunset } = this.state.attrs;
    const timezone = this.state.attrs.timezone;
    const now = this.getNow();

    let store = this.state.store;

    // Apply sunrise/sunset overrides
    const sunriseOverride = overrideSunrise ? this.parseTimeToTimestamp(overrideSunrise) : null;
    const sunsetOverride = overrideSunset ? this.parseTimeToTimestamp(overrideSunset) : null;
    if (sunriseOverride != null || sunsetOverride != null) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          sunrise: sunriseOverride ?? store.weather.sunrise,
          sunset: sunsetOverride ?? store.weather.sunset,
        },
      };
    } else if (timezone && store.weather.sunrise != null && store.weather.sunset != null) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          sunrise: shiftTimestampToTimezone(store.weather.sunrise, timezone),
          sunset: shiftTimestampToTimezone(store.weather.sunset, timezone),
        },
      };
    }

    store = this.applyWeatherOverrides(store, overrideWeather, now);

    this.state.computed.phase = buildPhaseInfo(store, now);
  }

  private getBgColor(): RGB {
    const attr = this.getAttribute("bg-color");
    if (attr) {
      const parsed = parseHexColor(attr);
      if (parsed) return parsed;
    }
    const computed = getComputedStyle(this).backgroundColor;
    return parseComputedColor(computed) ?? DEFAULT_BG_COLOR;
  }

  // -- Updates ----------------------------------------------------------------

  private startUpdates() {
    this.refreshAttrs();
    this.updateAll();

    this.clockInterval = window.setInterval(() => this.updateClock(), CLOCK_INTERVAL_MS);
    this.skyInterval = window.setInterval(() => this.updateAll(), SKY_UPDATE_INTERVAL_MS);

    if (this.getAttribute("api-url")) {
      // Blinds open after first weather fetch (see markCelestialReady)
      this.startWeatherPolling();
    } else {
      this.markCelestialReady();
    }
  }

  private startWeatherPolling() {
    this.doFetchWeather();
    this.weatherInterval = window.setInterval(() => this.doFetchWeather(), ONE_HOUR_MS);
  }

  private stopUpdates() {
    if (this.clockInterval != null) clearInterval(this.clockInterval);
    if (this.skyInterval != null) clearInterval(this.skyInterval);
    if (this.weatherInterval != null) clearInterval(this.weatherInterval);
    this.clockInterval = null;
    this.skyInterval = null;
    this.weatherInterval = null;
  }

  private markCelestialReady() {
    if (this.state.ref.celestialReady) return;
    this.state.ref.celestialReady = true;
    this.updateAll();
    this.openBlinds();
  }

  private updateClock() {
    this.refreshAttrs();
    const now = this.getNow();
    this.state.ref.nowOverride = this.hasAnyOverride() ? now : undefined;
    this.clockComponent.update(this.state);
    const tick = this.clockComponent.lastTick;
    if (tick) {
      this.dispatchEvent(new CustomEvent("live-window:clock-update", { detail: tick }));
    }
  }

  private updateAll() {
    this.refreshAttrs();
    this.refreshComputed();
    const now = this.getNow();
    this.state.ref.nowOverride = this.hasAnyOverride() ? now : undefined;
    for (const c of this.components) c.update(this.state);
  }

  // -- Override / Virtual Clock -----------------------------------------------

  private parseMoonPhase(raw: string | null): number | null {
    if (raw == null) return null;
    const v = parseFloat(raw);
    if (Number.isNaN(v)) return null;
    return Math.max(0, Math.min(1, v));
  }

  /** Parse "HH:MM" into a timestamp for today at that time. */
  private parseTimeToTimestamp(hhmm: string): number | null {
    const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const d = new Date();
    d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    return d.getTime();
  }

  private handleOverrideChange() {
    const { overrideTime, tickSpeed } = this.state.attrs;

    if (tickSpeed > 1 && this.virtualTimePlaying) {
      this.virtualTime = overrideTime ? (this.parseTimeToTimestamp(overrideTime) ?? Date.now()) : Date.now();
      this.virtualTimeAnchorReal = Date.now();
    } else if (overrideTime) {
      this.virtualTime = this.parseTimeToTimestamp(overrideTime) ?? null;
      this.virtualTimeAnchorReal = null;
    } else {
      this.virtualTime = null;
      this.virtualTimeAnchorReal = null;
    }

    this.updateAll();
  }

  private hasAnyOverride(): boolean {
    const a = this.state.attrs;
    return !!(a.overrideTime || a.overrideWeather || a.overrideSunrise || a.overrideSunset || a.tickSpeed > 1);
  }

  /**
   * Returns the effective "now" timestamp, accounting for overrides and virtual clock.
   *
   * Four modes (checked in order):
   * 1. Virtual clock advancing — virtualTime + scaled elapsed real time, wraps at midnight
   * 2. Static virtual time — frozen at virtualTime (paused virtual clock)
   * 3. Override time attribute — parsed from "HH:MM" string
   * 4. Normal real time — Date.now() with optional timezone shift
   */
  private getNow(): number {
    const { overrideTime, tickSpeed, timezone } = this.state.attrs;

    // Virtual clock advancing
    if (this.virtualTimePlaying && this.virtualTime != null && this.virtualTimeAnchorReal != null) {
      const realElapsed = Date.now() - this.virtualTimeAnchorReal;
      let vt = this.virtualTime + realElapsed * tickSpeed;

      // Wrap past midnight back to 00:00 (same day)
      const dayStart = new Date(this.virtualTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = dayStart.getTime() + ONE_DAY_MS;
      if (vt >= dayEnd) {
        vt = dayStart.getTime() + ((vt - dayStart.getTime()) % ONE_DAY_MS);
      }
      return vt;
    }

    // Static override time
    if (this.virtualTime != null) {
      return this.virtualTime;
    }

    // Static override from attribute (not yet parsed by handleOverrideChange)
    if (overrideTime) {
      return this.parseTimeToTimestamp(overrideTime) ?? (timezone ? getTimezoneAdjustedNow(timezone) : Date.now());
    }

    // Normal real time
    return timezone ? getTimezoneAdjustedNow(timezone) : Date.now();
  }

  /** Apply weather ID override to the store, returning a new store with overridden current weather. */
  private applyWeatherOverrides(
    store: LiveWindowState["store"],
    overrideWeather: string | null,
    now: number,
  ): LiveWindowState["store"] {
    if (!overrideWeather) return store;

    const weatherId = parseInt(overrideWeather, 10);
    const isDaytime = now >= (store.weather.sunrise ?? 0) && now <= (store.weather.sunset ?? 0);

    return {
      ...store,
      weather: {
        ...store.weather,
        current: {
          id: weatherId,
          main: WEATHER_DESCRIPTIONS[weatherId]?.split(" ")[0] ?? "Unknown",
          description: WEATHER_DESCRIPTIONS[weatherId] ?? "",
          icon: this.deriveWeatherIcon(weatherId, isDaytime),
          temp: store.weather.current?.temp ?? DEFAULT_TEMP_CELSIUS,
        },
      },
    };
  }

  /**
   * Derive the OWM icon code from a weather ID + day/night flag.
   * First checks specific cloud-coverage IDs, then falls back to group-level mapping.
   */
  private deriveWeatherIcon(weatherId: number, isDaytime: boolean): string {
    const iconBase = CLOUD_COVERAGE_ICON[weatherId] ?? WEATHER_GROUP_ICON[Math.floor(weatherId / 100)] ?? "01";
    return iconBase + (isDaytime ? "d" : "n");
  }

  // -- Public API -------------------------------------------------------------

  playVirtualClock(): void {
    if (this.virtualTimePlaying) return;
    this.virtualTimePlaying = true;
    const { overrideTime } = this.state.attrs;
    this.virtualTime = overrideTime
      ? (this.parseTimeToTimestamp(overrideTime) ?? Date.now())
      : (this.virtualTime ?? Date.now());
    this.virtualTimeAnchorReal = Date.now();
  }

  pauseVirtualClock(): void {
    if (!this.virtualTimePlaying) return;
    this.virtualTime = this.getNow();
    this.virtualTimeAnchorReal = null;
    this.virtualTimePlaying = false;
  }

  openBlinds(): void {
    this.blindsComponent.openBlinds();
  }

  closeBlinds(): void {
    this.blindsComponent.closeBlinds();
  }

  // -- Weather API ------------------------------------------------------------

  private async doFetchWeather(): Promise<void> {
    const apiUrl = this.getAttribute("api-url");
    if (!apiUrl) return;

    const explicitLat = this.getAttribute("latitude");
    const explicitLng = this.getAttribute("longitude");
    const hasExplicitCoords = explicitLat != null && explicitLng != null;
    let ipChanged = false;

    if (hasExplicitCoords) {
      this.state.store = {
        ...this.state.store,
        location: {
          lat: parseFloat(explicitLat),
          lng: parseFloat(explicitLng),
          country: null,
          name: null,
          timezone: null,
          lastFetched: Date.now(),
        },
      };
    } else {
      const prevStore = this.state.store;
      this.state.store = await fetchLocation(apiUrl, this.state.store);
      ipChanged = locationChanged(prevStore, this.state.store);
      saveState(this.state);
    }

    this.refreshAttrs();
    const units = this.state.attrs.resolvedUnits;

    if (!ipChanged && !shouldFetchWeather(this.state.store, units) && !hasExplicitCoords) {
      this.markCelestialReady();
      return;
    }

    const result = await fetchWeather(apiUrl, this.state.store, units);
    this.state.store = result.state;

    if (!hasExplicitCoords) {
      saveState(this.state);
    }

    this.markCelestialReady();

    if (result.changed) {
      this.updateAll();
      this.dispatchEvent(
        new CustomEvent("live-window:weather-update", {
          detail: { weather: this.state.store.weather },
        }),
      );
    }
  }
}

customElements.define("live-window", LiveWindowElement);
