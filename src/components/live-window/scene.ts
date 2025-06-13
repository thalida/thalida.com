import { merge } from "lodash";

import {
  Engine,
  Render,
  Runner,
  Bodies,
  Composite,
  Events,
  World,
} from "matter-js";

import { debounce } from "./utils";
import type { ILiveWindowSceneConfig  } from "./types";
import SceneClock from "./elements/clock";
import ScenePercipitation from "./elements/percipitation";
import SceneLightning from "./elements/lightning";
import SceneClouds from "./elements/clouds";
import SceneSkyBox from "./elements/skybox";


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
  perciptiation: ScenePercipitation | null = null;
  lightning: SceneLightning | null = null;
  clouds: SceneClouds | null = null;
  skybox: SceneSkyBox | null = null;

  defaultConfig: ILiveWindowSceneConfig = {
    clock: {
      enabled: true, // Whether the clock is enabled
      format: "analog", // Style of the clock
      showSeconds: true, // Whether to show seconds hand
    },
    skybox: {
      enabled: true,
      enableScene: true,
      enableBody: true,
      enableHTML: true,
    },
    percipitation: {
      enabled: false,
    },
    lightning: {
      enabled: false,
    },
    clouds: {
      enabled: true,
    },
  };

  config: ILiveWindowSceneConfig;

  constructor(container: HTMLElement, config: Partial<ILiveWindowSceneConfig> | null = null) {
    this.config = merge({}, this.defaultConfig, config || {});
    this.element = container;

    this.matterElement = document.createElement("div");
    this.matterElement.style.width = "100%";
    this.matterElement.style.height = "100%";
    this.element.appendChild(this.matterElement);

    this.engine = Engine.create({ enableSleeping: false });
    this.world = this.engine.world;

    this.render(true);

    Events.on(this.engine, "beforeUpdate", this.onTick.bind(this));
    window.addEventListener(
      "resize",
      debounce(this.onResize.bind(this), 100)
    );
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

    this.clock = this.clock || new SceneClock(this, this.config.clock);
    this.clouds = this.clouds || new SceneClouds(this, this.config.clouds);
    this.lightning = this.lightning || new SceneLightning(this, this.config.lightning);
    this.perciptiation = this.perciptiation || new ScenePercipitation(this, this.config.percipitation);
    this.skybox = this.skybox || new SceneSkyBox(this, this.config.skybox);

    this.clock.render();
    this.clouds.render();
    this.lightning.render();
    this.perciptiation.render();
    this.skybox.render();

    Render.run(this.renderer);

    this.isRendering = false;
  }

  onTick() {
    if (this.isRendering) {
      return;
    }

    const now = this._getNow();

    this.clock?.onTick(now);
    this.clouds?.onTick(now);
    this.lightning?.onTick(now);
    this.perciptiation?.onTick(now);
    this.skybox?.onTick(now);
  }

  onResize() {
    if (!this.engine || !this.world || !this.element || !this.renderer) {
      return; // Ensure element and render are initialized
    }

    this.render();
  }

  updateConfig(config: Partial<ILiveWindowSceneConfig> | null) {
    const newConfig = merge({}, this.defaultConfig, config || {});
    newConfig.clock = this.clock?.updateConfig(newConfig.clock) || newConfig.clock;
    newConfig.clouds = this.clouds?.updateConfig(newConfig.clouds) || newConfig.clouds;
    newConfig.lightning = this.lightning?.updateConfig(newConfig.lightning) || newConfig.lightning;
    newConfig.percipitation = this.perciptiation?.updateConfig(newConfig.percipitation) || newConfig.percipitation;
    newConfig.skybox = this.skybox?.updateConfig(newConfig.skybox) || newConfig.skybox;
    this.config = newConfig;

    return this.config;
  }

  clear() {
    if (!this.engine || !this.world || !this.renderer) {
      return;
    }

    Render.stop(this.renderer);
    Composite.clear(this.world, false, true);

    this.clock?.clear();
    this.clouds?.clear();
    this.lightning?.clear();
    this.perciptiation?.clear();
    this.skybox?.clear();
  }

  destroy() {
    this.clear();
    this.clock?.destroy();
    this.clouds?.destroy();
    this.lightning?.destroy();
    this.perciptiation?.destroy();
    this.skybox?.destroy();
  }

  _getNow() {
    return this.config.overrides?.currentTime || new Date();
  }
}
