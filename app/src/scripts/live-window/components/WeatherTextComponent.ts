import type { SceneComponent, LiveWindowState } from "../types";
import { getReadableColor } from "../utils/color";

export class WeatherTextComponent implements SceneComponent {
  private el: HTMLParagraphElement | null = null;
  private containerEl: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.containerEl = container;
    const p = document.createElement("p");
    p.className = "current-weather-text";
    p.hidden = true;
    container.appendChild(p);
    this.el = p;
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;

    const current = state.store.weather.current;
    if (current) {
      const units = state.attrs.resolvedUnits;
      const symbol = units === "imperial" ? "\u00B0F" : "\u00B0C";
      this.el.textContent = `It\u2019s ${Math.round(current.temp)}${symbol} with ${current.description}`;
      this.el.hidden = state.attrs.hideWeatherText;
    } else {
      this.el.hidden = true;
    }

    // Update text color for contrast against background
    const gradient = state.ref.currentGradient;
    if (gradient && this.containerEl) {
      const tc = getReadableColor(gradient.horizon, state.attrs.bgColor);
      this.containerEl.style.setProperty("--weather-text-color", `rgb(${tc.r},${tc.g},${tc.b})`);
    }
  }

  destroy(): void {
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.el = null;
  }
}
