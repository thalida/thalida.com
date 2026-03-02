import type { SceneComponent, LiveWindowState, RGB } from "./types";
import { loadState, saveState } from "./state";
import { resolveUnits, shouldFetchWeather, fetchLocation, fetchWeather } from "./api";
import { parseHexColor, parseComputedColor } from "./utils/color";
import { buildPhaseInfo } from "./utils/phase";
import { SkyComponent } from "./components/SkyComponent";
import { BlindsComponent } from "./components/BlindsComponent";
import { ClockComponent } from "./components/ClockComponent";
import { WeatherTextComponent } from "./components/WeatherTextComponent";

import STYLES_URL from "./live-window.css?url";

class LiveWindowElement extends HTMLElement {
  static observedAttributes = [
    "openweather-key",
    "ipregistry-key",
    "time-format",
    "hide-clock",
    "hide-weather-text",
    "temp-unit",
    "theme",
    "bg-color",
  ];

  private shadow: ShadowRoot;
  private state: LiveWindowState;

  private skyComponent = new SkyComponent();
  private blindsComponent = new BlindsComponent();
  private clockComponent = new ClockComponent();
  private weatherTextComponent = new WeatherTextComponent();

  private components: SceneComponent[];

  private clockInterval: number | null = null;
  private skyInterval: number | null = null;
  private weatherInterval: number | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.state = loadState();
    this.components = [this.skyComponent, this.blindsComponent, this.clockComponent, this.weatherTextComponent];
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
    if (name === "hide-weather-text" || name === "bg-color") {
      this.refreshAttrs();
      this.weatherTextComponent.update(this.state);
      return;
    }
    if (name === "temp-unit") {
      this.refreshAttrs();
      this.doFetchWeather();
      return;
    }
    if (this.getAttribute("openweather-key") && this.getAttribute("ipregistry-key") && !this.weatherInterval) {
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

    // Mount weather text (outside .live-window, inside .scene)
    const weatherTextContainer = document.createElement("div");
    scene.appendChild(weatherTextContainer);
    this.weatherTextComponent.mount(weatherTextContainer);

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
    };
  }

  private refreshComputed() {
    this.state.computed.phase = buildPhaseInfo(this.state.store, Date.now());
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

    if (this.getAttribute("openweather-key") && this.getAttribute("ipregistry-key")) {
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
    const owKey = this.getAttribute("openweather-key");
    const ipKey = this.getAttribute("ipregistry-key");
    if (!owKey || !ipKey) return;

    const units = this.state.attrs.resolvedUnits;
    if (!shouldFetchWeather(this.state.store, units)) {
      this.updateAll();
      return;
    }

    this.state.store = await fetchLocation(ipKey, this.state.store);
    saveState(this.state);

    const result = await fetchWeather(owKey, this.state.store, units);
    this.state.store = result.state;
    saveState(this.state);

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
