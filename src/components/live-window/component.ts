  import type { ILiveWindowSceneConfig } from "./types";
import LiveWindowScene from "./scene";
import { throttle } from "lodash";


export default class LiveWindowComponent extends HTMLElement {
  #shadow: ShadowRoot;
  #config: ILiveWindowSceneConfig | null = null;

  scene: LiveWindowScene | null = null;
  resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    this.#config = null;
  }

  static get observedAttributes() {
    return ["config"];
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
    wrapper.setAttribute("part", "live-window");
    wrapper.setAttribute("class", "live-window");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    this.#shadow.appendChild(wrapper);

    window.addEventListener("load", () => {
      this.scene = new LiveWindowScene(wrapper, this.config);
    });
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.scene?.destroy();
    this.resizeObserver = null;
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
  'live-window',
  LiveWindowComponent
);
