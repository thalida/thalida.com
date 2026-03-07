import type { SceneComponent, LiveWindowState, RGB } from "../../types";
import { getSunAngle, getMoonPhase, getMoonAngle, getArcPosition } from "../../utils/celestial";
import { getDefaultSunTimes } from "../../utils/sky-gradient";

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

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
    const defaults = getDefaultSunTimes();
    const sr = sunrise ?? defaults.sunrise;
    const ss = sunset ?? defaults.sunset;

    const sunAngle = getSunAngle(now, sr, ss);
    const realMoonPhase = getMoonPhase(now);
    const moonAngle = getMoonAngle(sunAngle, realMoonPhase);
    const moonPhase = state.attrs.overrideMoonPhase ?? realMoonPhase;
    const pos = getArcPosition(moonAngle);
    const sunPos = getArcPosition(sunAngle);

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
    // Hide moon when sun is above the horizon to avoid both being visible
    const showMoon = pos.visible && !sunPos.visible && state.ref.celestialReady;
    this.el.style.opacity = showMoon ? "1" : "0";

    // Render lunar phase by sliding a dark circle across the lit moon.
    // Waxing (0→0.5): shadow slides left, revealing lit right side first.
    // Waning (0.5→1): shadow slides in from right, covering right side.
    if (this.shadow) {
      // Interpolate sky color at the moon's Y position for a seamless blend
      const g = state.ref.currentGradient;
      const skyColor = g ? this.sampleSkyAt(g, pos.y / 100) : "rgb(14,26,58)";

      const moonDia = 22; // must match CSS .moon width/height
      let dx: number;

      if (moonPhase <= 0.5) {
        dx = -(moonPhase * 2) * moonDia;
      } else {
        dx = (1 - moonPhase) * 2 * moonDia;
      }

      this.shadow.style.background = skyColor;
      this.shadow.style.transform = `translateX(${dx.toFixed(1)}px)`;
    }

    // Scale glow with how much of the moon is lit
    // litAmount: 0 at new moon (phase 0), 1 at full moon (phase 0.5), 0 at next new moon (phase 1)
    if (this.moon) {
      const litAmount = moonPhase <= 0.5 ? moonPhase * 2 : (1 - moonPhase) * 2;
      const glowOpacity = (0.3 * litAmount).toFixed(2);
      const glowSpread = Math.round(5 + 5 * litAmount);
      this.moon.style.boxShadow = `0 0 10px ${glowSpread}px rgba(232, 232, 208, ${glowOpacity})`;
    }
  }

  /** Sample the sky gradient at a given vertical position (0=top, 1=bottom). */
  private sampleSkyAt(g: { zenith: RGB; upper: RGB; lower: RGB; horizon: RGB }, yNorm: number): string {
    // The gradient has 4 stops at roughly 0%, 35%, 65%, 100%
    let c: RGB;
    if (yNorm <= 0.35) {
      c = lerpColor(g.zenith, g.upper, yNorm / 0.35);
    } else if (yNorm <= 0.65) {
      c = lerpColor(g.upper, g.lower, (yNorm - 0.35) / 0.3);
    } else {
      c = lerpColor(g.lower, g.horizon, (yNorm - 0.65) / 0.35);
    }
    return `rgb(${c.r},${c.g},${c.b})`;
  }

  destroy(): void {
    if (this.el) this.el.innerHTML = "";
    this.el = null;
    this.moon = null;
    this.shadow = null;
  }
}
