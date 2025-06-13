import { merge } from "lodash";

import {
  Bodies,
  Body,
  Composite,
} from "matter-js";

import type { ISceneClockConfig } from "../types";
import type LiveWindowScene from "../scene";


export default class SceneClock {
  scene: LiveWindowScene;
  body: Body | Composite | (Body | Composite)[] | null = null;
  hourBody: Body | null = null;
  minuteBody: Body | null = null;
  secondBody: Body | null = null;
  handsCenterBody: Body | null = null;
  segmentComposites: Composite[] = []; // Store segment bodies for digital clock

  isRendering: boolean = false;

  defaultConfig: ISceneClockConfig = {
    enabled: true,
    format: "analog",
    showSeconds: true,
  }
  config: ISceneClockConfig;

  constructor(scene: LiveWindowScene, config: Partial<ISceneClockConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
    this.render(true);
  }

  render(isInitialRender = false) {
    this.isRendering = true;

    if (!isInitialRender) {
      this.clear();
    }

    if (!this.config.enabled) {
      this.isRendering = false;
      return;
    }

    this.body = this._createBody();
    Composite.add(this.scene.LAYERS.CLOCK, this.body);

    this.isRendering = false;
  }

  onTick(now: Date) {
    if (this.isRendering || !this.config.enabled) {
      return; // Skip if clock is disabled or body is not initialized
    }

    switch (this.config.format) {
      case "digital":
        this._updateDigitalClock(now);
        break;
      case "analog":
        this._updateAnalogClock(now);
        break;
    }
  }

  updateConfig(config: Partial<ISceneClockConfig> | null) {
    this.config = merge({}, this.defaultConfig, config || {});
    return this.config;
  }

  clear() {
    Composite.clear(this.scene.LAYERS.CLOCK, false, true);
    this.body = null;
    this.hourBody = null;
    this.minuteBody = null;
    this.secondBody = null;
    this.handsCenterBody = null;
    this.segmentComposites = [];
  }

  destroy() {
    this.clear();
  }

  _createBody() {
    return this.config.format === "digital" ? this._createDigitalBody() : this._createAnalogBody();
  }

  _createDigitalBody() {
    const numSegments = this.config.showSeconds ? 6 : 4; // Number of segments for the digital clock
    const gap = Math.min(Math.max(this.scene.canvasWidth / 30, 10), 25); // Gap between segments

    const minSegmentWidth = 20; // Minimum width for the segments
    const maxSegmentWidth = 80;
    const segmentWidth = Math.min(
      Math.max(
        this.scene.canvasWidth / 1.5 / numSegments - gap,
        minSegmentWidth
      ),
      maxSegmentWidth
    );

    const segmentHeight = segmentWidth / 4;

    const canvasCenterX = this.scene.canvasWidth / 2;
    const canvasCenterY = this.scene.canvasHeight / 2;
    const clockWidth = numSegments * segmentWidth + (numSegments - 1) * gap; // Width of the clock
    const clockHeight = (segmentWidth - segmentHeight) * 2; // Height of the clock
    const clockX =
      canvasCenterX - ((numSegments - 1) * (segmentWidth + gap)) / 2;
    const clockY = canvasCenterY - clockHeight / 2;

    // const pairHues = [50, 30, 10];
    const pairHues = [255, 255, 255];
    const pairOpacity = [0.95, 0.95, 0.55];

    // Create segments for the digital clock
    const displayBodies = [];
    for (let i = 0; i < numSegments; i++) {
      const pairs = Math.floor(i / 2);
      const hue = pairHues[pairs % pairHues.length];
      const opacity = pairOpacity[pairs % pairOpacity.length];

      const x = clockX + i * (segmentWidth + gap);
      const y = clockY;
      const segment = this._createDigitalSegment(
        x,
        y,
        segmentWidth,
        segmentHeight,
        {
          fillStyle: `rgba(${hue}, ${hue}, ${hue}, ${opacity})`, // Fill color for the segment
          strokeStyle: `rgba(${hue}, ${hue}, ${hue}, 1)`, // Stroke color for the segment
        }
      );
      this.segmentComposites.push(segment);
      displayBodies.push(segment);

      const isMiddle = i % 2 === 1 && i < numSegments - 1; // Middle segments for seconds
      if (isMiddle) {
        const circleA = Bodies.circle(
          x + segmentWidth / 2 + gap / 2,
          canvasCenterY - segmentHeight,
          segmentHeight / 4,
          {
            collisionFilter: {
              category: this.scene.CATEGORIES.CLOCK,
            },
            isStatic: true,
            render: {
              fillStyle: "rgba(255,255,255,0.55)",
              strokeStyle: "rgba(255,255,255,1)",
              lineWidth: 1,
            },
          }
        );
        const circleB = Bodies.circle(
          x + segmentWidth / 2 + gap / 2,
          canvasCenterY + segmentHeight,
          segmentHeight / 4,
          {
            collisionFilter: {
              category: this.scene.CATEGORIES.CLOCK,
            },
            isStatic: true,
            render: {
              fillStyle: "rgba(255,255,255,0.55)",
              strokeStyle: "rgba(255,255,255,1)",
              lineWidth: 1,
            },
          }
        );
        displayBodies.push(circleA);
        displayBodies.push(circleB);
      }
    }

    return displayBodies;
  }

