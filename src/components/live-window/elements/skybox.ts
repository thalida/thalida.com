import { merge } from "lodash";
import type { IColor, ILiveWindowSceneConfig, ISceneSkyboxConfig, ISceneWeather } from "../types";
import type LiveWindowScene from "../scene";
import store from "../store";


export default class SceneSkyBox {
  scene: LiveWindowScene;
  sunrise: number | null = null;
  sunset: number | null = null;

  HOURS_IN_DAY = 24;
  MINUTES_IN_HOUR = 60;

  TIME_COLORS = [
    { r: 0, g: 6, b: 10 },
    { r: 0, g: 15, b: 26 },
    { r: 0, g: 30, b: 51 },
    { r: 0, g: 45, b: 77 },
    { r: 0, g: 104, b: 179 },
    { r: 51, g: 170, b: 255 },
    { r: 153, g: 229, b: 255 },
    { r: 128, g: 202, b: 255 },
    { r: 128, g: 149, b: 255 },
    { r: 255, g: 102, b: 255 },
    { r: 34, g: 0, b: 102 },
    { r: 0, g: 9, b: 51 },
    { r: 0, g: 13, b: 26 },
  ];
  SUNRISE_COLOR_IDX = 4;
  SUNSET_COLOR_IDX = 9;


  isRendering: boolean = false;

  defaultConfig: ISceneSkyboxConfig = {
    enabled: true,
    enableScene: true,
    enableGlobalTheme: true,
    sunsetDuration: 45 * 60 * 1000,
  };
  config: ISceneSkyboxConfig;

  constructor(scene: LiveWindowScene, config: Partial<ISceneSkyboxConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
  }

  get sunsetDurationPart() {
    return this.config.sunsetDuration / 2;
  }

  render(isInitialRender: boolean = false, now: Date, weather: ISceneWeather) {
    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    this.isRendering = false;
  }

  async onTick(now: Date, weather: ISceneWeather) {
    if (this.isRendering || !this.config.enabled) {
      return;
    }

    if (!this.config.enableScene) {
      return; // Skip if scene is not enabled
    }

    const defaultSunriseDate = new Date(now);
    defaultSunriseDate.setHours(6, 0, 0, 0); // Default sunrise time at 6 AM

    const defaultSunsetDate = new Date(now);
    defaultSunsetDate.setHours(18, 0, 0, 0); // Default sunset time at 6 PM

    const future = new Date(now.getTime() + (1 * 60 * 60 * 1000));
    const past = new Date(now.getTime() - (15 * 60 * 1000));

    const sunrise = weather.sunrise || defaultSunriseDate.getTime();
    const sunset = weather.sunset || defaultSunsetDate.getTime();

    const gradient = await this._getRealisticColorGradient(now, { sunrise, sunset });
    let futureGradient = await this._getRealisticColorGradient(future, { sunrise, sunset});
    let pastGradient = await this._getRealisticColorGradient(past,  { sunrise, sunset });

    if (now.getHours() >= 12) {
      const futureCopy = { ...futureGradient };
      futureGradient = { ...pastGradient };
      pastGradient = futureCopy;
    }

    this.scene.element.style.backgroundSize = "100% 100%";
    this.scene.element.style.backgroundPosition = "0px 0px, 0px 0px, 0px 0px, 0px 0px, 0px 0px";
    this.scene.element.style.backgroundRepeat = "no-repeat";
    this.scene.element.style.backgroundImage = `radial-gradient(49% 81% at 45% 47%, ${this._colorToString(gradient.start)} 0%, #FF000000 100%), radial-gradient(113% 91% at 17% -2%, ${this._colorToString(pastGradient.end)} 5%, #FF000000 95%), radial-gradient(142% 91% at 83% 7%, ${this._colorToString(pastGradient.start)} 5%, #FF000000 95%), radial-gradient(142% 91% at -6% 74%, ${this._colorToString(gradient.end)} 5%, #FF000000 95%), radial-gradient(142% 91% at 111% 84%,  ${this._colorToString(futureGradient.start)} 0%,  ${this._colorToString(futureGradient.end)} 100%)`;

    if (this.config.enableGlobalTheme) {
      const isNight = this._getIsNight(now, { sunrise, sunset });
      if (isNight) {
        document.documentElement.classList.add("dark-scene")
      } else {
        document.documentElement.classList.remove("dark-scene");
      }
    }
  }

