import Prism from 'prismjs';
Prism.highlightAll();

import "./styles/notion-theme/index.scss";
import "./styles/prism-themes/prism-shades-of-purple.css";
import "./styles/app.scss";

import WindowApp from "./WindowApp.svelte";
import ThemeSwitcherApp from './ThemeSwitcherApp.svelte'

export const windowApp = new WindowApp({
  target: document.querySelector(".super-content-wrapper"),
  anchor: document.querySelector(".super-content"),
});

export const themeSwitcherApp = new ThemeSwitcherApp({
  target: document.querySelector(".super-navbar__item-list"),
  anchor: document.querySelector(".notion-link.super-navbar__item"),
});

// export default windowApp;
