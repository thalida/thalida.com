import { merge } from "lodash";

import {
  Bodies,
  Composite,
  use,
} from "matter-js";

import { random } from "../utils";
import type LiveWindowScene from "../scene";
import type { IScenePercipitationConfig } from "../types";
import store from "../store";


export default class ScenePercipitation {
  scene: LiveWindowScene;
  layer: Composite;

  PERIOD_ADJUSTMENT = 0.5; // Adjustment factor for rain frequency
  MAX_BODIES = 800; // Maximum number of raindrops

  isRendering: boolean = false;

  defaultConfig: IScenePercipitationConfig = {
    enabled: true,
    percipitationType: "rain",
    intensity: 0.1,
  };
  config: IScenePercipitationConfig;

  constructor(scene: LiveWindowScene, config: Partial<IScenePercipitationConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
    this.layer = this.scene.LAYERS.PERCIPITATION;
  }

  render(isInitialRender: boolean = false, now: Date, useLiveWeather: boolean = true) {
    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    this.isRendering = false;
  }

  onTick(now: Date, useLiveWeather: boolean = true) {
    if (this.isRendering) {
      return;
    }

    this.updateConfig(useLiveWeather ? this.getLiveConfig() : this.config);

    if (!this.config.enabled) {
      return; // Skip if not raining
    }

    const frequencyCheck = random(0, 1);
    if (frequencyCheck > this.config.intensity * this.PERIOD_ADJUSTMENT) {
      return; // Skip if random intensity is less than the set intensity
    }

    const currentBodies = Composite.allBodies(this.layer).length;
    if (currentBodies >= this.MAX_BODIES) {
      // Remove the oldest raindrop if the limit is reached
      Composite.remove(this.layer, Composite.allBodies(this.layer)[0]);
    }

    const raindrop = this._createBody();
    Composite.add(this.layer, raindrop);
  }

  updateConfig(config: Partial<IScenePercipitationConfig> | null) {
    this.config = merge({}, this.defaultConfig, config || {});

    return this.config;
  }

  getLiveConfig() {
    const liveConfig: IScenePercipitationConfig = {
      ...this.config,
      enabled: false,
    }

    switch (store.store.weather.current?.icon) {
      case "09d": // Rain
      case "09n":
        liveConfig.enabled = true;
        liveConfig.percipitationType = "rain"; // Set to rain
        liveConfig.intensity = 0.3; // Moderate intensity for rain
        break;
      case "10d": // Rain showers
      case "10n":
        liveConfig.enabled = true;
        liveConfig.percipitationType = "rain"; // Set to rain
        liveConfig.intensity = 0.4; // Higher intensity for rain showers
        break;
      case "11d": // Thunderstorm
      case "11n":
        liveConfig.enabled = true;
        liveConfig.intensity = 0.5; // High intensity for thunderstorms
        break;
      case "13d": // Snow
      case "13n":
        liveConfig.enabled = true;
        liveConfig.percipitationType = "snow"; // Set to snow
        liveConfig.intensity = 0.3; // Moderate intensity for snow
        break;
      default:
        liveConfig.enabled = false; // Disable lightning for other weather conditions
    }

    return liveConfig;
  }

  clear() {
    // Clear the percipitation layer
    Composite.clear(this.layer, false, true);
  }

  destroy() {
    this.clear();
  }

  _createBody() {
    return this.config.percipitationType === "snow"
      ? this._createSnowBody()
      : this._createRainBody();
  }

  _createSnowBody() {
    const x = random(0, this.scene.canvasWidth);
    const y = 0;
    const sides = random(5, 7); // Random number of sides for the snowflake
    const radius = random(4, 8);
    const opacity = random(0.8, 1); // Random opacity for the snowflake
    const snowflake = Bodies.polygon(x, y, sides, radius, {
      collisionFilter: {
        category: this.scene.CATEGORIES.PERCIPITATION,
        mask:
          this.scene.CATEGORIES.DEFAULT |
          this.scene.CATEGORIES.CLOCK |
          this.scene.CATEGORIES.PERCIPITATION,
      },
      friction: 0.0001,
      frictionAir: 0.1,
      restitution: 0.3,
      density: 0.001,
      chamfer: {
        radius: radius / 4, // Chamfer the edges for a softer look
      },
      render: {
        fillStyle: `rgba(255, 255, 255, ${opacity / 1.2})`, // White fill with random opacity
        strokeStyle: `rgba(255, 255, 255, ${opacity})`, // White stroke with random opacity
        lineWidth: 1,
      },
    });

    return snowflake;
  }

  _createRainBody() {
    const x = random(0, this.scene.canvasWidth);
    const y = 0;
    const width = random(4, 8);
    const height = random(4, 8);
    const opacity = random(0.4, 0.8); // Random opacity for the raindrop
    const raindrop = Bodies.rectangle(x, y, width, height, {
      collisionFilter: {
        category: this.scene.CATEGORIES.PERCIPITATION,
        mask:
          this.scene.CATEGORIES.DEFAULT |
          this.scene.CATEGORIES.CLOCK |
          this.scene.CATEGORIES.PERCIPITATION,
      },
      chamfer: {
        radius: Math.min(width, height) / 2,
      },
      friction: 0.0001,
      frictionAir: 0.01,
      restitution: 0.5,
      density: 0.001,
      render: {
        fillStyle: `rgba(180, 225, 255, ${opacity / 1.2})`, // Light blue fill with random opacity
        strokeStyle: `rgba(180, 225, 255, ${opacity})`, // Light blue stroke with random opacity
        lineWidth: 1,
      },
    });

    return raindrop;
  }
}
