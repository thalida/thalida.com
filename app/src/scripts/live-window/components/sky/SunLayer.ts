import type { SceneComponent, LiveWindowState } from "../../types";
import { getSunAngle, getArcPosition } from "../../utils/celestial";

export class SunLayer implements SceneComponent {
  private el: HTMLElement | null = null;
  private sun: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer sun-layer";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;

    const { sunrise, sunset, now } = state.computed.phase;
    const sr = sunrise ?? new Date(now).setHours(6, 0, 0, 0);
    const ss = sunset ?? new Date(now).setHours(18, 0, 0, 0);

    const angle = getSunAngle(now, sr, ss);
    const pos = getArcPosition(angle);

    if (!this.sun) {
      this.sun = document.createElement("div");
      this.sun.className = "sun";
      this.el.appendChild(this.sun);
    }

    if (pos.visible) {
      this.sun.style.left = `${pos.x}%`;
      this.sun.style.top = `${pos.y}%`;
    }
    this.el.style.opacity = pos.visible ? "1" : "0";
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.sun = null;
  }
}
