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

  isResizing: boolean = false;

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

    const elementDimensions = this.matterElement.getBoundingClientRect();

    this.canvasWidth = elementDimensions.width;
    this.canvasHeight = elementDimensions.height;

    // create a renderer
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

    // create runner
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);

    Render.lookAt(this.renderer, {
      min: { x: 0, y: 0 },
      max: { x: this.canvasWidth, y: this.canvasHeight },
    });

    this.drawSkybox();
    this.drawScene();
    this.onTick();
    Render.run(this.renderer);

    Events.on(this.engine, "beforeUpdate", this.onTick.bind(this));
    window.addEventListener(
      "resize",
      debounce(this.onResize.bind(this), 100)
    );
  }

  drawScene() {
    if (!this.engine || !this.world || !this.renderer) {
      return;
    }

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

    this.clock = new SceneClock(this, this.config.clock);
    this.clouds = new SceneClouds(this, this.config.clouds);
    this.perciptiation = new ScenePercipitation(this, this.config.percipitation);
    this.lightning = new SceneLightning(this, this.config.lightning);
  }

  drawSkybox() {
    if (!this.renderer) {
      return;
    }

    this.skybox = new SceneSkyBox(this, this.config.skybox);
  }

  onTick() {
    if (this.isResizing || !this.engine || !this.renderer) {
      return; // Ensure engine and render are initialized
    }

    this.skybox?.onTick();
    this.clock?.onTick();
    this.clouds?.onTick();
    this.perciptiation?.onTick();
    this.lightning?.onTick();
  }

  onResize() {
    if (!this.engine || !this.world || !this.element || !this.renderer) {
      return; // Ensure element and render are initialized
    }

    this.isResizing = true;

    Render.stop(this.renderer);
    Composite.clear(this.world, false, true); // Clear the world without removing the engine

    const elementDimensions = this.element.getBoundingClientRect();

    this.canvasWidth = elementDimensions.width;
    this.canvasHeight = elementDimensions.height;
    // @ts-ignore
    Render.setSize(this.renderer, this.canvasWidth, this.canvasHeight);
    Render.setPixelRatio(this.renderer, window.devicePixelRatio);
    Render.lookAt(this.renderer, {
      min: { x: 0, y: 0 },
      max: { x: this.canvasWidth, y: this.canvasHeight },
    });

    this.drawScene();
    Render.run(this.renderer);

    this.isResizing = false;
  }

  getNow() {
    return this.config.overrides?.currentTime || new Date();
  }

  updateConfig(config: Partial<ILiveWindowSceneConfig> | null) {
    this.config = merge({}, this.defaultConfig, config || {});
    this.skybox?.updateConfig(this.config.skybox);
    this.clock?.updateConfig(this.config.clock);
    this.perciptiation?.updateConfig(this.config.percipitation);
    this.lightning?.updateConfig(this.config.lightning);
    this.clouds?.updateConfig(this.config.clouds);
  }

  refresh() {
    this.skybox?.refresh();
    this.clock?.refresh();
    this.perciptiation?.refresh();
    this.lightning?.refresh();
    this.clouds?.refresh();
  }

  clear() {
    if (!this.engine || !this.world || !this.renderer) {
      return;
    }

    Render.stop(this.renderer);
    Composite.clear(this.world, false, true);
  }

  destroy() {
    this.clear();
    this.skybox?.clear();
    this.clock?.clear();
    this.perciptiation?.clear();
    this.lightning?.clear();
    this.clouds?.clear();
  }
}
