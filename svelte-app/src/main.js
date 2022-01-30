import "./app.css";
import "./styles/notion-theme.scss";
import App from "./App.svelte";

const app = new App({
  target: document.querySelector("#svelte-app"),
});

export default app;