  _createDigitalSegment(
    x: number,
    y: number,
    width: number,
    height: number,
    renderOptions: any
  ) {
    const combinedOptions = {
      collisionFilter: {
        category: this.scene.CATEGORIES.CLOCK,
      },
      isStatic: true,
      chamfer: { radius: height / 2 },
      render: {
        fillStyle: "transparent",
        strokeStyle: "white",
        lineWidth: 1,
        ...renderOptions, // Merge with provided render options
      },
    };
    const segmentBodyPart1 = Bodies.rectangle(x, y, width, height, {
      ...combinedOptions,
    });
    const segmentBodyPart2 = Bodies.rectangle(
      x + (width - height) / 2,
      y + (width - height) / 2,
      height,
      width,
      { ...combinedOptions }
    );
    const segmentBodyPart3 = Bodies.rectangle(
      x + (width - height) / 2,
      y + (width - height) * 1.5,
      height,
      width,
      { ...combinedOptions }
    );
    const segmentBodyPart4 = Bodies.rectangle(
      x,
      y + (width - height) * 2,
      width,
      height,
      { ...combinedOptions }
    );
    const segmentBodyPart5 = Bodies.rectangle(
      x - (width - height) / 2,
      y + (width - height) * 1.5,
      height,
      width,
      { ...combinedOptions }
    );
    const segmentBodyPart6 = Bodies.rectangle(
      x - (width - height) / 2,
      y + (width - height) / 2,
      height,
      width,
      { ...combinedOptions }
    );
    const segmentBodyPart7 = Bodies.rectangle(
      x,
      y + width - height,
      width,
      height,
      combinedOptions
    );

    const segmentComposite = Composite.create({
      label: "Segment",
      bodies: [
        segmentBodyPart1,
        segmentBodyPart2,
        segmentBodyPart3,
        segmentBodyPart4,
        segmentBodyPart5,
        segmentBodyPart6,
        segmentBodyPart7,
      ],
    });

    return segmentComposite;
  }

