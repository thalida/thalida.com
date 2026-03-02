import type { SceneComponent, LiveWindowState } from "../../types";
import { getCurrentSkyGradient } from "../../utils/sky-gradient";

export class GradientLayer implements SceneComponent {
  private el: HTMLElement | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer";
  }

  update(state: LiveWindowState): void {
    const { phase } = state.computed;
    const gradient = getCurrentSkyGradient(phase.now, phase.sunrise, phase.sunset);
    state.ref.currentGradient = gradient;

    if (!this.el) return;
    const { zenith, upper, lower, horizon } = gradient;
    this.el.style.background = `linear-gradient(180deg, rgb(${zenith.r},${zenith.g},${zenith.b}), rgb(${upper.r},${upper.g},${upper.b}), rgb(${lower.r},${lower.g},${lower.b}), rgb(${horizon.r},${horizon.g},${horizon.b}))`;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
  }
}
