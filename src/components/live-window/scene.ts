import { cloneDeep, last, merge } from "lodash";

import {
  Engine,
  Render,
  Runner,
  Bodies,
  Composite,
  Events,
  World,
  Common,
  Svg,
  Vertices,
  Body,
  Mouse,
  MouseConstraint,
} from "matter-js";
import "pathseg";
import * as polyDecomp from "poly-decomp";

import { debounce } from "./utils";
import type { ILiveWindowSceneConfig, ISceneLocation, ISceneWeather  } from "./types";
import SceneClock from "./elements/clock";
import ScenePercipitation from "./elements/percipitation";
import SceneLightning from "./elements/lightning";
import SceneClouds from "./elements/clouds";
import SceneSkyBox from "./elements/skybox";
import store from "./store";


Common.setDecomp(polyDecomp);


export default class LiveWindowScene {
  element: HTMLElement;
  matterElement: HTMLElement;

  engine: Engine | null = null;
  world: World | null = null;
  renderer: Render | null = null;
  runner: Runner | null = null;

  canvasWidth: number = 800;
  canvasHeight: number = 600;

  isRendering: boolean = false;
  interval: number | null = null;

  CATEGORIES = {
    DEFAULT: 0x0001,
    CLOCK: 0x0002,
    PERCIPITATION: 0x0004,
    LIGHTNING: 0x0008,
    CLOUDS: 0x0010,
  };

  LAYERS = {
    CLOUDS: Composite.create({
      label: "Cloud Layer",
    }),
    LIGHTNING: Composite.create({
      label: "Lightning Layer",
    }),
    CLOCK: Composite.create({
      label: "Clock Layer",
    }),
    PERCIPITATION: Composite.create({
      label: "Percipitation Layer",
    }),
  };

  clock: SceneClock | null = null;
  clouds: SceneClouds | null = null;
  lightning: SceneLightning | null = null;
  perciptiation: ScenePercipitation | null = null;
  skybox: SceneSkyBox | null = null;

  defaultConfig: ILiveWindowSceneConfig = {
    useLiveWeather: true,
    useLiveTime: true,
    useLiveLocation: true,
    enableGlobalTheme: true, // Whether to use global theme colors
    clockFormat: "analog", // Format of the clock
    topMargin: 64 + 32,
  };

  config: ILiveWindowSceneConfig;

  _lastTickTime: number = 0;

  constructor(container: HTMLElement, config: Partial<ILiveWindowSceneConfig> | null = null) {
    this.config = merge({}, this.defaultConfig, config || {});
    this.element = container;

    this.matterElement = document.createElement("div");
    this.matterElement.style.width = "100%";
    this.matterElement.style.height = "100%";
    this.element.appendChild(this.matterElement);

    this.engine = Engine.create({ enableSleeping: false });
    this.world = this.engine.world;

    this.updateLiveData();
    this.render(true);

    Events.on(this.engine, "beforeUpdate", this.onTick.bind(this));
    window.addEventListener(
      "resize",
      debounce(this.onResize.bind(this), 100)
    );
    this.interval = window.setInterval(this.updateLiveData.bind(this), 1000);
  }

  get topMargin() {
    return this.config.topMargin || 0;
  }

