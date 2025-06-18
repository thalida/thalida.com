import { cloneDeep, merge } from "lodash";

import {
  Bodies,
  Composite,
  Svg,
  use,
  Vector,
  Vertices,
} from "matter-js";

import { random } from "../utils";
import type LiveWindowScene from "../scene";
import type { ILiveWindowSceneConfig, IScenePercipitationConfig, ISceneWeather } from "../types";
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

  _starVertices:  Vector[];

  constructor(scene: LiveWindowScene, config: Partial<IScenePercipitationConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
    this.layer = this.scene.LAYERS.PERCIPITATION;

    const pathEl = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    pathEl.setAttribute('d', "M11.454 12.3435C11.6141 13.1804 10.7212 13.8213 9.97952 13.4019L7.39427 11.9398C7.08333 11.764 6.7022 11.7673 6.39441 11.9487L3.83439 13.4568C3.09985 13.8896 2.1954 13.2636 2.34161 12.4237L2.89323 9.25509C2.95008 8.92853 2.84142 8.59501 2.60309 8.36462L0.306071 6.14404C-0.292648 5.56525 0.0369842 4.55104 0.861585 4.43485L3.87561 4.01016C4.21899 3.96178 4.5128 3.73895 4.65199 3.42133L5.88901 0.598615C6.23564 -0.19234 7.35438 -0.201605 7.71406 0.583503L8.99579 3.38128C9.14043 3.69701 9.43852 3.91508 9.78321 3.95735L12.7985 4.3271C13.6255 4.4285 13.9731 5.43743 13.3841 6.02666L11.1241 8.28735C10.8898 8.52169 10.7868 8.85684 10.8491 9.18229L11.454 12.3435Z");
    this._starVertices = Svg.pathToVertices(pathEl, 0.5);
  }

  render(isInitialRender: boolean = false, now: Date, weather: ISceneWeather) {
    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    this.isRendering = false;
  }

  onTick(now: Date, weather: ISceneWeather) {
    if (this.isRendering) {
      return;
    }

    this.setLiveConfig(now, weather);

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

  setLiveConfig(now: Date, weather: ISceneWeather): IScenePercipitationConfig {
    const liveConfig: IScenePercipitationConfig = {
      ...this.config,
      enabled: true,
    }

    switch (weather.current?.icon) {
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
        liveConfig.percipitationType = "rain"; // Set to rain
        liveConfig.intensity = 0.5; // High intensity for thunderstorms
        break;
      case "13d": // Snow
      case "13n":
        liveConfig.enabled = true;
        liveConfig.percipitationType = "snow"; // Set to snow
        liveConfig.intensity = 0.3; // Moderate intensity for snow
        break;
      default:
        liveConfig.enabled = false;
        liveConfig.percipitationType = "fluff";
        liveConfig.intensity = 0.1;
    }

    return this.updateConfig(liveConfig);
  }

  clear() {
    // Clear the percipitation layer
    Composite.clear(this.layer, false, true);
  }

  destroy() {
    this.clear();
  }

  _createBody() {
    switch (this.config.percipitationType) {
      case "snow":
        return this._createSnowBody();
      case "rain":
        return this._createRainBody();
      case "fluff":
        return this._createFluffBody(); // Placeholder for fluff, implement as needed
      default:
        return this._createRainBody(); // Default to rain if type is not recognized
    }
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
    const width = random(6, 9);
    const height = random(6, 9);
    const opacity = random(0.95, 1); // Random opacity for the raindrop
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
        fillStyle: `rgba(0, 133, 178, ${opacity})`, // Light blue fill with random opacity
        strokeStyle: `rgba(0, 238, 255, ${opacity})`, // Light blue stroke with random opacity
        lineWidth: 1,
      },
    });

    return raindrop;
  }

  _createFluffBody() {
    const pixelRatio = this.scene.renderer?.options.pixelRatio || 1;
    const scale = random(pixelRatio * 0.6, pixelRatio * 0.8); // Random scale for the fluff
    const vertices = cloneDeep(this._starVertices);
    const star = Vertices.scale(vertices, scale, scale, { x: 0, y: 0 });

    const hue = random(0, 360); // Random hue for the star color
    return Bodies.fromVertices(
      random(10, this.scene.canvasWidth-10),
      0,
      star,
      {
        collisionFilter: {
          category: this.scene.CATEGORIES.PERCIPITATION,
          mask:
            this.scene.CATEGORIES.DEFAULT |
            this.scene.CATEGORIES.CLOCK |
            this.scene.CATEGORIES.PERCIPITATION,
        },
        friction: 0.0001,
        frictionAir: 0.05,
        restitution: 0.5,
        density: 0.001,
        render: {
          fillStyle: `hsla(${hue}, 100%, 50%, 1)`, // Random color with random opacity
          strokeStyle: `hsla(${hue}, 100%, 50%, 1)`, // Random color with random opacity
          lineWidth: 1,
        },
      },
      true // Set to true to create a compound body
    );
  }
}
