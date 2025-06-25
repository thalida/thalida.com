import {
  Bodies,
  Body,
  Composite,
} from "matter-js";

import { random } from "../utils";
import type LiveWindowScene from "../scene";
import type { ILiveWindowSceneConfig, ISceneCloudsConfig, ISceneWeather } from "../types";
import { merge } from "lodash";
import store from "../store";


export default class SceneClouds {
  scene: LiveWindowScene;

  PERIOD_ADJUSTMENT = 0.5; // Adjustment factor

  isRendering: boolean = false;

  defaultConfig: ISceneCloudsConfig = {
    enabled: true,
    cloudType: "clouds", // Type of clouds to render
    intensity: 0.05, // 0 to 1, where 1 is very cloudy
  }
  config: ISceneCloudsConfig;

  constructor(scene: LiveWindowScene, config: Partial<ISceneCloudsConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
  }

  render(isInitialRender: boolean = false, now: Date, weather: ISceneWeather) {
    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    this.setLiveConfig(now, weather);

    if (!this.config.enabled) {
      this.isRendering = false;
      return;
    }


    for (let i = 0; i < this.ADJUSTED_MAX_BODIES; i++) {
      const body = this._createBody(true);
      if (!body) {
        continue; // Skip if body creation failed
      }
      Composite.add(this.scene.LAYERS.CLOUDS, body);
    }

    this.isRendering = false;
  }

  onTick(now: Date, weather: ISceneWeather) {
    if (this.isRendering) {
      return; // Skip if effects are not enabled
    }

    this.setLiveConfig(now, weather);

    if (!this.config.enabled) {
      return; // Skip if effects are not enabled
    }

    const bodies = Composite.allBodies(this.scene.LAYERS.CLOUDS);
    let numBodies = bodies.length;

    for (const body of bodies) {
      const x = body.position.x + random(0.1, 0.4);
      // const y = body.position.y;
      const cachedY = body.cachedPosition || body.position.y;
      body.cachedPosition = cachedY;
      const y = body.cachedPosition + (5 * Math.sin(now.getTime() * 0.0012));

      Body.setPosition(body, { x, y });

      if (
        body.bounds.max.x > this.scene.canvasWidth ||
        body.bounds.max.y > this.scene.canvasHeight
      ) {
        numBodies--; // Decrease the count of bodies
        if (
          body.bounds.min.x > this.scene.canvasWidth ||
          body.bounds.min.y > this.scene.canvasHeight
        ) {
          Composite.remove(this.scene.LAYERS.CLOUDS, body);
        }
      }
    }

    if (numBodies >= this.ADJUSTED_MAX_BODIES) {
      return; // Skip if the maximum number of bodies is reached
    }
    const frequencyCheck = random(0, 1);
    if (
      frequencyCheck >
      this.config.intensity * this.PERIOD_ADJUSTMENT
    ) {
      return; // Skip if random intensity is less than the set intensity
    }

    const newBody = this._createBody();
    if (!newBody) {
      return; // Skip if body creation failed
    }
    Composite.add(this.scene.LAYERS.CLOUDS, newBody);
  }

  updateConfig(config: Partial<ISceneCloudsConfig> | null) {
    this.config = merge({}, this.defaultConfig, config || {});
    return this.config;
  }

  setLiveConfig(now: Date, weather: ISceneWeather): ISceneCloudsConfig {
    const liveConfig: ISceneCloudsConfig = {
      ...this.config,
      enabled: true,
    }
    switch(weather.current?.icon ) {
      case 1:
        liveConfig.cloudType = "clouds";
        liveConfig.intensity = 0.01; // Clear sky
        break;
      case 2:
        liveConfig.cloudType = "clouds";
        liveConfig.intensity = 0.1; // Few clouds
        break;
      case 3:
        liveConfig.cloudType = "clouds";
        liveConfig.intensity = 0.2; // Scattered clouds
        break;
      case 4:
        liveConfig.cloudType = "clouds";
        liveConfig.intensity = 0.3; // Broken clouds
        break;
      case 9:
        liveConfig.cloudType = "clouds";
        liveConfig.intensity = 0.4; // Shower rain
        break;
      case 10:
      case 13:
        liveConfig.cloudType = "clouds";
        liveConfig.intensity = 0.5; // Rain and Snow
        break;
      case 11:
        liveConfig.cloudType = "clouds";
        liveConfig.intensity = 0.7; // Thunderstorm
        break;
      case 50:
        liveConfig.cloudType = "mist"; // Mist
        liveConfig.intensity = 0.1; // Misty conditions
        break;
      default:
        liveConfig.cloudType = this.defaultConfig.cloudType; // Default to clouds
        liveConfig.intensity = this.defaultConfig.intensity; // Default intensity
        break;
    }

    return this.updateConfig(liveConfig);
  }

