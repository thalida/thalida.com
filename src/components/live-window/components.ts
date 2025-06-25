  import type { ILiveWindowSceneConfig, ISceneLocation, ISceneWeather } from "./types";
import LiveWindowScene from "./scene";
import { throttle } from "lodash";

const sceneMap: Record<string, LiveWindowScene> = {}


export class LiveWindowComponent extends HTMLElement {
  #shadow: ShadowRoot;
  #config: ILiveWindowSceneConfig | null = null;
  #group: string;

  #intervalId: number | null = null;

  #isReady: boolean = false;
  #lastComputedData: Record<string, string> = {}

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#config = null;
    this.#group = this.getAttribute("group") || "livewindow";
  }

  get isReady() {
    return this.#isReady;
  }

  set scene(scene: LiveWindowScene | null) {
    if (scene) {
      sceneMap[this.#group] = scene;
    } else {
      delete sceneMap[this.#group];
    }
  }

  get scene(): LiveWindowScene | null {
    return sceneMap[this.#group] || null;
  }

  static get observedAttributes() {
    return ["config", "group"];
  }

  get group() {
    return this.#group;
  }

  set group(value: string) {
    this.#group = value;
    if (this.scene) {
      sceneMap[value] = this.scene;
      delete sceneMap[this.#group];
    }
  }

  get config() {
    return this.#config;
  }

  set config(value: ILiveWindowSceneConfig | null) {
    this.#config = value;
    this.scene?.updateConfig(value);
    this.scene?.render();
  }

  updateConfig(config: ILiveWindowSceneConfig) {
    this.config = config;
  }

  connectedCallback() {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("part", "livewindow");
    wrapper.setAttribute("class", "livewindow");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    this.#shadow.appendChild(wrapper);

    window.addEventListener("load", () => {
      this.scene = new LiveWindowScene(wrapper, this.config);
      this.scene.on("tick", this.onTick.bind(this));
      this.scene.on("ready", () => {
        this.#isReady = true;
        this.dispatchEvent(new CustomEvent("ready", { bubbles: true, composed: true }));
      });
      this.scene.run();
    });
  }

  disconnectedCallback() {
    this.scene?.destroy();
    this.scene = null;
    window.clearInterval(this.#intervalId!);
    this.#intervalId = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    if (!["config", "group"].includes(name)) {
      return;
    }

    if (name === "group") {
      this.group = newValue || "livewindow";
      return;
    }

    try {
      this.config = JSON.parse(newValue || "{}") as ILiveWindowSceneConfig;
    } catch (error) {
      console.error("Invalid config JSON:", error);
    }

    this.scene?.updateConfig(this.config);
    this.scene?.render();
  }

  onTick(timestamp:Date, weather:ISceneWeather, location: ISceneLocation) {
    if (!this.scene) {
      return;
    }

    this._updateElement("time", () => timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    this._updateElement("location", () => `${location.city}, ${location.country}`);
    this._updateElement("greeting", () => this.scene?.getGreeting(timestamp) || "Hello!");
    this._updateElement("temperature", () => weather.current ? `${weather.current.temp}°C` : "N/A");
    this._updateElement("weather", () => weather.current?.description || "N/A");
    this._updateElement("sunrise", () => {
      if (!weather.sunrise) return "N/A";
      const sunriseDate = new Date(weather.sunrise);
      return sunriseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    this._updateElement("sunset", () => {
      if (!weather.sunset) return "N/A";
      const sunsetDate = new Date(weather.sunset);
      return sunsetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
  }

  _updateElement(key: string, val: (...args: any[]) => string) {
    const prev = this.#lastComputedData[key];
    const current = val();

    if (current === prev) {
      return; // No change, skip update
    }

    this.#lastComputedData[key] = current;
    const elements = document.querySelectorAll(`[data-group="${this.group}"][data-${key}]`);
    elements.forEach(el => {
      el.textContent = current;
    });
  }
}

customElements.define(
  'livewindow-scene',
  LiveWindowComponent
);
