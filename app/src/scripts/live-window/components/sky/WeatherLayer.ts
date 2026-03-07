import type { SceneComponent, LiveWindowState } from "../../types";
import type { CloudDensity, WindLevel } from "./weather/weather-types";
import { WEATHER_EFFECTS, CLOUD_CONFIGS, PRECIP_CONFIG } from "./weather/weather-configs";
import { getCloudColor, getAtmosphereColor, getSkyDarkenOpacity } from "./weather/weather-colors";
import { cloudHTML, particleHTML, atmosphereParticleHTML, lightningHTML } from "./weather/weather-html";

/** Fraction of clouds rendered behind precipitation/lightning (rest go in front). */
const BACK_CLOUD_RATIO = 0.4;

/** Wind skew angle in degrees per wind level. */
const WIND_SKEW_DEG: Record<WindLevel, number> = {
  strong: 15,
  moderate: 8,
  light: 3,
  none: 0,
};

/** CSS size classes for atmosphere layers, applied in order. */
const ATMOSPHERE_SIZES = ["lg", "md", "sm"] as const;

export class WeatherLayer implements SceneComponent {
  private el: HTMLElement | null = null;
  private lastWeatherId: number | null = null;
  private lastCloudColor: string | null = null;
  private lastAtmoColor: string | null = null;
  private lastAtmoParticleColor: string | null = null;

  static cloudHTML = cloudHTML;
  static particleHTML = particleHTML;
  static atmosphereParticleHTML = atmosphereParticleHTML;
  static lightningHTML = lightningHTML;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer weather";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;
    const weatherId = state.computed.phase.weather.id;

    if (!weatherId || !WEATHER_EFFECTS[weatherId]) {
      if (this.lastWeatherId !== null) {
        this.el.className = "sky-layer weather";
        this.el.innerHTML = "";
        this.lastWeatherId = null;
        this.lastCloudColor = null;
        this.lastAtmoColor = null;
        this.lastAtmoParticleColor = null;
      }
      return;
    }

    const config = WEATHER_EFFECTS[weatherId];
    const sunAlt = state.computed.phase.sun.altitude;
    const gradient = state.ref.currentGradient;

    // Smooth cloud color based on sun altitude, density, and sky gradient
    let cloudColor: string | null = null;
    if (config.clouds !== "none") {
      cloudColor = getCloudColor(config.clouds, sunAlt, gradient);
    }

    // Atmosphere colors based on sun altitude
    let atmoColor: string | null = null;
    if (config.atmosphere) {
      atmoColor = getAtmosphereColor(config.atmosphere.color, sunAlt, gradient);
    }
    let atmoParticleColor: string | null = null;
    if (config.atmosphereParticles) {
      atmoParticleColor = getAtmosphereColor(config.atmosphereParticles.color, sunAlt, gradient);
    }

    // Skip full rebuild if weather hasn't changed — only update colors
    if (weatherId === this.lastWeatherId) {
      if (cloudColor !== null && cloudColor !== this.lastCloudColor) {
        this.el.style.setProperty("--cloud-color", cloudColor);
        this.lastCloudColor = cloudColor;
      }
      if (atmoColor !== null && atmoColor !== this.lastAtmoColor) {
        this.el.style.setProperty("--atmo-color", atmoColor);
        this.lastAtmoColor = atmoColor;
      }
      if (atmoParticleColor !== null && atmoParticleColor !== this.lastAtmoParticleColor) {
        this.el.style.setProperty("--atmo-particle-color", atmoParticleColor);
        this.lastAtmoParticleColor = atmoParticleColor;
      }
      return;
    }

    // Full rebuild — weather ID changed
    this.lastWeatherId = weatherId;
    this.lastCloudColor = cloudColor;
    this.lastAtmoColor = atmoColor;
    this.lastAtmoParticleColor = atmoParticleColor;

    let cls = "sky-layer weather";
    if (config.clouds !== "none") cls += ` weather-clouds-${config.clouds}`;
    this.el.className = cls;

    if (cloudColor !== null) {
      this.el.style.setProperty("--cloud-color", cloudColor);
    }
    if (atmoColor !== null) {
      this.el.style.setProperty("--atmo-color", atmoColor);
    }
    if (atmoParticleColor !== null) {
      this.el.style.setProperty("--atmo-particle-color", atmoParticleColor);
    }

    let html = "";

    // Sky darkening overlay
    const darken = getSkyDarkenOpacity(config);
    if (darken > 0) {
      html += `<div class="sky-darken" style="opacity:${darken.toFixed(2)}"></div>`;
    }

    // Back clouds (behind lightning + precipitation)
    if (config.clouds !== "none") {
      const total = CLOUD_CONFIGS[config.clouds as Exclude<CloudDensity, "none">].count;
      const backCount = Math.ceil(total * BACK_CLOUD_RATIO);
      html += cloudHTML(config.clouds as Exclude<CloudDensity, "none">, 0, backCount);
    }

    // Lightning (between cloud layers)
    if (config.lightning) {
      html += lightningHTML(config.lightning);
    }

    // Precipitation layers (between cloud layers)
    const skewDeg = WIND_SKEW_DEG[config.wind];

    for (const precipLayer of config.precip) {
      const precipConfig = PRECIP_CONFIG[precipLayer.type];
      if (!precipConfig) continue;
      const count = Math.round(precipConfig.count * precipLayer.intensityScale);
      const particles = particleHTML(precipConfig, count);
      const skewStyle = skewDeg ? `transform:skewX(${skewDeg}deg);` : "";
      html += `<div class="droplets" style="animation-duration:${precipConfig.fallSpeed};animation-name:precipitate;${skewStyle}">`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += "</div>";
    }

    // Front clouds (in front of lightning + precipitation)
    if (config.clouds !== "none") {
      const total = CLOUD_CONFIGS[config.clouds as Exclude<CloudDensity, "none">].count;
      const backCount = Math.ceil(total * BACK_CLOUD_RATIO);
      html += cloudHTML(config.clouds as Exclude<CloudDensity, "none">, backCount);
    }

    // Atmosphere
    if (config.atmosphere) {
      const { opacity, layers } = config.atmosphere;
      const sizes = ATMOSPHERE_SIZES;
      for (let i = 0; i < layers; i++) {
        const size = sizes[i] ?? "sm";
        html += `<div class="atmosphere-layer atmosphere-${size}" style="--atmo-opacity:${opacity};opacity:${opacity}"></div>`;
      }
    }

    // Atmosphere particles
    if (config.atmosphereParticles) {
      html += atmosphereParticleHTML(config.atmosphereParticles);
    }

    this.el.innerHTML = html;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.lastWeatherId = null;
    this.lastCloudColor = null;
    this.lastAtmoColor = null;
    this.lastAtmoParticleColor = null;
  }
}
