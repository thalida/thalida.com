import type { SceneComponent, LiveWindowState } from "../types";

export class InfoPanelComponent implements SceneComponent {
  private containerEl: HTMLElement | null = null;
  private locationEl: HTMLParagraphElement | null = null;
  private coordsEl: HTMLParagraphElement | null = null;
  private weatherEl: HTMLParagraphElement | null = null;

  mount(container: HTMLElement): void {
    this.containerEl = container;

    const wrapper = document.createElement("div");
    wrapper.className = "info-panel";

    const location = document.createElement("p");
    location.className = "info-panel-location";
    location.hidden = true;
    wrapper.appendChild(location);
    this.locationEl = location;

    const weather = document.createElement("p");
    weather.className = "info-panel-weather";
    weather.hidden = true;
    wrapper.appendChild(weather);
    this.weatherEl = weather;

    const coords = document.createElement("p");
    coords.className = "info-panel-coords";
    coords.hidden = true;
    wrapper.appendChild(coords);
    this.coordsEl = coords;

    container.appendChild(wrapper);
  }

  update(state: LiveWindowState): void {
    this.updateLocation(state);
    this.updateCoords(state);
    this.updateWeather(state);
  }

  private updateLocation(state: LiveWindowState): void {
    if (!this.locationEl) return;
    const name = state.attrs.label ?? state.store.location.name;
    if (name) {
      this.locationEl.textContent = name;
      this.locationEl.hidden = false;
    } else {
      this.locationEl.hidden = true;
    }
  }

  private updateCoords(state: LiveWindowState): void {
    if (!this.coordsEl) return;
    const { lat, lng } = state.store.location;
    if (lat != null && lng != null) {
      const parts = [`${lat.toFixed(2)}°, ${lng.toFixed(2)}°`];
      if (state.attrs.timezone) {
        parts.push(state.attrs.timezone);
      }
      this.coordsEl.textContent = parts.join(" · ");
      this.coordsEl.hidden = false;
    } else {
      this.coordsEl.hidden = true;
    }
  }

  private updateWeather(state: LiveWindowState): void {
    if (!this.weatherEl) return;
    const weather = state.computed.phase.weather;
    if (weather.description && !state.attrs.hideWeatherText) {
      const units = state.attrs.resolvedUnits;
      const symbol = units === "imperial" ? "°F" : "°C";
      const temp = weather.temp != null ? `${Math.round(weather.temp)}${symbol} · ` : "";
      this.weatherEl.textContent = `${temp}${weather.description}`;
      this.weatherEl.hidden = false;
    } else {
      this.weatherEl.hidden = true;
    }
  }

  destroy(): void {
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.locationEl = null;
    this.coordsEl = null;
    this.weatherEl = null;
  }
}
