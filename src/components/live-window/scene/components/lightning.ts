import { merge } from "lodash";

import {
  Bodies,
  Body,
  Composite,
  Query,
} from "matter-js";

import { random } from "../utils";
import type { ICoords, ISceneLightningConfig } from "../types";
import type LiveWindowScene from "..";


export default class SceneLightning {
  scene: LiveWindowScene;
  PERIOD_ADJUSTMENT = 0.5; // Adjustment factor for rain frequency
  MAX_BOLTS = 10; // Maximum number of lightning bolts
  RENDER_OFFSET_X = 50;
  RENDER_OFFSET_Y = 100;
  timeouts: NodeJS.Timeout[] = [];

  isRefreshing: boolean = false;

  defaultConfig: ISceneLightningConfig = {
    enabled: true,
    intensity: 0.5,
  }
  config: ISceneLightningConfig;

  constructor(scene: LiveWindowScene, config: Partial<ISceneLightningConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
  }

  updateConfig(config: Partial<ISceneLightningConfig> | null) {
    this.config = merge({}, this.defaultConfig, config || {});
    return this.config;
  }

  refresh() {
    this.isRefreshing = true;
    this.clear();
    this.isRefreshing = false;
  }

  clear() {
    // Clear all timeouts to prevent memory leaks
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];

    // Clear the lightning layer
    Composite.clear(this.scene.LAYERS.LIGHTNING, false, true);
  }

  onTick() {
    if (this.isRefreshing || !this.config.enabled) {
      return; // Skip if lightning is not enabled
    }

    const numLightningBolts = Composite.allBodies(
      this.scene.LAYERS.LIGHTNING
    ).length;
    if (numLightningBolts >= this.MAX_BOLTS) {
      return;
    }

    const lightningIntensity =
      this.config.intensity * (1 / (numLightningBolts + 1));
    const lightningCheck = random(0, 1);

    if (lightningCheck > lightningIntensity * this.PERIOD_ADJUSTMENT) {
      return; // Skip if random intensity is less than the set intensity
    }

    const startX = random(
      this.RENDER_OFFSET_X,
      this.scene.canvasWidth - this.RENDER_OFFSET_X
    );
    const startY = random(0, this.RENDER_OFFSET_Y);
    let endX = startX + random(-100, 100);
    let endY = random(
      this.scene.canvasHeight / 2,
      this.scene.canvasHeight - this.RENDER_OFFSET_Y
    );

    const clockBodies = Composite.allBodies(this.scene.LAYERS.CLOCK);
    const collisions = Query.ray(
      clockBodies,
      {
        x: startX,
        y: startY,
      },
      {
        x: endX,
        y: endY,
      },
      10
    );
    if (collisions.length > 0) {
      const smallestCollision = collisions.reduce((prev, curr) =>
        prev.supports[0].y < curr.supports[0].y ? prev : curr
      );
      endX = smallestCollision.supports[0].x;
      endY = smallestCollision.supports[0].y;
    }

    // Generate lightning bolt path points
    const lightningPath = SceneLightning.generateLightningBoltPath(
      { x: startX, y: startY },
      { x: endX, y: endY }
    );

    // Create line segments connecting each point
    const lightningBodies: Body[] = [];
    for (let i = 0; i < lightningPath.length - 1; i++) {
      const point1 = lightningPath[i];
      const point2 = lightningPath[i + 1];

      // Calculate the center point and dimensions for the line segment
      const centerX = (point1.x + point2.x) / 2;
      const centerY = (point1.y + point2.y) / 2;
      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const baseWidth = random(4, 8);

      // Calculate the width based on the current segment index, the decreasing width effect
      const width = baseWidth * (1 - i / lightningPath.length);
      const opacity = random(0.4, 0.8); // Random opacity for each segment

      // Create a thin rectangle to represent the line segment
      const lineSegment = Bodies.rectangle(centerX, centerY, length, width, {
        collisionFilter: {
          category: this.scene.CATEGORIES.LIGHTNING,
          mask:
            this.scene.CATEGORIES.DEFAULT |
            this.scene.CATEGORIES.CLOCK |
            this.scene.CATEGORIES.LIGHTNING,
        },
        isStatic: true,
        render: {
          fillStyle: `rgba(255, 255, 255, ${opacity / 4})`, // Yellow stroke with random opacity
          strokeStyle: `rgba(255, 255, 255, ${opacity})`, // Yellow stroke with random opacity
          lineWidth: 2,
        },
      });

      // Rotate the line segment to match the angle
      Body.setAngle(lineSegment, angle);
      lightningBodies.push(lineSegment);
    }

    // Add all line segments to the world
    Composite.add(this.scene.LAYERS.LIGHTNING, lightningBodies);

    // Remove the lightning after a short duration
    const timeout = setTimeout(
      () => {
        Composite.remove(this.scene.LAYERS.LIGHTNING, lightningBodies);
      },
      random(300, 600)
    );
    this.timeouts.push(timeout);
  }

  static generateLightningBoltPath(startCoords: ICoords, endCoords: ICoords) {
    const startX = startCoords.x;
    const startY = startCoords.y;
    const endX = endCoords.x;
    const endY = endCoords.y;

    const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const segments = Math.ceil(distance / 25); // Number of segments based on distance
    const pathPoints = [];

    // Generate the main path points for the lightning line
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const randomXShift = random(-20, 20);
      const x = startX + (endX - startX) * progress + randomXShift;
      const y = startY + (endY - startY) * progress;
      pathPoints.push({ x, y });
    }

    return pathPoints;
  }
}
