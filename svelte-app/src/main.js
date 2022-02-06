import "./styles/notion-theme/index.scss";
import "./styles/app.scss";
import App from "./App.svelte";

const app = new App({
  target: document.querySelector("#svelte-app"),
});

export default app;
