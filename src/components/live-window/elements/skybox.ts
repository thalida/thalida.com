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
    { r: 3, g: 8, b: 22 },
    { r: 13, g: 19, b: 38 },
    { r: 49, g: 89, b: 129 },
    { r: 94, g: 201, b: 237 },
    { r: 94, g: 237, b: 151 },
    { r: 178, g: 237, b: 94 },
    { r: 235, g: 237, b: 94 },
    { r: 235, g: 154, b: 94 },
    { r: 154, g: 94, b: 237 },
    { r: 29, g: 29, b: 201 },
    { r: 10, g: 19, b: 67 },
    { r: 6, g: 13, b: 45 },
  ];
  SUNRISE_COLOR_IDX = 3;
  SUNSET_COLOR_IDX = 8;


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

  render(isInitialRender: boolean = false, now: Date, useLiveWeather: boolean = true) {
    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    this.isRendering = false;
  }

  async onTick(now: Date, useLiveWeather: boolean = true) {
    if (this.isRendering || !this.config.enabled) {
      return;
    }

    const defaultSunriseDate = new Date(now);
    defaultSunriseDate.setHours(6, 0, 0, 0); // Default sunrise time at 6 AM

    const defaultSunsetDate = new Date(now);
    defaultSunsetDate.setHours(18, 0, 0, 0); // Default sunset time at 6 PM

    const hourInTheFuture = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // 1 hour in the future
    const hourInThePast = new Date(now.getTime() - (1 * 60 * 60 * 1000)); // 1 hour in the past

    const sunrise = useLiveWeather && store.store.weather.sunrise ? store.store.weather.sunrise : defaultSunriseDate.getTime();
    const sunset = useLiveWeather && store.store.weather.sunset ? store.store.weather.sunset : defaultSunsetDate.getTime();

    const gradient = await this._getRealisticColorGradient(now, { sunrise, sunset });
    const futureGradient = await this._getRealisticColorGradient(hourInTheFuture, { sunrise, sunset});
    const pastGradient = await this._getRealisticColorGradient(hourInThePast,  { sunrise, sunset });

    if (this.config.enableScene) {
      if (this._getIsDark(gradient.start)) {
        this.scene.matterElement.style.filter = `invert(0)`;
      } else {
        this.scene.matterElement.style.filter = `invert(1)`;
      }

      // Set the background image with radial gradients
      this.scene.element.style.backgroundSize = "100% 100%";
      this.scene.element.style.backgroundPosition = "0px 0px, 0px 0px, 0px 0px, 0px 0px, 0px 0px";
      this.scene.element.style.backgroundRepeat = "no-repeat";
      // this.scene.element.style.backgroundImage = "radial-gradient(49% 81% at 45% 47%, #FFE20345 0%, #FF000000 100%), radial-gradient(113% 91% at 17% -2%, #FF5A00FF 0%, #FF000000 100%), radial-gradient(142% 91% at 83% 7%, #FFDB00FF 0%, #FF000000 100%), radial-gradient(142% 91% at -6% 74%, #FF0049FF 0%, #FF000000 100%), radial-gradient(142% 91% at 111% 84%, #FF7000FF 0%, #FF0000FF 100%)";
      this.scene.element.style.backgroundImage = `radial-gradient(49% 81% at 45% 47%, ${this._colorToString(pastGradient.start, 0.45)} 0%, #FF000000 100%), radial-gradient(113% 91% at 17% -2%, ${this._colorToString(futureGradient.start)} 5%, #FF000000 95%), radial-gradient(142% 91% at 83% 7%, ${this._colorToString(gradient.start)} 5%, #FF000000 95%), radial-gradient(142% 91% at -6% 74%, ${this._colorToString(futureGradient.end)} 5%, #FF000000 95%), radial-gradient(142% 91% at 111% 84%, ${this._colorToString(pastGradient.end)} 0%, ${this._colorToString(gradient.end)} 100%)`;


      //  #FFE20345 0%, #FF000000 100% past start
      //  #FF5A00FF 0%, #FF000000 100% futrue start
      // #FFDB00FF 0%, #FF000000 100% past end
      // #FF0049FF 0%, #FF000000 100% future end
      // #FF7000FF 0%, #FF0000FF 100% - now start, end



      // const skyboxGradient = `linear-gradient(to bottom, rgba(${gradient.start.r}, ${gradient.start.g}, ${gradient.start.b}, 1), rgba(${gradient.end.r}, ${gradient.end.g}, ${gradient.end.b}, 1))`;
      // this.scene.element.style.background = skyboxGradient;
    }

    if (this.config.enableHTML) {
      const colorString = `rgba(${gradient.end.r}, ${gradient.end.g}, ${gradient.end.b}, 0.1)`;
      document.documentElement.style.backgroundColor = colorString;
    }

    if (this.config.enableBody) {
      const bodyGradient = `linear-gradient(to bottom, rgba(${pastGradient.start.r}, ${pastGradient.start.g}, ${pastGradient.start.b}, 0.5), rgba(${futureGradient.end.r}, ${futureGradient.end.g}, ${futureGradient.end.b}, 0.5))`;
      document.body.style.background = bodyGradient;
    }
  }

  updateConfig(config: Partial<ISceneSkyboxConfig> | null): ISceneSkyboxConfig {
    this.config = merge({}, this.defaultConfig, config || {});
    return this.config;
  }

  clear() {
    this.scene.element.style.background = "";
    this.scene.matterElement.style.filter = "";
    document.body.style.background = "";
    document.documentElement.style.backgroundColor = "";
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

  async _getRealisticColorGradient(date: Date, bounds: { sunrise: number; sunset: number }) {
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

    const shiftBy = 1 * 60 * 60 * 1000; // 1 hour
    let hourAgoIsh = new Date(now - shiftBy);
    if (!this._isSameDate(hourAgoIsh, date)) {
      hourAgoIsh = new Date(now);
      hourAgoIsh.setHours(0, 0, 0, 0);
    }

    const gradientStart = this._getRealisticColor(hourAgoIsh, bounds);
    const gradientEnd = this._getRealisticColor(date, bounds);

    let gradient;

    if (now >= bounds.sunset) {
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

  _getRealisticColor(date: Date, bounds: { sunrise: number; sunset: number }) {
    const now = date.getTime();

    let colorPhase, phaseStartTime, phaseEndTime;
    if (now < bounds.sunrise) {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      colorPhase = this.TIME_COLORS.slice(0, this.SUNRISE_COLOR_IDX + 1);
      phaseStartTime = midnight.getTime();
      phaseEndTime = bounds.sunrise;
    } else if (now >= bounds.sunset) {
      const EOD = new Date(now);
      EOD.setHours(23, 59, 59, 999);
      colorPhase = this.TIME_COLORS.slice(this.SUNSET_COLOR_IDX);
      colorPhase.push(this.TIME_COLORS[0]);
      phaseStartTime = bounds.sunset;
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
      phaseStartTime = bounds.sunrise;
      phaseEndTime = bounds.sunset;
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