  render(isInitialRender = false) {
    if (!this.engine || !this.world) {
      return;
    }

    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    const elementDimensions = this.element.getBoundingClientRect();
    this.canvasWidth = elementDimensions.width;
    this.canvasHeight = elementDimensions.height;

    if (!this.renderer) {
      this.renderer = Render.create({
        element: this.matterElement,
        engine: this.engine,
        options: {
          width: this.canvasWidth,
          height: this.canvasHeight,
          wireframes: false,
          pixelRatio: window.devicePixelRatio || 1,
          wireframeBackground: "transparent", // Set wireframe background to transparent
          background: "transparent", // Set background to transparent
        },
      });
      Render.run(this.renderer);
    }

    if (!this.runner) {
      this.runner = Runner.create();
      Runner.run(this.runner, this.engine);
    }

    // @ts-ignore
    Render.setSize(this.renderer, this.canvasWidth, this.canvasHeight);
    Render.setPixelRatio(this.renderer, window.devicePixelRatio);
    Render.lookAt(this.renderer, {
      min: { x: 0, y: 0 },
      max: { x: this.canvasWidth, y: this.canvasHeight },
    });

    // Set up the world
    for (const layer of Object.values(this.LAYERS)) {
      Composite.add(this.world, layer);
    }

    // Create walls
    const WALL_WIDTH = 50;
    Composite.add(this.world, [
      Bodies.rectangle(
        this.canvasWidth / 2,
        0 - (WALL_WIDTH + 1) / 2,
        this.canvasWidth,
        WALL_WIDTH,
        {
          isStatic: true,
          render: {
            fillStyle: "transparent",
            strokeStyle: "transparent",
            lineWidth: 0,
          },
        }
      ),
      Bodies.rectangle(
        this.canvasWidth / 2,
        this.canvasHeight + (WALL_WIDTH + 1) / 2,
        this.canvasWidth,
        WALL_WIDTH,
        {
          isStatic: true,
          render: {
            fillStyle: "rgba(0,0,0,1)",
            strokeStyle: "rgba(255,255,255,0.2)",
            lineWidth: 1,
          },
        }
      ),
      Bodies.rectangle(
        0 - (WALL_WIDTH + 1) / 2,
        this.canvasHeight / 2,
        WALL_WIDTH,
        this.canvasHeight,
        {
          isStatic: true,
          render: { fillStyle: "transparent" },
        }
      ),
      Bodies.rectangle(
        this.canvasWidth + (WALL_WIDTH + 1) / 2,
        this.canvasHeight / 2,
        WALL_WIDTH,
        this.canvasHeight,
        {
          isStatic: true,
          render: { fillStyle: "transparent" },
        }
      ),
    ]);

		const pathEl = document.createElementNS(
			'http://www.w3.org/2000/svg',
			'path'
		)
		pathEl.setAttribute('d', "M1 6 2 10 3 13 5 16 8 19 11 21 14 22 18 23 24 24H0V0Z")
		const vertices = Vertices.scale(Svg.pathToVertices(pathEl, 1), this.renderer.options.pixelRatio || 1, this.renderer.options.pixelRatio || 1, { x: 0, y: 0 });
    const cornerBottomLeft = Bodies.fromVertices(0, this.canvasHeight - (22 / 2), vertices, {
        isStatic: true,
        render: {
            fillStyle: "transparent",
            strokeStyle: "transparent",
            lineWidth: 0
        }
      }, true);
    const cornerBottomRight = Bodies.fromVertices(this.canvasWidth, this.canvasHeight - (22 / 2), vertices, {
        isStatic: true,
        render: {
            fillStyle: "transparent",
            strokeStyle: "transparent",
            lineWidth: 0
        }
      }, true);
    Body.setAngle(cornerBottomRight, 270 * Math.PI / 180);

    Composite.add(this.world, [cornerBottomLeft, cornerBottomRight]);

    this.clock = this.clock || new SceneClock(this, {format: this.config.clockFormat});
    this.clouds = this.clouds || new SceneClouds(this);
    this.lightning = this.lightning || new SceneLightning(this);
    this.perciptiation = this.perciptiation || new ScenePercipitation(this);
    this.skybox = this.skybox || new SceneSkyBox(this, {enableGlobalTheme: this.config.enableGlobalTheme});

    const now = this.getNow();
    const weather = this.getWeather();

    this.clock.render(isInitialRender, now, weather);
    this.clouds.render(isInitialRender, now, weather);
    this.lightning.render(isInitialRender, now, weather);
    this.perciptiation.render(isInitialRender, now, weather);
    this.skybox.render(isInitialRender, now, weather);

    Render.run(this.renderer);

    this.isRendering = false;
  }

  onTick() {
    if (this.isRendering) {
      return;
    }

    if (!this.engine || !this.world || !this.renderer) {
      return; // Ensure engine, world, and renderer are initialized
    }

    const now = this.getNow();
    const weather = this.getWeather();

    if(this.engine.timing.timestamp - this._lastTickTime < 20) {
      return;
    }

    this.clock?.onTick(now, weather);
    this.clouds?.onTick(now, weather);
    this.lightning?.onTick(now, weather);
    this.perciptiation?.onTick(now, weather);
    this.skybox?.onTick(now, weather);

    this._lastTickTime = this.engine.timing.timestamp;
  }

