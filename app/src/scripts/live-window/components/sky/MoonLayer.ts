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

    // Render lunar phase using rotateY for a natural elliptical terminator.
    // The shadow disc rotates in 3D; backface-visibility:hidden hides it
    // once it passes 90°. The shadow color swaps at the quarter boundaries
    // to correctly render all four phase quadrants.
    if (this.shadow) {
      const skyColor = "var(--window-sky-color-default)";
      const litColor = "#e8e8d0";
      let rotation: number;
      let color: string;

      if (moonPhase <= 0.25) {
        // New → First Quarter: dark disc rotates away, revealing right side
        color = skyColor;
        rotation = (moonPhase / 0.25) * 180;
      } else if (moonPhase <= 0.5) {
        // First Quarter → Full: lit disc rotates in, covering left dark side
        color = litColor;
        rotation = ((moonPhase - 0.25) / 0.25) * 180;
      } else if (moonPhase <= 0.75) {
        // Full → Last Quarter: dark disc rotates in from right
        color = skyColor;
        rotation = 180 - ((moonPhase - 0.5) / 0.25) * 180;
      } else {
        // Last Quarter → New: lit disc rotates away, revealing right dark side
        color = litColor;
        rotation = 180 - ((moonPhase - 0.75) / 0.25) * 180;
      }

      this.shadow.style.background = color;
      this.shadow.style.transform = `rotateY(${rotation.toFixed(1)}deg)`;
    }
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.moon = null;
    this.shadow = null;
  }
}
