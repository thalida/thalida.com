import type { SkyLayer, StoreState, RGB } from "./types";
import { loadState, saveState } from "./state";
import { resolveUnits, tempSymbol, shouldFetchWeather, fetchLocation, fetchWeather } from "./api";
import { parseHexColor, parseComputedColor, getReadableColor } from "./color";
import { renderClock } from "./clock";
import type { ClockElements } from "./clock";
import { createBlindsState, renderBlinds, updateStrings, runBlindsAnimation, NUM_BLINDS } from "./blinds";
import type { BlindsState } from "./blinds";
import { buildPhaseInfo } from "./phase-info";
import { GradientLayer } from "./layers/gradient";
import { WeatherLayer } from "./layers/weather";

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
  private state: StoreState;
  private layers: SkyLayer[];
  private gradientLayer: GradientLayer;

  private clockInterval: number | null = null;
  private skyInterval: number | null = null;
  private weatherInterval: number | null = null;

  private blindsState: BlindsState;
  private blindsAnimationStarted = false;

  private stringLeftEl!: HTMLDivElement;
  private stringRightEl!: HTMLDivElement;
  private skyEl!: HTMLDivElement;
  private blindsEl!: HTMLDivElement;
  private clockEls!: ClockElements & { containerEl: HTMLDivElement };
  private weatherTextEl!: HTMLParagraphElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.state = loadState();
    this.gradientLayer = new GradientLayer();
    this.layers = [this.gradientLayer, new WeatherLayer()];
    this.blindsState = createBlindsState();
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
    for (const layer of this.layers) layer.destroy();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;

    if (name === "time-format") {
      this.updateClock();
      return;
    }
    if (name === "hide-clock" || name === "hide-weather-text") {
      this.applyVisibility();
      return;
    }
    if (name === "temp-unit") {
      this.doFetchWeather();
      return;
    }
    if (name === "bg-color") {
      this.updateWeatherTextColor();
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
    scene.innerHTML = `
      <div class="live-window">
        <div class="sky"></div>
        <div class="horizontal-bar"></div>
        <div class="blinds" style="--live-window-num-blinds: ${NUM_BLINDS}"></div>
        <div class="blinds-string blinds-string-left"></div>
        <div class="blinds-string blinds-string-right"></div>
        <div class="clock">
          <span class="clock-hour"></span>
          <span class="separator">:</span>
          <span class="clock-minute"></span>
          <span class="clock-ampm" hidden>
            <span class="ampm-am">AM</span>
            <span class="ampm-pm">PM</span>
          </span>
        </div>
      </div>
      <p class="current-weather-text" hidden></p>
    `;
    this.shadow.appendChild(scene);

    this.skyEl = this.shadow.querySelector(".sky") as HTMLDivElement;
    this.blindsEl = this.shadow.querySelector(".blinds") as HTMLDivElement;
    this.stringLeftEl = this.shadow.querySelector(".blinds-string-left") as HTMLDivElement;
    this.stringRightEl = this.shadow.querySelector(".blinds-string-right") as HTMLDivElement;
    this.weatherTextEl = this.shadow.querySelector(".current-weather-text") as HTMLParagraphElement;

    this.clockEls = {
      containerEl: this.shadow.querySelector(".clock") as HTMLDivElement,
      hourEl: this.shadow.querySelector(".clock-hour") as HTMLSpanElement,
      minuteEl: this.shadow.querySelector(".clock-minute") as HTMLSpanElement,
      ampmEl: this.shadow.querySelector(".clock-ampm") as HTMLSpanElement,
      amEl: this.shadow.querySelector(".ampm-am") as HTMLSpanElement,
      pmEl: this.shadow.querySelector(".ampm-pm") as HTMLSpanElement,
    };

    // Mount layers into .sky
    for (const layer of this.layers) {
      const container = document.createElement("div");
      this.skyEl.appendChild(container);
      layer.mount(container);
    }

    this.applyVisibility();
    this.doRenderBlinds();
  }

  private applyVisibility() {
    if (this.clockEls?.containerEl) {
      this.clockEls.containerEl.hidden = this.hasAttribute("hide-clock");
    }
    if (this.weatherTextEl) {
      this.weatherTextEl.hidden = this.hasAttribute("hide-weather-text") || !this.weatherTextEl.textContent;
    }
  }

  // -- Updates ----------------------------------------------------------------

  private startUpdates() {
    this.updateClock();
    this.updateSky();

    this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
    this.skyInterval = window.setInterval(() => this.updateSky(), 15 * 60 * 1000);

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

  // -- Clock ------------------------------------------------------------------

  private get use12Hour(): boolean {
    return this.getAttribute("time-format") === "12";
  }

  private updateClock() {
    if (!this.clockEls) return;
    const { hour, minute } = renderClock(this.clockEls, this.use12Hour);
    this.dispatchEvent(new CustomEvent("live-window:clock-update", { detail: { hour, minute } }));
  }

  // -- Sky & Layers -----------------------------------------------------------

  private updateSky() {
    const phase = buildPhaseInfo(this.state, Date.now());
    for (const layer of this.layers) layer.update(phase);
    this.updateWeatherTextColor();

    if (!this.blindsAnimationStarted) {
      this.blindsAnimationStarted = true;
      runBlindsAnimation(this.blindsState, () => this.doRenderBlinds());
    }
  }

  private get bgColor(): RGB {
    const attr = this.getAttribute("bg-color");
    if (attr) {
      const parsed = parseHexColor(attr);
      if (parsed) return parsed;
    }
    const computed = getComputedStyle(this).backgroundColor;
    return parseComputedColor(computed) ?? { r: 0, g: 0, b: 0 };
  }

  private updateWeatherTextColor() {
    const gradient = this.gradientLayer.currentGradient;
    if (!gradient) return;
    const tc = getReadableColor(gradient.horizon, this.bgColor);
    this.style.setProperty("--weather-text-color", `rgb(${tc.r},${tc.g},${tc.b})`);
  }

  // -- Blinds -----------------------------------------------------------------

  private doRenderBlinds() {
    if (!this.blindsEl) return;
    renderBlinds(this.blindsEl, this.blindsState);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => updateStrings(this.shadow, this.stringLeftEl, this.stringRightEl)),
    );
  }

  // -- API --------------------------------------------------------------------

  private get resolvedUnits() {
    return resolveUnits(this.getAttribute("temp-unit"), this.state.location.country);
  }

  private async doFetchWeather(): Promise<void> {
    const owKey = this.getAttribute("openweather-key");
    const ipKey = this.getAttribute("ipregistry-key");
    if (!owKey || !ipKey) return;

    const units = this.resolvedUnits;
    if (!shouldFetchWeather(this.state, units)) {
      this.updateWeatherText();
      this.updateSky();
      return;
    }

    this.state = await fetchLocation(ipKey, this.state);
    saveState(this.state);

    const result = await fetchWeather(owKey, this.state, units);
    this.state = result.state;
    saveState(this.state);

    if (result.changed) {
      this.updateWeatherText();
      this.updateSky();
      this.dispatchEvent(new CustomEvent("live-window:weather-update", { detail: { weather: this.state.weather } }));
    }
  }

  private updateWeatherText() {
    if (!this.weatherTextEl) return;
    const c = this.state.weather.current;
    if (c) {
      this.weatherTextEl.textContent = `It\u2019s ${Math.round(c.temp)}${tempSymbol(this.resolvedUnits)} with ${c.description}`;
      this.weatherTextEl.hidden = this.hasAttribute("hide-weather-text");
    } else {
      this.weatherTextEl.hidden = true;
    }
  }
}

customElements.define("live-window", LiveWindowElement);
