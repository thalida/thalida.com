import type { SceneComponent, LiveWindowState } from "../../types";
import { getSunAngle, getMoonPhase, getMoonAngle, getArcPosition } from "../../utils/celestial";

export class MoonLayer implements SceneComponent {
  private el: HTMLElement | null = null;
  private moon: HTMLElement | null = null;
  private shadow: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer moon-layer";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;

    const { sunrise, sunset, now } = state.computed.phase;
    const sr = sunrise ?? new Date(now).setHours(6, 0, 0, 0);
    const ss = sunset ?? new Date(now).setHours(18, 0, 0, 0);

    const sunAngle = getSunAngle(now, sr, ss);
    const moonPhase = getMoonPhase(now);
    const moonAngle = getMoonAngle(sunAngle, moonPhase);
    const pos = getArcPosition(moonAngle);

    if (!this.moon) {
      this.moon = document.createElement("div");
      this.moon.className = "moon";
      this.shadow = document.createElement("div");
      this.shadow.className = "moon-shadow";
      this.moon.appendChild(this.shadow);
      this.el.appendChild(this.moon);
    }

    if (pos.visible) {
      this.moon.style.left = `${pos.x}%`;
      this.moon.style.top = `${pos.y}%`;
    }
    this.el.style.opacity = pos.visible ? "1" : "0";

    // Render lunar phase via shadow overlay scaleX.
    // moonPhase 0 = new (fully shadowed), 0.5 = full (no shadow).
    // scaleX: 1 at new moon, 0 at first quarter, -1 at full,
    //         0 at last quarter, back to 1.
    if (this.shadow) {
      const scaleX = Math.cos(moonPhase * 2 * Math.PI);
      this.shadow.style.transform = `scaleX(${scaleX.toFixed(3)})`;
    }
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.moon = null;
    this.shadow = null;
  }
}
