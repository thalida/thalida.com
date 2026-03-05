import type { SceneComponent, LiveWindowState, RGB } from "./types";
import { loadState, saveState } from "./state";
import { resolveUnits, shouldFetchWeather, fetchLocation, fetchWeather } from "./api";
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
    this.state.attrs = {
      use12Hour: this.getAttribute("time-format") === "12",
      hideClock: this.hasAttribute("hide-clock"),
      hideWeatherText: this.hasAttribute("hide-weather-text"),
      bgColor: this.getBgColor(),
      resolvedUnits: resolveUnits(this.getAttribute("temp-unit"), this.state.store.location.country),
      timezone: this.getAttribute("timezone") || this.state.store.location.timezone || null,
      label: this.getAttribute("label") || null,
    };
  }

  private refreshComputed() {
    const tz = this.state.attrs.timezone;
    const now = tz ? getTimezoneAdjustedNow(tz) : Date.now();

    let store = this.state.store;
    if (tz && store.weather.sunrise != null && store.weather.sunset != null) {
      store = {
        ...store,
        weather: {
          ...store.weather,
          sunrise: shiftTimestampToTimezone(store.weather.sunrise, tz),
          sunset: shiftTimestampToTimezone(store.weather.sunset, tz),
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
    this.skyInterval = window.setInterval(() => this.updateAll(), 15 * 60 * 1000);

    if (this.getAttribute("api-url")) {
      this.startWeatherPolling();
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

  private updateClock() {
    this.refreshAttrs();
    this.clockComponent.update(this.state);
    const tick = this.clockComponent.lastTick;
    if (tick) {
      this.dispatchEvent(new CustomEvent("live-window:clock-update", { detail: tick }));
    }
  }

  private updateAll() {
    this.refreshAttrs();
    this.refreshComputed();
    for (const c of this.components) c.update(this.state);
  }

  // -- API --------------------------------------------------------------------

  private async doFetchWeather(): Promise<void> {
    const apiUrl = this.getAttribute("api-url");
    if (!apiUrl) return;

    const explicitLat = this.getAttribute("latitude");
    const explicitLng = this.getAttribute("longitude");
    const hasExplicitCoords = explicitLat != null && explicitLng != null;

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
      if (!shouldFetchWeather(this.state.store, this.state.attrs.resolvedUnits)) {
        this.updateAll();
        return;
      }

      this.state.store = await fetchLocation(apiUrl, this.state.store);
      saveState(this.state);
    }

    this.refreshAttrs();
    const units = this.state.attrs.resolvedUnits;

    if (!shouldFetchWeather(this.state.store, units) && !hasExplicitCoords) {
      this.updateAll();
      return;
    }

    const result = await fetchWeather(apiUrl, this.state.store, units);
    this.state.store = result.state;

    if (!hasExplicitCoords) {
      saveState(this.state);
    }

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
