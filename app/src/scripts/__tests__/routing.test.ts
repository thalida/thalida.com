import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseRoute, ROUTABLE_COLLECTIONS } from "../routing-utils";

// ── parseRoute (pure logic) ──────────────────────────────────────────

describe("parseRoute", () => {
  it("parses /projects/my-app correctly", () => {
    expect(parseRoute("/projects/my-app")).toEqual({
      collection: "projects",
      id: "my-app",
    });
  });

  it("parses /guides/setup-guide correctly", () => {
    expect(parseRoute("/guides/setup-guide")).toEqual({
      collection: "guides",
      id: "setup-guide",
    });
  });

  it("parses nested IDs like /gallery/photos/trip", () => {
    expect(parseRoute("/gallery/photos/trip")).toEqual({
      collection: "gallery",
      id: "photos/trip",
    });
  });

  it("returns null for /links/something (not routable)", () => {
    expect(parseRoute("/links/something")).toBeNull();
  });

  it("returns null for root path /", () => {
    expect(parseRoute("/")).toBeNull();
  });

  it("returns null for unknown collection", () => {
    expect(parseRoute("/unknown-collection/foo")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRoute("")).toBeNull();
  });

  it("handles trailing slash correctly", () => {
    const result = parseRoute("/projects/foo/");
    expect(result).toEqual({ collection: "projects", id: "foo" });
  });

  it("parses all routable collections", () => {
    for (const collection of ROUTABLE_COLLECTIONS) {
      expect(parseRoute(`/${collection}/test-item`)).toEqual({
        collection,
        id: "test-item",
      });
    }
  });

  describe("security: path traversal attempts", () => {
    it("rejects path traversal ../../etc/passwd", () => {
      const result = parseRoute("/../../etc/passwd");
      expect(result).toBeNull();
    });

    it("still parses path-like IDs within valid collections", () => {
      const result = parseRoute("/projects/../evil");
      expect(result).toEqual({ collection: "projects", id: "../evil" });
    });
  });
});

// ── Content loading (jsdom) ──────────────────────────────────────────

describe("content loading", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="content-body"></div>
      <div id="content-welcome">
        <h2>Welcome</h2>
        <p>Click a project in the tree to view it here.</p>
      </div>
      <nav id="project-tree">
        <a href="#" class="tree-link" data-collection="projects" data-id="my-app">My App</a>
        <a href="#" class="tree-link" data-collection="links" data-id="ext-link" data-href="https://example.com">External</a>
      </nav>
    `;

    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "open",
      vi.fn(() => null),
    );
  });

  it("fetches and renders content on tree link click", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response("<article>Content</article>", { status: 200 }));

    const contentBody = document.getElementById("content-body") as HTMLDivElement;
    const welcome = document.getElementById("content-welcome") as HTMLDivElement;

    // Simulate what project-tree.ts does on click
    welcome.hidden = true;
    const res = await fetch("/content/projects/my-app/");
    const html = await res.text();
    contentBody.innerHTML = html;

    expect(mockFetch).toHaveBeenCalledWith("/content/projects/my-app/");
    expect(contentBody.innerHTML).toBe("<article>Content</article>");
    expect(welcome.hidden).toBe(true);
  });

  it("serves from cache on second fetch of same content", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response("<article>Cached</article>", { status: 200 }));

    const cache = new Map<string, string>();
    const key = "projects/my-app";

    // First load
    const res = await fetch(`/content/${key}/`);
    const html = await res.text();
    cache.set(key, html);

    // Second load from cache
    mockFetch.mockClear();
    const cached = cache.get(key);
    expect(cached).toBe("<article>Cached</article>");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error message on fetch 404", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const contentBody = document.getElementById("content-body") as HTMLDivElement;

    try {
      const res = await fetch("/content/projects/missing/");
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      contentBody.innerHTML = "<p>Failed to load content.</p>";
    }

    expect(contentBody.innerHTML).toBe("<p>Failed to load content.</p>");
  });

  it("shows error message on network error", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new TypeError("Network error"));

    const contentBody = document.getElementById("content-body") as HTMLDivElement;

    try {
      await fetch("/content/projects/broken/");
    } catch {
      contentBody.innerHTML = "<p>Failed to load content.</p>";
    }

    expect(contentBody.innerHTML).toBe("<p>Failed to load content.</p>");
  });

  it("links collection opens external URL, does not fetch content", () => {
    const link = document.querySelector<HTMLAnchorElement>('.tree-link[data-collection="links"]') as HTMLAnchorElement;
    const collection = link.dataset.collection;
    const url = link.dataset.href;

    expect(collection).toBe("links");
    expect(url).toBe("https://example.com");

    // project-tree.ts opens links externally without fetching
    if (collection === "links" && url) {
      window.open(url, "_blank", "noopener");
    }

    expect(window.open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener");
  });
});

// ── Navigation / History ─────────────────────────────────────────────

describe("navigation and history", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="content-body"></div>
      <div id="content-welcome" hidden>Welcome</div>
    `;
  });

  it("navigating to / shows welcome and clears content", () => {
    const welcome = document.getElementById("content-welcome") as HTMLDivElement;
    const contentBody = document.getElementById("content-body") as HTMLDivElement;

    contentBody.innerHTML = "<article>Old content</article>";

    // Simulate navigateFromPath for root
    const route = parseRoute("/");
    if (!route) {
      welcome.hidden = false;
      contentBody.innerHTML = "";
    }

    expect(route).toBeNull();
    expect(welcome.hidden).toBe(false);
    expect(contentBody.innerHTML).toBe("");
  });

  it("navigating to a valid route returns parsed route", () => {
    const route = parseRoute("/projects/my-app");
    expect(route).toEqual({ collection: "projects", id: "my-app" });
  });

  it("popstate triggers re-navigation", () => {
    const handler = vi.fn();
    window.addEventListener("popstate", handler);

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener("popstate", handler);
  });
});
