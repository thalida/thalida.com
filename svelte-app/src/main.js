import Prism from 'prismjs';
Prism.highlightAll();

import "./styles/notion-theme/index.scss";
import "./styles/prism-themes/prism-shades-of-purple.css";
import "./styles/app.scss";

import LiveWindowApp from "./LiveWindowApp.svelte";
import ThemeSwitcherApp from './ThemeSwitcherApp.svelte'

export const liveWindowApp = new LiveWindowApp({
  target: document.querySelector(".super-content-wrapper"),
  anchor: document.querySelector(".super-content"),
});

export const themeSwitcherApp = new ThemeSwitcherApp({
  target: document.querySelector(".super-navbar__content"),
  anchor: document.querySelector(".super-navbar__logo.notion-link"),
});

// export default windowApp;
