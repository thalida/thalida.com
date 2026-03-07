import type { SceneComponent, LiveWindowState, RGB } from "./types";
import { loadState, saveState } from "./state";
import { resolveUnits, shouldFetchWeather, fetchLocation, fetchWeather, locationChanged } from "./api";
import { parseHexColor, parseComputedColor } from "./utils/color";
import { buildPhaseInfo } from "./utils/phase";
import { getTimezoneAdjustedNow, shiftTimestampToTimezone } from "./utils/timezone";
import { SkyComponent } from "./components/SkyComponent";
import { BlindsComponent } from "./components/BlindsComponent";
import { ClockComponent } from "./components/ClockComponent";
import { InfoPanelComponent } from "./components/InfoPanelComponent";

import STYLES_URL from "./live-window.css?url";

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
    if (!document.querySelector("link[data-live-window-font]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Squada+One&display=swap";
      link.setAttribute("data-live-window-font", "");
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

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;

    if (
      name === "override-time" ||
      name === "override-weather" ||
      name === "override-sunrise" ||
      name === "override-sunset" ||
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
    const tickSpeed = tickSpeedRaw ? Math.max(1, Math.min(1000, parseFloat(tickSpeedRaw))) : 1;

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
      tickSpeed,
    };
  }

  private refreshComputed() {
    const { overrideWeather, overrideSunrise, overrideSunset } = this.state.attrs;
    const tz = this.state.attrs.timezone;
    const now = this.getNow();

    let store = this.state.store;

    // Apply sunrise/sunset overrides
    const srOverride = overrideSunrise ? this.parseTimeToTimestamp(overrideSunrise) : null;
    const ssOverride = overrideSunset ? this.parseTimeToTimestamp(overrideSunset) : null;
    if (srOverride != null || ssOverride != null) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          sunrise: srOverride ?? store.weather.sunrise,
          sunset: ssOverride ?? store.weather.sunset,
        },
      };
    } else if (tz && store.weather.sunrise != null && store.weather.sunset != null) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          sunrise: shiftTimestampToTimezone(store.weather.sunrise, tz),
          sunset: shiftTimestampToTimezone(store.weather.sunset, tz),
        },
      };
    }

    // Apply weather overrides
    if (overrideWeather) {
      const weatherId = parseInt(overrideWeather, 10);
      const isDaytime = now >= (store.weather.sunrise ?? 0) && now <= (store.weather.sunset ?? 0);
      // Derive icon from weather ID group for day/night
      const iconMap: Record<number, string> = {
        2: "11",
        3: "09",
        5: "10",
        6: "13",
        7: "50",
        8: "01",
      };
      const group = Math.floor(weatherId / 100);
      const iconBase = iconMap[group] ?? "01";
      // Special cases for cloud coverage icons
      let icon: string;
      if (weatherId === 800) icon = "01";
      else if (weatherId === 801) icon = "02";
      else if (weatherId === 802) icon = "03";
      else if (weatherId === 803 || weatherId === 804) icon = "04";
      else icon = iconBase;

      store = {
        ...store,
        weather: {
          ...store.weather,
          current: {
            id: weatherId,
            main: overrideWeather,
            description: "",
            icon: icon + (isDaytime ? "d" : "n"),
            temp: store.weather.current?.temp ?? 20,
          },
        },
      };
    }

    this.state.computed.phase = buildPhaseInfo(store, now);
  }

  private getBgColor(): RGB {
    const attr = this.getAttribute("bg-color");
    if (attr) {
      const parsed = parseHexColor(attr);
      if (parsed) return parsed;
    }
    const computed = getComputedStyle(this).backgroundColor;
    return parseComputedColor(computed) ?? { r: 0, g: 0, b: 0 };
  }

  // -- Updates ----------------------------------------------------------------

  private startUpdates() {
    this.refreshAttrs();
    this.updateAll();

    this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
    this.skyInterval = window.setInterval(() => this.updateAll(), 10 * 1000);

    if (this.getAttribute("api-url")) {
      // Blinds open after first weather fetch (see markCelestialReady)
      this.startWeatherPolling();
    } else {
      this.markCelestialReady();
    }
  }

  private startWeatherPolling() {
    this.doFetchWeather();
    this.weatherInterval = window.setInterval(() => this.doFetchWeather(), 60 * 60 * 1000);
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

  /** Returns the effective "now" timestamp, accounting for overrides and virtual clock. */
  private getNow(): number {
    const { overrideTime, tickSpeed, timezone } = this.state.attrs;

    // Virtual clock advancing
    if (this.virtualTimePlaying && this.virtualTime != null && this.virtualTimeAnchorReal != null) {
      const realElapsed = Date.now() - this.virtualTimeAnchorReal;
      let vt = this.virtualTime + realElapsed * tickSpeed;

      // Wrap past midnight back to 00:00 (same day)
      const dayStart = new Date(this.virtualTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000;
      if (vt >= dayEnd) {
        vt = dayStart.getTime() + ((vt - dayStart.getTime()) % (24 * 60 * 60 * 1000));
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
