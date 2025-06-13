import { merge } from "lodash";
import type { IColor, ISceneSkyboxConfig } from "../types";
import type LiveWindowScene from "../scene";
import store from "../store";


export default class SceneSkyBox {
  scene: LiveWindowScene;
  sunrise: number | null = null;
  sunset: number | null = null;

  HOURS_IN_DAY = 24;
  MINUTES_IN_HOUR = 60;
  TIME_COLORS = [
    { r: 4, g: 10, b: 30 },
    { r: 139, g: 152, b: 206 },
    { r: 86, g: 216, b: 255 },
    { r: 255, g: 216, b: 116 },
    { r: 255, g: 183, b: 116 },
    { r: 255, g: 153, b: 116 },
    { r: 255, g: 103, b: 116 },
    { r: 20, g: 40, b: 116 },
  ];
  SUNRISE_COLOR_IDX = 2;
  SUNSET_COLOR_IDX = 6;

  isRendering: boolean = false;

  defaultConfig: ISceneSkyboxConfig = {
    enabled: true,
    enableScene: true,
    enableBody: true,
    enableHTML: true,
  };
  config: ISceneSkyboxConfig;

  constructor(scene: LiveWindowScene, config: Partial<ISceneSkyboxConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
  }

  render(isInitialRender: boolean = false) {
    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    this.isRendering = false;
  }

  async onTick(now: Date, useLiveData: boolean = true) {
    if (this.isRendering || !this.config.enabled) {
      return;
    }

    const defaultSunriseDate = new Date(now);
    defaultSunriseDate.setHours(6, 0, 0, 0); // Default sunrise time at 6 AM

    const defaultSunsetDate = new Date(now);
    defaultSunsetDate.setHours(18, 0, 0, 0); // Default sunset time at 6 PM

    this.sunrise = useLiveData && store.store.weather.sunrise ? store.store.weather.sunrise : defaultSunriseDate.getTime();
    this.sunset = useLiveData && store.store.weather.sunset ? store.store.weather.sunset : defaultSunsetDate.getTime();

    const gradient = await this._getRealisticColorGradient(now);

    if (this.config.enableScene) {
      if (this._getIsDark(gradient.start)) {
        this.scene.matterElement.style.filter = `invert(0)`;
      } else {
        this.scene.matterElement.style.filter = `invert(1)`;
      }

      const skyboxGradient = `linear-gradient(to bottom, rgba(${gradient.start.r}, ${gradient.start.g}, ${gradient.start.b}, 1), rgba(${gradient.end.r}, ${gradient.end.g}, ${gradient.end.b}, 1))`;
      this.scene.element.style.background = skyboxGradient;
    }

    if (this.config.enableHTML) {
      const color = await this._getRealisticColor(now);
      const colorString = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
      document.documentElement.style.backgroundColor = colorString;
    }

    if (this.config.enableBody) {
      const bodyGradient = `linear-gradient(to bottom, rgba(${gradient.start.r}, ${gradient.start.g}, ${gradient.start.b}, 0.5), rgba(${gradient.end.r}, ${gradient.end.g}, ${gradient.end.b}, 0.5))`;
      document.body.style.background = bodyGradient;
    }
  }

  updateConfig(config: Partial<ISceneSkyboxConfig> | null): ISceneSkyboxConfig {
    this.config = merge({}, this.defaultConfig, config || {});
    return this.config;
  }

  clear() {
    this.sunrise = null;
    this.sunset = null;
    this.scene.element.style.background = "";
    this.scene.matterElement.style.filter = "";
    document.body.style.background = "";
    document.documentElement.style.backgroundColor = "";
  }

  destroy() {
    this.clear();
  }

  _getColorBlend(startColor: IColor, endColor: IColor, distance: number) {
    const blendedColor: IColor = { r: 0, g: 0, b: 0 };
    for (const part of ["r", "g", "b"] as const) {
      const start = startColor[part];
      const end = endColor[part];
      blendedColor[part] = Math.round(start + (end - start) * distance);
    }
    return blendedColor;
  }

  _isSameDate(a: Date, b: Date) {
    return a.getDate() === b.getDate();
  }

  async _getRealisticColorGradient(date: Date) {
    const now = date.getTime();

    const shiftBy = 1 * 60 * 60 * 1000; // 1 hour
    let hourAgoIsh = new Date(now - shiftBy);
    if (!this._isSameDate(hourAgoIsh, date)) {
      hourAgoIsh = new Date(now);
      hourAgoIsh.setHours(0, 0, 0, 0);
    }

    const gradientStart = this._getRealisticColor(hourAgoIsh);
    const gradientEnd = this._getRealisticColor(date);

    let gradient;

    if (this.sunset && now >= this.sunset) {
      gradient = {
        start: gradientEnd,
        end: gradientStart,
      };
    } else {
      gradient = {
        start: gradientStart,
        end: gradientEnd,
      };
    }

    return gradient;
  }

  _getRealisticColor(date: Date) {
    const now = date.getTime();

    if (!this.sunrise || !this.sunset) {
      console.warn("Sunrise or sunset time is not set.");
      return { r: 255, g: 255, b: 255 }; // Default to white if times are not set
    }

    let colorPhase, phaseStartTime, phaseEndTime;
    if (now < this.sunrise) {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      colorPhase = this.TIME_COLORS.slice(0, this.SUNRISE_COLOR_IDX + 1);
      phaseStartTime = midnight.getTime();
      phaseEndTime = this.sunrise;
    } else if (now >= this.sunset) {
      const EOD = new Date(now);
      EOD.setHours(23, 59, 59, 999);
      colorPhase = this.TIME_COLORS.slice(this.SUNSET_COLOR_IDX);
      colorPhase.push(this.TIME_COLORS[0]);
      phaseStartTime = this.sunset;
      phaseEndTime = EOD.getTime();

      const ifValidStart = this._isSameDate(new Date(phaseStartTime), EOD);
      if (!ifValidStart) {
        phaseStartTime += 24 * 60 * 60 * 1000;
      }
    } else {
      colorPhase = this.TIME_COLORS.slice(
        this.SUNRISE_COLOR_IDX,
        this.SUNSET_COLOR_IDX + 1
      );
      phaseStartTime = this.sunrise;
      phaseEndTime = this.sunset;
    }

    const timeSinceStart = now - phaseStartTime;
    const timeInPhase = phaseEndTime - phaseStartTime;
    const distance = timeSinceStart / timeInPhase;
    const phaseSegments = timeInPhase / (colorPhase.length - 1);
    const startColorIdx = Math.floor((colorPhase.length - 1) * distance);
    const endColorIdx = startColorIdx + 1;
    const startColorTime = phaseStartTime + startColorIdx * phaseSegments;
    const endColorTime = phaseStartTime + endColorIdx * phaseSegments;
    const timeInSegment = endColorTime - startColorTime;
    const timeSinceSegmentStart = now - startColorTime;
    const distanceInSegment = timeSinceSegmentStart / timeInSegment;
    const startColor = colorPhase[startColorIdx];
    const endColor = colorPhase[endColorIdx];

    const color = this._getColorBlend(startColor, endColor, distanceInSegment);
    return color;
  }

  _getContrastColor(color: IColor): "white" | "black" {
    const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    return brightness > 125 ? "black" : "white";
  }

  _getIsDark({ r, g, b }: IColor): boolean {
    return r * 0.299 + g * 0.587 + b * 0.114 <= 186;
  }
}