  updateConfig(config: Partial<ISceneSkyboxConfig> | null): ISceneSkyboxConfig {
    this.config = merge({}, this.defaultConfig, config || {});
    return this.config;
  }

  clear() {
    if (this.config.enableScene) {
      this.scene.element.style.backgroundSize = "";
      this.scene.element.style.backgroundPosition = "";
      this.scene.element.style.backgroundRepeat = "";
      this.scene.element.style.backgroundImage = "";
    }
  }

  destroy() {
    this.clear();
  }

  _colorToString(color: IColor, alpha: number = 1): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
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

   _getRealisticColorGradient(date: Date, bounds: { sunrise: number; sunset: number }) {
    const now = date.getTime();

    const shiftBy = 30 * 60 * 1000;
    let past = new Date(now - shiftBy);

    const gradientStart = this._getRealisticColor(past, bounds);
    const gradientEnd = this._getRealisticColor(date, bounds);

    let gradient = {
      start: gradientStart,
      end: gradientEnd,
    };

    const isAfterNoon = date.getHours() >= 12;
    if (isAfterNoon) {
      gradient = {
        start: gradientEnd,
        end: gradientStart,
      };
    }

    return gradient;
  }

  _getRealisticColor(date: Date, bounds: { sunrise: number; sunset: number }) {
    const now = date.getTime();

    if (!this._isSameDate(new Date(bounds.sunrise), date) || !this._isSameDate(new Date(bounds.sunset), date)) {
      const sunriseExactTime = new Date(bounds.sunrise);
      const sunsetExactTime = new Date(bounds.sunset);

      const updatedSunrise = new Date(date);
      updatedSunrise.setHours(sunriseExactTime.getHours(), sunriseExactTime.getMinutes(), sunriseExactTime.getSeconds(), 0);

      const updatedSunset = new Date(date);
      updatedSunset.setHours(sunsetExactTime.getHours(), sunsetExactTime.getMinutes(), sunsetExactTime.getSeconds(), 0);

      bounds = {
        sunrise: updatedSunrise.getTime(),
        sunset: updatedSunset.getTime(),
      };
    }

    let colorPhase, phaseStartTime, phaseEndTime;
    if (now < bounds.sunrise) {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      colorPhase = this.TIME_COLORS.slice(0, this.SUNRISE_COLOR_IDX + 1);
      phaseStartTime = midnight.getTime();
      phaseEndTime = bounds.sunrise;
    } else if (now > bounds.sunset) {
      const EOD = new Date(now);
      EOD.setHours(23, 59, 59, 999);
      colorPhase = this.TIME_COLORS.slice(this.SUNSET_COLOR_IDX + 1);
      colorPhase.push(this.TIME_COLORS[0]);
      phaseStartTime = bounds.sunset;
      phaseEndTime = EOD.getTime();
    } else if (now >= bounds.sunset - this.sunsetDurationPart && now <= bounds.sunset + this.sunsetDurationPart) {
      colorPhase = this.TIME_COLORS.slice(this.SUNSET_COLOR_IDX-1, this.SUNSET_COLOR_IDX + 2);
      phaseStartTime = bounds.sunset - this.sunsetDurationPart;
      phaseEndTime = bounds.sunset + this.sunsetDurationPart;
    } else {
      colorPhase = this.TIME_COLORS.slice(
        this.SUNRISE_COLOR_IDX,
        this.SUNSET_COLOR_IDX
      );
      phaseStartTime = bounds.sunrise;
      phaseEndTime = bounds.sunset
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

  _getIsNight(date: Date, bounds: { sunrise: number; sunset: number }): boolean {
    const now = date.getTime();

    if (!this._isSameDate(new Date(bounds.sunrise), date) || !this._isSameDate(new Date(bounds.sunset), date)) {
      const sunriseExactTime = new Date(bounds.sunrise);
      const sunsetExactTime = new Date(bounds.sunset);

      const updatedSunrise = new Date(date);
      updatedSunrise.setHours(sunriseExactTime.getHours(), sunriseExactTime.getMinutes(), sunriseExactTime.getSeconds(), 0);
      const updatedSunset = new Date(date);
      updatedSunset.setHours(sunsetExactTime.getHours(), sunsetExactTime.getMinutes(), sunsetExactTime.getSeconds(), 0);
      bounds = {
        sunrise: updatedSunrise.getTime(),
        sunset: updatedSunset.getTime(),
      };
    }

    return now < bounds.sunrise || now >= bounds.sunset - this.sunsetDurationPart;
  }
}