  onResize() {
    if (!this.engine || !this.world || !this.element || !this.renderer) {
      return; // Ensure element and render are initialized
    }

    this.render();
  }

  updateConfig(config: Partial<ILiveWindowSceneConfig> | null) {
    this.config =  merge({}, this.defaultConfig, config || {});

    if (this.clock) {
      this.clock.updateConfig({ format: this.config.clockFormat });
    }

    if (this.skybox) {
      this.skybox.updateConfig({
        enableGlobalTheme: this.config.enableGlobalTheme,
      });
    }

    return this.config;
  }

  async updateLiveData() {
    const oldStore = cloneDeep(store.store);

    await store.fetchWeather()

    if (!this.config.useLiveWeather) {
      return;
    }

    if (oldStore.weather.lastFetched === store.store.weather.lastFetched && oldStore.location.lastFetched === store.store.location.lastFetched) {
      return;
    }

    this.render();
  }

  clear() {
    if (!this.engine || !this.world || !this.renderer) {
      return;
    }

    Render.stop(this.renderer);
    Composite.clear(this.world, false, true);

    this._lastTickTime = 0;

    this.clock?.clear();
    this.clouds?.clear();
    this.lightning?.clear();
    this.perciptiation?.clear();
    this.skybox?.clear();
  }

  destroy() {
    this.clear();

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.clock?.destroy();
    this.clouds?.destroy();
    this.lightning?.destroy();
    this.perciptiation?.destroy();
    this.skybox?.destroy();
  }

  getNow() {
    return !this.config.useLiveTime && this.config.overrideTime ? this.config.overrideTime : new Date();
  }

  getWeather(): ISceneWeather {
    return !this.config.useLiveWeather && this.config.overrideWeather ? {
      lastFetched: Date.now(),
      current: {
        ...this._getCustomWeatherData(this.config.overrideWeather),
        temp: store.store.weather.current?.temp || 20,
      },
      sunrise: store.store.weather.sunrise || null,
      sunset: store.store.weather.sunset || null,
    }: store.store.weather;
  }

  getLocation(): ISceneLocation {
    return !this.config.useLiveLocation && this.config.overrideLocation ? {
      lastFetched: Date.now(),
      lat: this.config.overrideLocation.lat || 0,
      lng: this.config.overrideLocation.lng || 0,
      city: null,
      region: null,
      country: null,
    } : store.store.location;
  }

  _getCustomWeatherData(icon: string) {
    switch (icon) {
      case "01d":
      case "01n":
        return {
          id: 0,
          main: "Clear",
          description: "Clear Sky",
          icon,
          temp: 20,
        };
      case "02d":
      case "02n":
        return {
          id: 1,
          main: "Clouds",
          description: "Few Clouds",
          icon,
          temp: 20,
        };
      case "03d":
      case "03n":
        return {
          id: 2,
          main: "Clouds",
          description: "Scattered Clouds",
          icon,
          temp: 20,
        };
      case "04d":
      case "04n":
        return {
          id: 3,
          main: "Clouds",
          description: "Broken Clouds",
          icon,
          temp: 20,
        };
      case "09d":
      case "09n":
        return {
          id: 4,
          main: "Rain",
          description: "Shower Rain",
          icon,
          temp: 20,
        };
      case "10d":
      case "10n":
        return {
          id: 5,
          main: "Rain",
          description: "Rain",
          icon,
          temp: 20,
        };
      case "11d":
      case "11n":
        return {
          id: 6,
          main: "Thunderstorm",
          description: "Thunderstorm",
          icon,
          temp: 20,
        };
      case "13d":
      case "13n":
        return {
          id: 7,
          main: "Snow",
          description: "Snow",
          icon,
          temp: 20,
        };
      case "50d":
      case "50n":
        return {
          id: 8,
          main: "Mist",
          description: "Mist",
          icon,
          temp: 20,
        };
      default:
        return {
          id: 0,
          main: "Clear",
          description: "Clear Sky",
          icon: "01d",
          temp: 20,
        };
      }
  }
}
