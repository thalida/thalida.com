import type { SceneComponent, LiveWindowState } from "../types";
import { GradientLayer } from "./sky/GradientLayer";
import { WeatherLayer } from "./sky/WeatherLayer";

export class SkyComponent implements SceneComponent {
  private children: SceneComponent[] = [new GradientLayer(), new WeatherLayer()];

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
