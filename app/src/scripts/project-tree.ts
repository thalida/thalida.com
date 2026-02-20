const contentBody = document.getElementById("content-body") as HTMLDivElement;
const welcome = document.getElementById("content-welcome") as HTMLDivElement;
const closeBtn = document.getElementById("content-close") as HTMLButtonElement;
const cache = new Map<string, string>();

async function loadContent(key: string) {
  welcome.hidden = true;
  closeBtn.hidden = false;

  if (cache.has(key)) {
    contentBody.innerHTML = cache.get(key) ?? "";
    return;
  }

  contentBody.innerHTML = "<p>Loading…</p>";

  try {
    const res = await fetch(`/content/${key}/`);
    if (!res.ok) throw new Error(`${res.status}`);
    const html = await res.text();
    cache.set(key, html);
    contentBody.innerHTML = html;
  } catch {
    contentBody.innerHTML = "<p>Failed to load content.</p>";
  }
}

function clearActiveLinks() {
  document.querySelectorAll(".tree-link").forEach((l) => l.removeAttribute("data-active"));
}

function setActiveLink(collection: string, id: string) {
  clearActiveLinks();
  const link = document.querySelector<HTMLAnchorElement>(
    `.tree-link[data-collection="${collection}"][data-id="${id}"]`,
  );
  if (link) {
    link.setAttribute("data-active", "true");

    const details = link.closest("details");
    if (details) details.open = true;
  }

  const title = link?.textContent?.trim() ?? id;
  window.dispatchEvent(new CustomEvent("route-changed", { detail: { collection, id, title } }));
}

function setActivePageLink(page: string) {
  clearActiveLinks();
  const link = document.querySelector<HTMLAnchorElement>(`.tree-link[data-page="${page}"]`);
  if (link) link.setAttribute("data-active", "true");

  const title = link?.textContent?.trim() ?? page;
  window.dispatchEvent(new CustomEvent("route-changed", { detail: { page, title } }));
}

function showWelcome() {
  welcome.hidden = false;
  closeBtn.hidden = true;
  contentBody.innerHTML = "";
  clearActiveLinks();
  window.dispatchEvent(new CustomEvent("route-changed", { detail: null }));
}

import { parseRoute } from "./routing-utils";

async function navigateFromPath() {
  const route = parseRoute(window.location.pathname);
  if (!route) {
    showWelcome();
    return;
  }

  if ("page" in route) {
    setActivePageLink(route.page);
    await loadContent(route.page);
    return;
  }

  setActiveLink(route.collection, route.id);
  await loadContent(`${route.collection}/${route.id}`);
}

document.querySelectorAll<HTMLAnchorElement>(".tree-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const page = link.dataset.page;
    if (page) {
      history.pushState(null, "", `/${page}`);
      navigateFromPath();
      return;
    }

    const collection = link.dataset.collection;
    const id = link.dataset.id;
    if (!collection || !id) return;

    const path = `/${collection}/${id}`;
    history.pushState(null, "", path);
    navigateFromPath();
  });
});

closeBtn.addEventListener("click", () => {
  history.pushState(null, "", "/");
  showWelcome();
});

window.addEventListener("popstate", () => navigateFromPath());

navigateFromPath();
