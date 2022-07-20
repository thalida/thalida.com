import "./styles/notion-theme/index.scss";
import "./styles/prism-themes/prism-dracula.css";
import "./styles/app.scss";
import App from "./App.svelte";

const app = new App({
  target: document.querySelector("#svelte-app"),
});

export default app;
