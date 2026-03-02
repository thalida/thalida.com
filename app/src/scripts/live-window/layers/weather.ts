import type { SkyLayer, PhaseInfo } from "../types";

export const ICON_WEATHER_MAP: Record<string, string[]> = {
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

export class WeatherLayer implements SkyLayer {
  private el: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer weather";
  }

  update(phase: PhaseInfo): void {
    if (!this.el) return;
    const icon = phase.weather.icon;
    this.el.className = "sky-layer weather" + (icon ? ` weather-${icon}` : "");

    if (!icon) {
      this.el.innerHTML = "";
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
      for (let h = 0; h < 2; h++) {
        html += '<div class="droplets-half">';
        for (let i = 0; i < 6; i++) {
          html += `<div class="droplet-row droplet-row-${i + 1}">`;
          for (let j = 0; j < 6; j++) {
            html += `<div class="droplet droplet-${j + 1}"></div>`;
          }
          html += "</div>";
        }
        html += "</div>";
      }
      html += "</div>";
    }
    if (has("snow")) {
      html += '<div class="snow-sill">';
      for (let i = 1; i <= 6; i++) {
        html += `<div class="snow-mound snow-mound-${i}"></div>`;
      }
      html += "</div>";
    }
    this.el.innerHTML = html;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
  }
}