  _createAnalogBody() {
    const minSize = Math.min(this.scene.canvasWidth, this.scene.canvasHeight);
    const clockBuffer = 50; // Buffer around the clock
    const clockRadius = (minSize - clockBuffer * 2) / 2;

    const hourHandLength = clockRadius * 0.7; // Length of the hour hand
    const minuteHandLength = clockRadius * 0.9; // Length of the minute hand
    const secondHandLength = clockRadius; // Length of the second hand
    const secondHandHitBoxLength = secondHandLength + 8; // Length of the hitbox for the second hand

    const hourHandWidth = 10; // Width of the hands
    const minuteHandWidth = 5; // Width of the hands
    const secondHandWidth = 1; // Width of the hands
    const secondHandHitBoxWidth = secondHandWidth + 8; // Width of the hitbox for the second hand

    const overlap = Math.min(Math.max(minSize / 30, 10), 30); // Gap between segments
    const centerPinSize = hourHandWidth + hourHandWidth / 2; // Size of the center pin

    this.hourBody = Bodies.rectangle(
      this.scene.canvasWidth / 2 - hourHandLength / 2 + overlap,
      this.scene.canvasHeight / 2,
      hourHandLength + overlap,
      hourHandWidth,
      {
        isStatic: true,
        collisionFilter: {
          category: this.scene.CATEGORIES.CLOCK,
        },
        render: {
          fillStyle: "rgba(255, 255, 255, 0.4)",
          strokeStyle: "rgba(255, 255, 255, 0.8)",
          lineWidth: 1,
        },
        chamfer: {
          radius: [
            hourHandWidth / 2,
            hourHandWidth / 4,
            hourHandWidth / 4,
            hourHandWidth / 2,
          ],
        },
      }
    );
    Body.setCentre(
      this.hourBody,
      { x: hourHandLength / 2 - overlap, y: 0 },
      true
    );

    this.minuteBody = Bodies.rectangle(
      this.scene.canvasWidth / 2 - minuteHandLength / 2 + overlap,
      this.scene.canvasHeight / 2,
      minuteHandLength + overlap,
      minuteHandWidth,
      {
        isStatic: true,
        collisionFilter: {
          category: this.scene.CATEGORIES.CLOCK,
        },
        render: {
          fillStyle: "rgba(255, 255, 255, 0.2)",
          strokeStyle: "rgba(255, 255, 255, 0.6)",
          lineWidth: 1,
        },
        chamfer: {
          radius: [
            minuteHandWidth / 2,
            minuteHandWidth / 4,
            minuteHandWidth / 4,
            minuteHandWidth / 2,
          ],
        },
      }
    );
    Body.setCentre(
      this.minuteBody,
      { x: minuteHandLength / 2 - overlap, y: 0 },
      true
    );

    if (this.config.showSeconds) {
      const secondHand = Bodies.rectangle(
        this.scene.canvasWidth / 2 - secondHandLength / 2 + overlap,
        this.scene.canvasHeight / 2,
        secondHandLength + overlap,
        secondHandWidth,
        {
          isStatic: true,
          collisionFilter: {
            category: this.scene.CATEGORIES.CLOCK,
          },
          render: {
            fillStyle: "transparent",
            strokeStyle: "white",
            lineWidth: 1,
          },
          chamfer: {
            radius: [
              secondHandWidth / 2,
              secondHandWidth / 4,
              secondHandWidth / 4,
              secondHandWidth / 2,
            ],
          },
        }
      );
      const secondHitBox = Bodies.rectangle(
        this.scene.canvasWidth / 2 - secondHandLength / 2 + overlap,
        this.scene.canvasHeight / 2,
        secondHandHitBoxLength + overlap,
        secondHandHitBoxWidth,
        {
          isStatic: true,
          collisionFilter: {
            category: this.scene.CATEGORIES.CLOCK,
          },
          render: {
            opacity: 0.1,
            fillStyle: "white",
            strokeStyle: "transparent",
            lineWidth: 1,
          },
          chamfer: {
            radius: [
              secondHandHitBoxWidth / 2,
              secondHandHitBoxWidth / 4,
              secondHandHitBoxWidth / 4,
              secondHandHitBoxWidth / 2,
            ],
          },
        }
      );
      this.secondBody = Body.create({
        parts: [secondHand, secondHitBox],
        isStatic: true,
        collisionFilter: {
          category: this.scene.CATEGORIES.CLOCK,
        },
      });
      Body.setCentre(
        this.secondBody,
        { x: secondHandLength / 2 - overlap, y: 0 },
        true
      );
    }

    this.handsCenterBody = Bodies.circle(
      this.scene.canvasWidth / 2,
      this.scene.canvasHeight / 2,
      centerPinSize / 2,
      {
        isStatic: true,
        collisionFilter: {
          category: this.scene.CATEGORIES.CLOCK,
        },
        render: {
          fillStyle: "rgba(0,0,0,0.6)",
          strokeStyle: "rgba(255,255,255,0.9)",
          lineWidth: 2,
        },
      }
    );

    let bodies = [this.hourBody, this.minuteBody];
    if (this.secondBody) {
      bodies.push(this.secondBody);
    }
    bodies.push(this.handsCenterBody);

    const clock = Composite.create({
      label: "Clock",
      bodies: bodies,
    });

    return clock;
  }