  clear() {
    Composite.clear(this.scene.LAYERS.CLOUDS, false, true); // Clear the clouds layer
  }

  destroy() {
    this.clear();
  }

  get MAX_BODIES() {
    const canvasWidth = this.scene.canvasWidth;
    return Math.floor(canvasWidth / 10); // Maximum number of bodies based on canvas width
  }

  get ADJUSTED_MAX_BODIES() {
    return this.MAX_BODIES * this.config.intensity; // Adjusted maximum based on intensity
  }

  _createBody(isInit: boolean = false) {
    if (!this.config.enabled) {
      return; // Skip if  effects are not enabled
    }

    const body = this.config.cloudType === "mist"
      ? this._createMistBody(isInit)
      : this._createCloudBody(isInit);

    if (!body) {
      return; // Skip if body creation failed
    }

    return body;
  }

  _createMistBody(isInit: boolean = false) {
    const buffer = 5; // Buffer around the mist layer
    const adjustedHeight = this.scene.canvasHeight - buffer * 2; // Adjust height for the mist layer
    const width = random(this.scene.canvasWidth / 2, this.scene.canvasWidth);
    const height = random(32, 64);
    const x = isInit
      ? random(0, this.scene.canvasWidth)
      : -1 * (width / random(1, 2)); // Start off-screen to the left
    const y =  random(adjustedHeight / 1.5, adjustedHeight);
    const opacity = random(0.05, 0.1);

    const mistLayer = Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      collisionFilter: {
        category: this.scene.CATEGORIES.CLOUDS,
      },
      render: {
        fillStyle: `rgba(255, 255, 255, ${opacity / 2})`, // Mist effect
        strokeStyle: `rgba(255, 255, 255, ${opacity})`, // Lighter stroke for mist
        lineWidth: 0,
      },
      chamfer: {
        radius: height / 2, // Chamfer the edges for a softer look
      },
    });

    return mistLayer;
  }

  _createCloudBody(isInit: boolean = false) {
    const width = random(this.scene.canvasWidth / 2, this.scene.canvasWidth);
    const x = isInit
      ? random(0, this.scene.canvasWidth)
      : -1 * (width / random(1, 2)); // Start off-screen to the left
    const y = this.scene.topMargin + random(50, 150);
    const cloudParts = [];
    const numParts = Math.ceil(random(2, 4) * this.config.intensity); // Number of parts based on intensity
    const fillColorMin = 255 * (1 - this.config.intensity); // Adjust fill color based on intensity
    const fillColor = random(fillColorMin, 255);
    for (let i = 0; i < numParts; i++) {
      const partWidth = random(128, 256);
      const partHeight = random(64, 128);
      const partX = x + random(-partWidth / 2, partWidth / 2);
      const partY = y + random(-partHeight / 2, partHeight / 2);
      const cloudPart = Bodies.rectangle(
        partX,
        partY,
        partWidth,
        partHeight,
        {
          isStatic: true,
          collisionFilter: {
            category: this.scene.CATEGORIES.CLOUDS,
          },
          render: {
            opacity: random(0.1, 0.2), // Random opacity for each cloud part
            fillStyle: `rgba(${fillColor}, ${fillColor}, ${fillColor}, 0.4)`, // White fill for cloud parts
            lineWidth: 0,
          },
          chamfer: {
            radius: Math.min(partWidth, partHeight) / random(2, 4), // Chamfer the edges for a softer look
          },
        }
      );
      cloudParts.push(cloudPart);
    }

    const cloud = Body.create({
      parts: cloudParts,
      isStatic: true,
      collisionFilter: {
        category: this.scene.CATEGORIES.CLOUDS,
      },
    });
    return cloud;
  }
}
