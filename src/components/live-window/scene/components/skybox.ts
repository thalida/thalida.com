import { merge } from "lodash";
import type { IColor, ISceneClockConfig, ISceneSkyboxConfig } from "../types";
import type LiveWindowScene from "..";


export default class SceneSkyBox {
  scene: LiveWindowScene;
  sunrise: number | null = null;
  sunset: number | null = null;
  interval: number | null = null;

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

  isRefreshing: boolean = false;

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


  updateConfig(config: Partial<ISceneClockConfig> | null) {
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

  refresh() {
    this.isRefreshing = true;
    this.clear();
    this.isRefreshing = false;
  }

  async onTick() {
    if (this.isRefreshing || !this.config.enabled) {
      return;
    }

    const now = this.scene.getNow();

    const sunriseDate = new Date(now);
    sunriseDate.setHours(6, 0, 0, 0); // Default sunrise time at 6 AM
    this.sunrise = sunriseDate.getTime();

    const sunsetDate = new Date(now);
    sunsetDate.setHours(18, 0, 0, 0); // Default sunset time at 6 PM
    this.sunset = sunsetDate.getTime();

    const gradient = await this.getRealisticColorGradient(now);

    if (this.config.enableScene) {
      if (this.getIsDark(gradient.start)) {
        this.scene.matterElement.style.filter = `invert(0)`;
      } else {
        this.scene.matterElement.style.filter = `invert(1)`;
      }

      const skyboxGradient = `linear-gradient(to bottom, rgba(${gradient.start.r}, ${gradient.start.g}, ${gradient.start.b}, 1), rgba(${gradient.end.r}, ${gradient.end.g}, ${gradient.end.b}, 1))`;
      this.scene.element.style.background = skyboxGradient;
    }

    if (this.config.enableHTML) {
      const color = await this.getRealisticColor(now);
      const colorString = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
      document.documentElement.style.backgroundColor = colorString;
    }

    if (this.config.enableBody) {
      const bodyGradient = `linear-gradient(to bottom, rgba(${gradient.start.r}, ${gradient.start.g}, ${gradient.start.b}, 0.5), rgba(${gradient.end.r}, ${gradient.end.g}, ${gradient.end.b}, 0.5))`;
      document.body.style.background = bodyGradient;
    }
  }

  getColorBlend(startColor: IColor, endColor: IColor, distance: number) {
    const blendedColor: IColor = { r: 0, g: 0, b: 0 };
    for (const part of ["r", "g", "b"] as const) {
      const start = startColor[part];
      const end = endColor[part];
      blendedColor[part] = Math.round(start + (end - start) * distance);
    }
    return blendedColor;
  }

  isSameDate(a: Date, b: Date) {
    return a.getDate() === b.getDate();
  }

  async getRealisticColorGradient(date: Date) {
    const now = date.getTime();

    const shiftBy = 1 * 60 * 60 * 1000; // 1 hour
    let hourAgoIsh = new Date(now - shiftBy);
    if (!this.isSameDate(hourAgoIsh, date)) {
      hourAgoIsh = new Date(now);
      hourAgoIsh.setHours(0, 0, 0, 0);
      // await fetchWeather($store);
    }
    const gradientStart = this.getRealisticColor(hourAgoIsh);
    const gradientEnd = this.getRealisticColor(date);

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

  getRealisticColor(date: Date) {
    const now = date.getTime();
    const sunriseTime = this.sunrise;
    const sunsetTime = this.sunset;

    if (!sunriseTime || !sunsetTime) {
      console.warn("Sunrise or sunset time is not set.");
      return { r: 255, g: 255, b: 255 }; // Default to white if times are not set
    }

    let colorPhase, phaseStartTime, phaseEndTime;
    if (now < sunriseTime) {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      colorPhase = this.TIME_COLORS.slice(0, this.SUNRISE_COLOR_IDX + 1);
      phaseStartTime = midnight.getTime();
      phaseEndTime = sunriseTime;
    } else if (now >= sunsetTime) {
      const EOD = new Date(now);
      EOD.setHours(23, 59, 59, 999);
      colorPhase = this.TIME_COLORS.slice(this.SUNSET_COLOR_IDX);
      colorPhase.push(this.TIME_COLORS[0]);
      phaseStartTime = sunsetTime;
      phaseEndTime = EOD.getTime();

      const ifValidStart = this.isSameDate(new Date(phaseStartTime), EOD);
      if (!ifValidStart) {
        phaseStartTime += 24 * 60 * 60 * 1000;
      }
    } else {
      colorPhase = this.TIME_COLORS.slice(
        this.SUNRISE_COLOR_IDX,
        this.SUNSET_COLOR_IDX + 1
      );
      phaseStartTime = sunriseTime;
      phaseEndTime = sunsetTime;
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

    const color = this.getColorBlend(startColor, endColor, distanceInSegment);
    return color;
  }

  getContrastColor(color: IColor): "white" | "black" {
    const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    return brightness > 125 ? "black" : "white";
  }

  getIsDark({ r, g, b }: IColor): boolean {
    return r * 0.299 + g * 0.587 + b * 0.114 <= 186;
  }
}
