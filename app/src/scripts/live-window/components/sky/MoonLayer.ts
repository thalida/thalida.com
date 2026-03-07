import type { SceneComponent, LiveWindowState, RGB } from "../../types";
import { getSunAngle, getMoonPhase, getMoonAngle, getArcPosition } from "../../utils/celestial";
import { lerpColor } from "../../utils/color";
import { FALLBACK_NIGHT_SKY_RGB, MOON_GLOW_COLOR_RGB, MOON_GLOW_BLUR_PX } from "../../utils/constants";
import { getSunTimesWithDefaults } from "../../utils/sky-gradient";

/** Moon diameter in px — set on .moon via --moon-diameter CSS custom property. */
const MOON_DIAMETER = 22;
const MOON_GLOW_OPACITY = 0.3;
const MOON_GLOW_SPREAD_MIN = 5;
const MOON_GLOW_SPREAD_RANGE = 5;

// Sky gradient sampling positions for moon shadow color
const GRADIENT_STOP_UPPER = 0.35;
const GRADIENT_STOP_LOWER = 0.65;

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
    const { sunrise: sr, sunset: ss } = getSunTimesWithDefaults(sunrise, sunset);

    const sunAngle = getSunAngle(now, sr, ss);
    const realMoonPhase = getMoonPhase(now);
    const moonAngle = getMoonAngle(sunAngle, realMoonPhase);
    const moonPhase = state.attrs.overrideMoonPhase ?? realMoonPhase;
    const pos = getArcPosition(moonAngle);
    const sunPos = getArcPosition(sunAngle);

    if (!this.moon) {
      this.moon = document.createElement("div");
      this.moon.className = "moon";
      this.moon.style.setProperty("--moon-diameter", `${MOON_DIAMETER}px`);
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
      const skyColor = g ? this.sampleSkyAt(g, pos.y / 100) : FALLBACK_NIGHT_SKY_RGB;

      // Shadow displacement: maps phase 0–1 to a sliding shadow across the moon disc.
      // phase 0 (new moon): dx = 0, shadow covers the full moon
      // phase 0.25 (first quarter): dx = -MOON_DIAMETER/2, half lit from right
      // phase 0.5 (full moon): dx = -MOON_DIAMETER, shadow fully off-screen
      // phase 0.75 (last quarter): dx = MOON_DIAMETER/2, half lit from left
      let dx: number;

      if (moonPhase <= 0.5) {
        dx = -(moonPhase * 2) * MOON_DIAMETER;
      } else {
        dx = (1 - moonPhase) * 2 * MOON_DIAMETER;
      }

      this.shadow.style.background = skyColor;
      this.shadow.style.transform = `translateX(${dx.toFixed(1)}px)`;
    }

    // Scale glow with how much of the moon is lit
    if (this.moon) {
      // Lit fraction: 0 at new moon (phase 0), 1 at full moon (0.5), 0 at next new (1)
      const litAmount = moonPhase <= 0.5 ? moonPhase * 2 : (1 - moonPhase) * 2;
      const glowOpacity = (MOON_GLOW_OPACITY * litAmount).toFixed(2);
      const glowSpread = Math.round(MOON_GLOW_SPREAD_MIN + MOON_GLOW_SPREAD_RANGE * litAmount);
      this.moon.style.boxShadow = `0 0 ${MOON_GLOW_BLUR_PX}px ${glowSpread}px rgba(${MOON_GLOW_COLOR_RGB}, ${glowOpacity})`;
    }
  }

  /** Sample the sky gradient at a given vertical position (0=top, 1=bottom). */
  private sampleSkyAt(g: { zenith: RGB; upper: RGB; lower: RGB; horizon: RGB }, yNorm: number): string {
    // The gradient has 4 stops at roughly 0%, 35%, 65%, 100%
    let c: RGB;
    if (yNorm <= GRADIENT_STOP_UPPER) {
      c = lerpColor(g.zenith, g.upper, yNorm / GRADIENT_STOP_UPPER);
    } else if (yNorm <= GRADIENT_STOP_LOWER) {
      c = lerpColor(g.upper, g.lower, (yNorm - GRADIENT_STOP_UPPER) / (GRADIENT_STOP_LOWER - GRADIENT_STOP_UPPER));
    } else {
      c = lerpColor(g.lower, g.horizon, (yNorm - GRADIENT_STOP_LOWER) / (1 - GRADIENT_STOP_LOWER));
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
