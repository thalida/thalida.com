interface RGB {
  r: number;
  g: number;
  b: number;
}

interface WeatherCurrent {
  main: string;
  description: string;
  icon: string;
  temp: number;
}

const IMPERIAL_COUNTRIES = new Set(["US", "LR", "MM"]);

interface StoreState {
  location: { lastFetched: number | null; lat: number | null; lng: number | null; country: string | null };
  weather: {
    lastFetched: number | null;
    units: string | null;
    current: WeatherCurrent | null;
    sunrise: number | null;
    sunset: number | null;
  };
}

type AnimatableProp = "numBlindsCollapsed" | "blindsOpenDeg" | "blindsSkewDeg" | "skewDirection";

const NUM_BLINDS = 20;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const IP_RATE_LIMIT = 30 * 60_000;
const WEATHER_RATE_LIMIT = 30 * 60_000;
const CACHE_VERSION = 2;
const STORAGE_KEY = "liveWindowStore";
const SUNRISE_COLOR_IDX = 2;
const SUNSET_COLOR_IDX = 6;

const TIME_COLORS: RGB[] = [
  { r: 4, g: 10, b: 30 },
  { r: 139, g: 152, b: 206 },
  { r: 86, g: 216, b: 255 },
  { r: 255, g: 216, b: 116 },
  { r: 255, g: 183, b: 116 },
  { r: 255, g: 153, b: 116 },
  { r: 255, g: 103, b: 116 },
  { r: 20, g: 40, b: 116 },
];

const ICON_WEATHER_MAP: Record<string, string[]> = {
  "02d": ["cloudSm"],
  "02n": ["cloudSm"],
  "03d": ["cloudSm", "cloudMd"],
  "03n": ["cloudSm", "cloudMd"],
  "04d": ["cloudSm", "cloudMd", "cloudLg"],
  "04n": ["cloudSm", "cloudMd", "cloudLg"],
  "09d": ["cloudMd", "lightRain"],
  "09n": ["cloudMd", "lightRain"],
  "10d": ["cloudMd", "cloudLg", "rain"],
  "10n": ["cloudMd", "cloudLg", "rain"],
  "11d": ["cloudSm", "cloudMd", "cloudLg", "thunderstorm"],
  "11n": ["cloudSm", "cloudMd", "cloudLg", "thunderstorm"],
  "13d": ["snow"],
  "13n": ["snow"],
  "50d": ["mist"],
  "50n": ["mist"],
};

const DEFAULT_STATE: StoreState = {
  location: { lastFetched: null, lat: null, lng: null, country: null },
  weather: { lastFetched: null, units: null, current: null, sunrise: null, sunset: null },
};

import STYLES_URL from "./live-window.css?url";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

class LiveWindowElement extends HTMLElement {
  static {
    if (!document.querySelector("link[data-live-window-font]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Squada+One&display=swap";
      link.setAttribute("data-live-window-font", "");
      document.head.appendChild(link);
    }
  }

  static observedAttributes = [
    "openweather-key",
    "ipregistry-key",
    "time-format",
    "hide-clock",
    "hide-weather-text",
    "temp-unit",
    "theme",
  ];

  private shadow: ShadowRoot;
  private state: StoreState;
  private gradient: { start: RGB | null; end: RGB | null } = { start: null, end: null };
  private isDataFetched = false;

  private clockInterval: number | null = null;
  private gradientInterval: number | null = null;
  private weatherInterval: number | null = null;

  private blindsSettings = {
    numBlindsCollapsed: 0,
    blindsOpenDeg: 20,
    blindsSkewDeg: 0,
    skewDirection: 0,
  };
  private blindsAnimationStarted = false;

  private stringLeftEl!: HTMLDivElement;
  private stringRightEl!: HTMLDivElement;
  private skyColorEl!: HTMLDivElement;
  private weatherEl!: HTMLDivElement;
  private blindsEl!: HTMLDivElement;
  private clockEl!: HTMLDivElement;
  private clockHourEl!: HTMLSpanElement;
  private clockMinuteEl!: HTMLSpanElement;
  private clockAmpmEl!: HTMLSpanElement;
  private ampmAmEl!: HTMLSpanElement;
  private ampmPmEl!: HTMLSpanElement;
  private weatherTextEl!: HTMLParagraphElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.state = this.loadState();
  }

