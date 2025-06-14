import { merge } from "lodash";

import {
  Bodies,
  Composite,
  use,
} from "matter-js";

import { random } from "../utils";
import type LiveWindowScene from "../scene";
import type { ISceneFluffConfig } from "../types";
import store from "../store";


export default class SceneFluff {
  scene: LiveWindowScene;
  layer: Composite;

  PERIOD_ADJUSTMENT = 0.5; // Adjustment factor for rain frequency
  MAX_BODIES = 5; // Maximum number of raindrops

  isRendering: boolean = false;

  defaultConfig: ISceneFluffConfig = {
    enabled: true,
    intensity: 0.1,
  };
  config: ISceneFluffConfig;

  constructor(scene: LiveWindowScene, config: Partial<ISceneFluffConfig> | null = null) {
    this.scene = scene;
    this.config = this.updateConfig(config);
    this.layer = this.scene.LAYERS.FLUFF;
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

    const fluff = this._createBody();
    console.log("Adding fluff", fluff);
    Composite.add(this.layer, fluff);
  }

  updateConfig(config: Partial<ISceneFluffConfig> | null) {
    this.config = merge({}, this.defaultConfig, config || {});

    return this.config;
  }

  getLiveConfig() {
    return this.config;
  }

  clear() {
    // Clear the percipitation layer
    Composite.clear(this.layer, false, true);
  }

  destroy() {
    this.clear();
  }

  _createBody() {
    const border = 2
    const radius = 20

    // art & design
    const illustration = Bodies.rectangle(70, 500, 133, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/RADmiFI.png', xScale: 0.5, yScale: 0.5 }}})
    const art = Bodies.rectangle(35, 460, 56, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/NwQqeng.png', xScale: 0.5, yScale: 0.5 }}})
    const threeD = Bodies.rectangle(90, 460, 52, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/ptUWXgO.png', xScale: 0.5, yScale: 0.5 }}})
    const graphic = Bodies.rectangle(60, 420, 105, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/TyOmVtt.png', xScale: 0.5, yScale: 0.5 }}})
    const photo = Bodies.rectangle(50, 380, 86, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/tc3MsJP.png', xScale: 0.5, yScale: 0.5 }}})
    // video
    const documentary = Bodies.rectangle(220, 540, 165, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/QYNTBNr.png', xScale: 0.5, yScale: 0.5 }}})
    const animation = Bodies.rectangle(200, 490, 128, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/rSnEY9Q.png', xScale: 0.5, yScale: 0.5 }}})
    const vintage = Bodies.rectangle(190, 440, 104, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/5BSBvSm.png', xScale: 0.5, yScale: 0.5 }}})
    const short = Bodies.rectangle(170, 390, 82, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/VEyrikN.png', xScale: 0.5, yScale: 0.5 }}})
    //misc
    const website = Bodies.rectangle(360, 420, 108, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/hr9p4uV.png', xScale: 0.5, yScale: 0.5 }}})
    const article = Bodies.rectangle(300, 380, 92, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/n6TV7XG.png', xScale: 0.5, yScale: 0.5 }}})
    const music = Bodies.rectangle(400, 360, 86, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/dax8MwT.png', xScale: 0.5, yScale: 0.5 }}})
    const star = Bodies.rectangle(80, 260, 42, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/C2qPMbB.png', xScale: 0.5, yScale: 0.5 }}})
    //about
    const about = Bodies.rectangle(230, 140, 87, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/4gPcZVN.png', xScale: 0.5, yScale: 0.5 }}})
    const instagram = Bodies.rectangle(320, 180, 40, 40, {chamfer: {radius: radius}, render: { sprite: { texture: 'https://i.imgur.com/RStSwfG.png', xScale: 0.5, yScale: 0.5 }}})

    const allFluff = [
      illustration,
      art,
      threeD,
      graphic,
      photo,
      documentary,
      animation,
      vintage,
      short,
      website,
      article,
      music,
      star,
      about,
      instagram,
    ];
    const index = Math.floor(random(0, allFluff.length - 1));
    return allFluff[index];
  }
}
