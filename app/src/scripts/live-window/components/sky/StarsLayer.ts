import type { SceneComponent, LiveWindowState } from "../../types";
import { generateStars, getStarsOpacity, todaySeed } from "../../utils/stars";

export class StarsLayer implements SceneComponent {
  private el: HTMLElement | null = null;
  private renderedSeed: number | null = null;

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.className = "sky-layer stars";
  }

  update(state: LiveWindowState): void {
    if (!this.el) return;

    const seed = todaySeed();

    // Only regenerate star DOM if the seed changed (new day)
    if (this.renderedSeed !== seed) {
      const stars = generateStars(seed);
      let html = "";
      for (const star of stars) {
        const glow =
          star.glowSize > 0
            ? `box-shadow: 0 0 ${star.glowSize}px ${star.glowSize / 2}px rgba(255, 255, 255, ${star.baseOpacity * 0.5});`
            : "";
        html += `<div class="star" style="left:${star.x}%;top:${star.y}%;width:${star.size}px;height:${star.size}px;opacity:${star.baseOpacity};animation-duration:${star.twinkleDuration.toFixed(2)}s;animation-delay:${star.twinkleDelay.toFixed(2)}s;${glow}"></div>`;
      }
      this.el.innerHTML = html;
      this.renderedSeed = seed;
    }

    // Update container opacity based on sky phase
    const { phaseIndex, t } = state.computed.phase;
    const opacity = getStarsOpacity(phaseIndex, t);
    this.el.style.opacity = String(opacity);
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.renderedSeed = null;
  }
}
