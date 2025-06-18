  import type { ILiveWindowSceneConfig } from "./types";
import LiveWindowScene from "./scene";
import { throttle } from "lodash";

const sceneMap: Record<string, LiveWindowScene> = {}


export class LiveWindowComponent extends HTMLElement {
  #shadow: ShadowRoot;
  #config: ILiveWindowSceneConfig | null = null;
  #group: string;

  resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#config = null;
    this.#group = this.getAttribute("group") || "livewindow";
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

  connectedCallback() {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("part", "livewindow");
    wrapper.setAttribute("class", "livewindow");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    this.#shadow.appendChild(wrapper);

    window.addEventListener("load", () => {
      this.scene = new LiveWindowScene(wrapper, this.config);
    });

  }

  disconnectedCallback() {
    this.scene?.destroy();
    this.scene = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    if (name !== "config") {
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
}

customElements.define(
  'livewindow-scene',
  LiveWindowComponent
);


export class LiveWindowDetailsComponent extends HTMLElement {
  #shadow: ShadowRoot;
  #group: string;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#group = this.getAttribute("group") || "livewindow";
  }

  static get observedAttributes() {
    return ["group"];
  }

  get group() {
    return this.#group;
  }

  set group(value: string) {
    this.#group = value;
  }

  connectedCallback() {
    window.addEventListener("load", () => {
      setTimeout(this.refreshDetails.bind(this), 0);
    });
    setInterval(this.refreshDetails.bind(this), 5000); // Update every 5 seconds
  }

  refreshDetails() {
    const scene = sceneMap[this.#group];
    if (scene) {
      const location = scene.getLocation();
      const weather = scene.getWeather();
      this.#shadow.innerHTML = `
        <div class="livewindow__details">
          <p>Location: ${location?.city || "Unknown"}</p>
          <p>${weather?.current?.main || "Unknown"}</p>
          <p>${weather?.current?.description || "No description"}</p>
          <p>${weather?.current?.temp ? `${weather.current.temp}°` : "No temperature"}</p>
        </div>
      `;
    } else {
      this.#shadow.innerHTML = "loading...";
    }
  }
}

customElements.define(
  'livewindow-details',
  LiveWindowDetailsComponent
);
