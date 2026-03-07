import type { SceneComponent, LiveWindowState } from "../types";
import { GradientLayer } from "./sky/GradientLayer";
import { StarsLayer } from "./sky/StarsLayer";
import { SunLayer } from "./sky/SunLayer";
import { MoonLayer } from "./sky/MoonLayer";
import { WeatherLayer } from "./sky/WeatherLayer";

export class SkyComponent implements SceneComponent {
  // Order matters: GradientLayer must be first because it writes state.ref.currentGradient,
  // which MoonLayer and WeatherLayer read during the same update cycle.
  private children: SceneComponent[] = [
    new GradientLayer(),
    new StarsLayer(),
    new SunLayer(),
    new MoonLayer(),
    new WeatherLayer(),
  ];

  mount(container: HTMLElement): void {
    container.className = "sky";
    for (const child of this.children) {
      const div = document.createElement("div");
      container.appendChild(div);
      child.mount(div);
    }
  }

  update(state: LiveWindowState): void {
    for (const child of this.children) child.update(state);
  }

  destroy(): void {
    for (const child of this.children) child.destroy();
  }
}
