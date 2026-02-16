const contentBody = document.getElementById("content-body") as HTMLDivElement;
const welcome = document.getElementById("content-welcome") as HTMLDivElement;
const cache = new Map<string, string>();

document.querySelectorAll<HTMLAnchorElement>(".tree-link").forEach((link) => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    document.querySelectorAll(".tree-link").forEach((l) => l.removeAttribute("data-active"));
    link.setAttribute("data-active", "true");

    const collection = link.dataset.collection;
    const id = link.dataset.id;
    if (!collection || !id) return;

    // Links have no rendered page -- open externally
    if (collection === "links") {
      const url = link.dataset.href;
      if (url) window.open(url, "_blank", "noopener");
      return;
    }

    welcome.hidden = true;
    const key = `${collection}/${id}`;

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
  });
});