  // -- Lifecycle ------------------------------------------------------------

  connectedCallback() {
    if (!this.shadow.querySelector(".scene")) {
      this.buildDOM();
    }
    this.startUpdates();
  }

  disconnectedCallback() {
    this.stopUpdates();
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
      this.fetchWeather();
      return;
    }

    if (this.getAttribute("openweather-key") && this.getAttribute("ipregistry-key") && !this.weatherInterval) {
      this.startWeatherPolling();
    }
  }

  private applyVisibility() {
    if (this.clockEl) {
      this.clockEl.hidden = this.hasAttribute("hide-clock");
    }
    if (this.weatherTextEl) {
      this.weatherTextEl.hidden = this.hasAttribute("hide-weather-text") || !this.weatherTextEl.textContent;
    }
  }

  // -- DOM ------------------------------------------------------------------

  private buildDOM() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLES_URL;
    this.shadow.appendChild(link);

    const scene = document.createElement("div");
    scene.className = "scene";
    scene.innerHTML = `
      <div class="live-window">
        <div class="sky">
          <div class="sky-color"></div>
          <div class="weather"></div>
        </div>
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

    this.skyColorEl = this.shadow.querySelector(".sky-color") as HTMLDivElement;
    this.weatherEl = this.shadow.querySelector(".weather") as HTMLDivElement;
    this.blindsEl = this.shadow.querySelector(".blinds") as HTMLDivElement;
    this.stringLeftEl = this.shadow.querySelector(".blinds-string-left") as HTMLDivElement;
    this.stringRightEl = this.shadow.querySelector(".blinds-string-right") as HTMLDivElement;
    this.clockEl = this.shadow.querySelector(".clock") as HTMLDivElement;
    this.clockHourEl = this.shadow.querySelector(".clock-hour") as HTMLSpanElement;
    this.clockMinuteEl = this.shadow.querySelector(".clock-minute") as HTMLSpanElement;
    this.clockAmpmEl = this.shadow.querySelector(".clock-ampm") as HTMLSpanElement;
    this.ampmAmEl = this.shadow.querySelector(".ampm-am") as HTMLSpanElement;
    this.ampmPmEl = this.shadow.querySelector(".ampm-pm") as HTMLSpanElement;
    this.weatherTextEl = this.shadow.querySelector(".current-weather-text") as HTMLParagraphElement;

    this.applyVisibility();
    this.renderBlinds();
  }

  // -- Intervals ------------------------------------------------------------

  private startUpdates() {
    this.updateClock();
    this.updateGradient();

    this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
    this.gradientInterval = window.setInterval(() => this.updateGradient(), 15 * 60 * 1000);

    if (this.getAttribute("openweather-key") && this.getAttribute("ipregistry-key")) {
      this.startWeatherPolling();
    }
  }

  private startWeatherPolling() {
    this.fetchWeather();
    this.weatherInterval = window.setInterval(() => this.fetchWeather(), 60 * 60 * 1000);
  }

  private stopUpdates() {
    if (this.clockInterval != null) clearInterval(this.clockInterval);
    if (this.gradientInterval != null) clearInterval(this.gradientInterval);
    if (this.weatherInterval != null) clearInterval(this.weatherInterval);
    this.clockInterval = null;
    this.gradientInterval = null;
    this.weatherInterval = null;
  }

  // -- State persistence ----------------------------------------------------

  private loadState(): StoreState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data._v !== CACHE_VERSION) {
          localStorage.removeItem(STORAGE_KEY);
          return JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
        return {
          location: { ...DEFAULT_STATE.location, ...data.location },
          weather: { ...DEFAULT_STATE.weather, ...data.weather },
        };
      }
    } catch {
      /* ignore */
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: CACHE_VERSION, ...this.state }));
    } catch {
      /* ignore */
    }
  }

  // -- Units ----------------------------------------------------------------

  private get resolvedUnits(): "metric" | "imperial" {
    const attr = (this.getAttribute("temp-unit") ?? "auto").toUpperCase();
    if (attr === "F" || attr === "IMPERIAL") return "imperial";
    if (attr === "C" || attr === "METRIC") return "metric";
    const country = this.state.location.country;
    if (country && IMPERIAL_COUNTRIES.has(country)) return "imperial";
    return "metric";
  }

  private get tempSymbol(): string {
    return this.resolvedUnits === "imperial" ? "°F" : "°C";
  }

  // -- Clock ----------------------------------------------------------------

  private get use12Hour(): boolean {
    return this.getAttribute("time-format") === "12";
  }

  private updateClock() {
    const now = new Date();
    const raw = now.getHours();
    let h = raw;
    const m = now.getMinutes();
    const is12 = this.use12Hour;

    if (is12) {
      h = raw % 12 || 12;
    }

    if (this.clockHourEl) this.clockHourEl.textContent = `${h < 10 ? "0" : ""}${h}`;
    if (this.clockMinuteEl) this.clockMinuteEl.textContent = `${m < 10 ? "0" : ""}${m}`;

    if (this.clockAmpmEl) {
      this.clockAmpmEl.hidden = !is12;
      if (is12) {
        const isPm = raw >= 12;
        this.ampmAmEl.classList.toggle("active", !isPm);
        this.ampmPmEl.classList.toggle("active", isPm);
      }
    }
  }

  // -- Sky colour gradient --------------------------------------------------

  private getColorBlend(start: RGB, end: RGB, distance: number): RGB {
    return {
      r: Math.round(start.r + (end.r - start.r) * distance),
      g: Math.round(start.g + (end.g - start.g) * distance),
      b: Math.round(start.b + (end.b - start.b) * distance),
    };
  }

  private isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private getRealisticColor(now: number): RGB {
    const sunriseTime = this.state.weather.sunrise;
    const sunsetTime = this.state.weather.sunset;
    if (sunriseTime == null || sunsetTime == null) return TIME_COLORS[0];

    let colorPhase: RGB[];
    let phaseStartTime: number;
    let phaseEndTime: number;

    if (now < sunriseTime) {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      colorPhase = TIME_COLORS.slice(0, SUNRISE_COLOR_IDX + 1);
      phaseStartTime = midnight.getTime();
      phaseEndTime = sunriseTime;
    } else if (now >= sunsetTime) {
      const eod = new Date(now);
      eod.setHours(23, 59, 59, 999);
      colorPhase = TIME_COLORS.slice(SUNSET_COLOR_IDX);
      colorPhase.push(TIME_COLORS[0]);
      phaseStartTime = sunsetTime;
      phaseEndTime = eod.getTime();

      if (!this.isSameDate(new Date(phaseStartTime), eod)) {
        phaseStartTime += 24 * 60 * 60 * 1000;
      }
    } else {
      colorPhase = TIME_COLORS.slice(SUNRISE_COLOR_IDX, SUNSET_COLOR_IDX + 1);
      phaseStartTime = sunriseTime;
      phaseEndTime = sunsetTime;
    }

    const timeSinceStart = now - phaseStartTime;
    const timeInPhase = phaseEndTime - phaseStartTime;
    const distance = timeSinceStart / timeInPhase;
    const phaseSegments = timeInPhase / (colorPhase.length - 1);
    const startIdx = Math.min(Math.floor((colorPhase.length - 1) * distance), colorPhase.length - 2);
    const endIdx = startIdx + 1;
    const startTime = phaseStartTime + startIdx * phaseSegments;
    const endTime = phaseStartTime + endIdx * phaseSegments;
    const segLen = endTime - startTime;
    const segDist = segLen > 0 ? (now - startTime) / segLen : 0;

    return this.getColorBlend(colorPhase[startIdx], colorPhase[endIdx], segDist);
  }

  private getRealisticColorGradient(): { start: RGB; end: RGB } {
    const date = new Date();
    const now = date.getTime();
    const shiftBy = 1 * 60 * 60 * 1000;
    let hourAgo = new Date(now - shiftBy);

    if (!this.isSameDate(hourAgo, date)) {
      hourAgo = new Date(now);
      hourAgo.setHours(0, 0, 0, 0);
    }

    const gradientStart = this.getRealisticColor(hourAgo.getTime());
    const gradientEnd = this.getRealisticColor(now);

    if (this.state.weather.sunset != null && now >= this.state.weather.sunset) {
      return { start: gradientEnd, end: gradientStart };
    }
    return { start: gradientStart, end: gradientEnd };
  }

  private getColorGradient(): { start: RGB; end: RGB } {
    const date = new Date();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const numSegments = HOURS_IN_DAY / TIME_COLORS.length;
    const startColorIdx = Math.floor(hour / numSegments);
    const endColorIdx = (startColorIdx + 1) % TIME_COLORS.length;

    const timeInMins = hour * MINUTES_IN_HOUR + minute;
    const startColor = TIME_COLORS[startColorIdx];
    const endColor = TIME_COLORS[endColorIdx];
    const colorStartMins = startColorIdx * numSegments * MINUTES_IN_HOUR;
    const colorEndMins =
      endColorIdx === 0 ? HOURS_IN_DAY * MINUTES_IN_HOUR : endColorIdx * numSegments * MINUTES_IN_HOUR;
    const minSince = timeInMins - colorStartMins;
    const range = Math.abs(colorEndMins - colorStartMins);
    const startDist = minSince - 60 >= 0 ? (minSince - 60) / range : 0;
    const endDist = minSince / range;

    const gradientStart = this.getColorBlend(startColor, endColor, startDist);
    const gradientEnd = this.getColorBlend(startColor, endColor, endDist);

    if (startColorIdx >= SUNSET_COLOR_IDX) {
      return { start: gradientEnd, end: gradientStart };
    }
    return { start: gradientStart, end: gradientEnd };
  }

  private updateGradient() {
    let g: { start: RGB; end: RGB };

    if (this.isDataFetched && this.state.weather.sunrise != null && this.state.weather.sunset != null) {
      g = this.getRealisticColorGradient();
    } else {
      g = this.getColorGradient();
    }

    this.gradient = g;
    this.renderSkyColor();

    if (this.gradient.start && !this.blindsAnimationStarted) {
      this.blindsAnimationStarted = true;
      this.runBlindsAnimation();
    }
  }

  private renderSkyColor() {
    if (!this.skyColorEl || !this.gradient.start || !this.gradient.end) return;
    const s = this.gradient.start;
    const e = this.gradient.end;
    this.skyColorEl.style.background = `linear-gradient(180deg, rgb(${s.r},${s.g},${s.b}), rgb(${e.r},${e.g},${e.b}))`;
  }

  // -- Weather effects ------------------------------------------------------

  private renderWeatherEffects() {
    if (!this.weatherEl) return;
    const icon = this.state.weather.current?.icon ?? null;
    this.weatherEl.className = "weather" + (icon ? ` weather-${icon}` : "");

    if (!icon) {
      this.weatherEl.innerHTML = "";
      return;
    }

    const effects = ICON_WEATHER_MAP[icon] ?? [];
    const has = (k: string) => effects.includes(k);
    const showDroplets = has("lightRain") || has("rain") || has("thunderstorm") || has("snow");

    let html = "";
    if (has("cloudLg")) html += '<div class="cloud cloud-lg"></div>';
    if (has("cloudMd")) html += '<div class="cloud cloud-md"></div>';
    if (has("thunderstorm")) html += '<div class="lightning"></div>';
    if (has("cloudSm")) html += '<div class="cloud cloud-sm"></div>';
    if (has("mist")) {
      html += '<div class="mist mist-lg"></div><div class="mist mist-md"></div><div class="mist mist-sm"></div>';
    }
    if (showDroplets) {
      html += '<div class="droplets">';
      for (let i = 0; i < 6; i++) {
        html += `<div class="droplet-row droplet-row-${i + 1}">`;
        for (let j = 0; j < 6; j++) {
          html += `<div class="droplet droplet-${j + 1}"></div>`;
        }
        html += "</div>";
      }
      html += "</div>";
    }
    this.weatherEl.innerHTML = html;
  }

  private updateWeatherText() {
    if (!this.weatherTextEl) return;
    const c = this.state.weather.current;
    if (c) {
      this.weatherTextEl.textContent = `It\u2019s ${Math.round(c.temp)}${this.tempSymbol} with ${c.description}`;
      this.weatherTextEl.hidden = this.hasAttribute("hide-weather-text");
    } else {
      this.weatherTextEl.hidden = true;
    }
  }

  // -- Blinds ---------------------------------------------------------------

  private getSkewAndRotateTransform(blindIndex: number): string {
    const currBlind = NUM_BLINDS - blindIndex;
    const numOpen = NUM_BLINDS - this.blindsSettings.numBlindsCollapsed;
    const skewSteps = numOpen > 0 ? this.blindsSettings.blindsSkewDeg / numOpen : 0;

    let skewDeg = 0;
    if (this.blindsSettings.skewDirection !== 0 && this.blindsSettings.blindsSkewDeg >= 0) {
      skewDeg =
        this.blindsSettings.blindsSkewDeg - (currBlind - this.blindsSettings.numBlindsCollapsed - 1) * skewSteps;
    }

    const rot = this.blindsSettings.blindsOpenDeg;
    return `rotateX(${rot}deg) skewY(${skewDeg * this.blindsSettings.skewDirection}deg)`;
  }

  private getSkewOnlyTransform(): string {
    let skewDeg = 0;
    if (this.blindsSettings.skewDirection !== 0 && this.blindsSettings.blindsSkewDeg >= 0) {
      skewDeg = this.blindsSettings.blindsSkewDeg / 2;
    }
    return `skewY(${skewDeg * this.blindsSettings.skewDirection}deg)`;
  }

  private renderBlinds() {
    if (!this.blindsEl) return;
    const numOpen = NUM_BLINDS - Math.round(this.blindsSettings.numBlindsCollapsed);
    const numCollapsed = Math.round(this.blindsSettings.numBlindsCollapsed);

    let slats = "";
    for (let i = 0; i < numOpen; i++) {
      slats += `<div class="slat slat-${i + 1}" style="transform:${this.getSkewAndRotateTransform(i)}"></div>`;
    }

    const skew = this.getSkewOnlyTransform();
    slats += `<div class="slat-collapse-group" style="transform:${skew}">`;
    for (let i = 0; i < numCollapsed; i++) {
      slats += '<div class="slat collapse"></div>';
    }
    slats += "</div>";

    slats += `<div class="slat-bar" style="transform:${skew}">`;
    slats += '<span class="string-marker string-marker-left"></span>';
    slats += '<span class="string-marker string-marker-right"></span>';
    slats += "</div>";

    this.blindsEl.innerHTML = `
      <div class="slats">${slats}</div>
      <div class="rod"></div>
    `;

    requestAnimationFrame(() => requestAnimationFrame(() => this.updateStrings()));
  }

  private updateStrings() {
    const win = this.shadow.querySelector(".live-window");
    const ml = this.shadow.querySelector(".string-marker-left");
    const mr = this.shadow.querySelector(".string-marker-right");
    if (!win || !ml || !mr) return;

    const winTop = win.getBoundingClientRect().top;

    if (this.stringLeftEl) this.stringLeftEl.style.height = `${ml.getBoundingClientRect().top - winTop}px`;
    if (this.stringRightEl) this.stringRightEl.style.height = `${mr.getBoundingClientRect().top - winTop}px`;
  }

  private stepAnimation(
    targets: Partial<Record<AnimatableProp, { targetValue: number; step: number }>>,
    speedMs = 100,
  ): Promise<void> {
    const remaining = new Map(Object.entries(targets) as [string, { targetValue: number; step: number }][]);
    return new Promise<void>((resolve) => {
      const interval = window.setInterval(() => {
        const size = remaining.size;
        let finished = 0;

        for (const [prop, anim] of remaining) {
          const cur = (this.blindsSettings as unknown as Record<string, number>)[prop];
          const dir = cur < anim.targetValue ? 1 : -1;
          const next = cur + anim.step * dir;
          (this.blindsSettings as unknown as Record<string, number>)[prop] = next;

          const reached = dir === -1 ? next <= anim.targetValue : next >= anim.targetValue;
          if (reached) {
            finished++;
            remaining.delete(prop);
          }
        }

        this.renderBlinds();

        if (finished >= size) {
          clearInterval(interval);
          resolve();
        }
      }, speedMs);
    });
  }

  private runBlindsAnimation() {
    this.stepAnimation({ blindsOpenDeg: { targetValue: 75, step: 5 } }, 150).then(() => {
      this.stepAnimation({
        blindsOpenDeg: { targetValue: 80, step: 1 },
        numBlindsCollapsed: { targetValue: NUM_BLINDS * 0.7, step: 1 },
        blindsSkewDeg: { targetValue: 5, step: 1 },
        skewDirection: { targetValue: -1, step: 1 },
      });
    });
  }

  // -- API integration ------------------------------------------------------

  private shouldFetchLocation(): boolean {
    if (!this.state.location.lastFetched) return true;
    return Date.now() - this.state.location.lastFetched >= IP_RATE_LIMIT;
  }

  private shouldFetchWeather(): boolean {
    if (!this.state.weather.lastFetched) return true;
    if (this.state.weather.units !== this.resolvedUnits) return true;
    if (!this.isSameDate(new Date(this.state.weather.lastFetched), new Date())) return true;
    return Date.now() - this.state.weather.lastFetched >= WEATHER_RATE_LIMIT;
  }

  private async fetchLocation(): Promise<void> {
    if (!this.shouldFetchLocation() && this.state.location.lat != null) return;
    const key = this.getAttribute("ipregistry-key");
    if (!key) return;

    try {
      const res = await fetch(`https://api.ipregistry.co/?key=${key}`);
      if (!res.ok) return;
      const data = await res.json();
      this.state.location.lat = data.location.latitude;
      this.state.location.lng = data.location.longitude;
      this.state.location.country = data.location.country?.code ?? null;
      this.state.location.lastFetched = Date.now();
      this.saveState();
    } catch {
      /* silently degrade */
    }
  }

  private async fetchWeather(): Promise<void> {
    const owKey = this.getAttribute("openweather-key");
    const ipKey = this.getAttribute("ipregistry-key");
    if (!owKey || !ipKey) return;

    if (!this.shouldFetchWeather()) {
      this.isDataFetched = true;
      this.renderWeatherEffects();
      this.updateWeatherText();
      this.updateGradient();
      return;
    }

    await this.fetchLocation();
    const { lat, lng } = this.state.location;
    if (lat == null || lng == null) return;

    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?units=${this.resolvedUnits}&lat=${lat}&lon=${lng}&appid=${owKey}`,
      );
      if (!res.ok) return;
      const data = await res.json();

      this.state.weather.current = { ...data.weather[0], temp: data.main.temp };
      this.state.weather.sunrise = data.sys.sunrise * 1000;
      this.state.weather.sunset = data.sys.sunset * 1000;
      this.state.weather.units = this.resolvedUnits;
      this.state.weather.lastFetched = Date.now();
      this.saveState();
      this.isDataFetched = true;

      this.renderWeatherEffects();
      this.updateWeatherText();
      this.updateGradient();
    } catch {
      /* silently degrade */
    }
  }
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

customElements.define("live-window", LiveWindowElement);
