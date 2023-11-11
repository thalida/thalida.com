import Prism from 'prismjs';
Prism.highlightAll();

import "./styles/notion-theme/index.scss";
import "./styles/prism-themes/prism-shades-of-purple.css";
import "./styles/app.scss";
import { movePageProperties } from "./domManipulation";

import LiveWindowApp from "./LiveWindowApp.svelte";

movePageProperties();

export const liveWindowApp = new LiveWindowApp({
  target: document.querySelector(".super-content-wrapper"),
  anchor: document.querySelector(".super-content"),
});
