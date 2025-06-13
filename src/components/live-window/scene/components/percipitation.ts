import { merge } from "lodash";

import {
  Bodies,
  Composite,
} from "matter-js";

import { random } from "../utils";
import type LiveWindowScene from "..";
import type { IScenePercipitationConfig } from "../types";


export default class ScenePercipitation {
  scene: LiveWindowScene;
  layer: Composite;

  PERIOD_ADJUSTMENT = 0.5; // Adjustment factor for rain frequency
  MAX_BODIES = 800; // Maximum number of raindrops

  isRefreshing: boolean = false;

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

  updateConfig(config: Partial<IScenePercipitationConfig> | null) {
    this.config = merge({}, this.defaultConfig, config || {});
    return this.config;
  }

  refresh() {
    this.isRefreshing = true;
    this.clear();
    this.isRefreshing = false;
  }

  clear() {
    // Clear the percipitation layer
    Composite.clear(this.layer, false, true);
  }

  createBody() {
    return this.config.percipitationType === "snow"
      ? this.createSnowBody()
      : this.createRainBody();
  }

  createSnowBody() {
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

  createRainBody() {
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

  onTick() {
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

    const raindrop = this.createBody();
    Composite.add(this.layer, raindrop);
  }
}