  _updateDigitalClock(now: Date) {
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Update the segments based on the current time
    if (this.segmentComposites.length < 4) {
      return;
    }
    const hour1 = parseInt(hours[0], 10);
    const hour2 = parseInt(hours[1], 10);
    const minute1 = parseInt(minutes[0], 10);
    const minute2 = parseInt(minutes[1], 10);
    const second1 = parseInt(seconds[0], 10);
    const second2 = parseInt(seconds[1], 10);

    this._updateDigitalSegment(this.segmentComposites[0], hour1);
    this._updateDigitalSegment(this.segmentComposites[1], hour2);
    this._updateDigitalSegment(this.segmentComposites[2], minute1);
    this._updateDigitalSegment(this.segmentComposites[3], minute2);

    if (this.config.showSeconds && this.segmentComposites.length > 4) {
      this._updateDigitalSegment(this.segmentComposites[4], second1);
      this._updateDigitalSegment(this.segmentComposites[5], second2);
    }
  }

  _updateDigitalSegment(composite: Composite, value: number) {
    const segmentStates = [
      [1, 1, 1, 1, 1, 1, 0], // 0
      [0, 1, 1, 0, 0, 0, 0], // 1
      [1, 1, 0, 1, 1, 0, 1], // 2
      [1, 1, 1, 1, 0, 0, 1], // 3
      [0, 1, 1, 0, 0, 1, 1], // 4
      [1, 0, 1, 1, 0, 1, 1], // 5
      [1, 0, 1, 1, 1, 1, 1], // 6
      [1, 1, 1, 0, 0, 0, 0], // 7
      [1, 1, 1, 1, 1, 1, 1], //8
      [1, 1, 1, 1, 0, 1, 1], // 9
      [0, 0, 0, 0, 0, 0, 0], // Blank
    ];
    const state = segmentStates[value];
    for (let i = 0; i < composite.bodies.length; i++) {
      const segmentBody = composite.bodies[i];
      const stateValue = state[i];
      if (stateValue === 1) {
        segmentBody.collisionFilter = {
          category: this.scene.CATEGORIES.CLOCK,
          mask:
            this.scene.CATEGORIES.DEFAULT |
            this.scene.CATEGORIES.CLOCK |
            this.scene.CATEGORIES.PERCIPITATION |
            this.scene.CATEGORIES.LIGHTNING,
        };
        segmentBody.render.opacity = 0.8;
      } else {
        segmentBody.collisionFilter = {
          category: this.scene.CATEGORIES.DEFAULT,
          mask: 0, // No collisions
        };
        segmentBody.render.opacity = 0.1;
      }
    }
  }

  _updateAnalogClock(now: Date) {
    if (
      !this.hourBody ||
      !this.minuteBody ||
      (this.config.showSeconds && !this.secondBody)
    ) {
      return;
    }

    const clockPosition = this._calculateClockAngles(now);
    Body.setAngle(this.hourBody, clockPosition.hour);
    Body.setAngle(this.minuteBody, clockPosition.minute);
    if (this.config.showSeconds && this.secondBody) {
      Body.setAngle(this.secondBody, clockPosition.second);
    }
  }

  _calculateClockAngles(time: Date | null = null) {
    const currentTime = time || new Date();

    const offset = 90; // Offset to align with the top of the clock

    // Calculate the angles for hour, minute, and second hands
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();

    const degreesPerHour = 360 / 12; // 12 hours on a clock
    const degreesPerMinute = 360 / 60; // 60 minutes on a clock
    const degreesPerSecond = 360 / 60; // 60 seconds on a clock

    const hourDegrees =
      hours * degreesPerHour + (minutes / 60) * degreesPerHour;
    const minuteDegrees = minutes * degreesPerMinute;
    const secondDegrees = seconds * degreesPerSecond;

    // Convert degrees to radians
    const hourRadians = (Math.PI * (hourDegrees + offset)) / 180;
    const minuteRadians = (Math.PI * (minuteDegrees + offset)) / 180;
    const secondRadians = (Math.PI * (secondDegrees + offset)) / 180;

    return {
      hour: hourRadians,
      minute: minuteRadians,
      second: secondRadians,
    };
  }
}
