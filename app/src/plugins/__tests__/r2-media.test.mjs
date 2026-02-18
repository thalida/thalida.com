// @vitest-environment node
import { describe, it, expect } from "vitest";
import remarkR2Media from "../remark-r2-media.mjs";
import rehypeR2Media from "../rehype-r2-media.mjs";

// ── Helpers ──────────────────────────────────────────────────────────

function makeImageNode(url) {
  return { type: "image", url };
}

function makeHtmlNode(value) {
  return { type: "html", value };
}

function makeRemarkTree(nodes) {
  return { type: "root", children: nodes };
}

function makeFile(filePath) {
  return { history: [filePath], path: filePath };
}

function makeElementNode(tagName, src) {
  return {
    type: "element",
    tagName,
    properties: { src },
  };
}

function makeRehypeTree(nodes) {
  return { type: "root", children: nodes };
}

// ── Remark plugin tests ──────────────────────────────────────────────

describe("remark-r2-media", () => {
  const BASE_URL = "https://pub-xxx.r2.dev/main";

  it("rewrites relative image URL to R2 path", () => {
    const plugin = remarkR2Media({ baseUrl: BASE_URL });
    const node = makeImageNode("./photo.jpg");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/trip/index.md");

    plugin(tree, file);

    expect(node.url).toBe(`${BASE_URL}/content/gallery/trip/photo.jpg`);
  });

  it("rewrites image URL without ./ prefix", () => {
    const plugin = remarkR2Media({ baseUrl: BASE_URL });
    const node = makeImageNode("photo.jpg");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/trip/index.md");

    plugin(tree, file);

    expect(node.url).toBe(`${BASE_URL}/content/gallery/trip/photo.jpg`);
  });

  it("does not rewrite absolute https URL", () => {
    const plugin = remarkR2Media({ baseUrl: BASE_URL });
    const node = makeImageNode("https://example.com/img.jpg");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/trip/index.md");

    plugin(tree, file);

    expect(node.url).toBe("https://example.com/img.jpg");
  });

  it("does not rewrite protocol-relative URL", () => {
    const plugin = remarkR2Media({ baseUrl: BASE_URL });
    const node = makeImageNode("//cdn.example.com/img.jpg");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/trip/index.md");

    plugin(tree, file);

    expect(node.url).toBe("//cdn.example.com/img.jpg");
  });

  it("rewrites double-quoted src in raw HTML blocks", () => {
    const plugin = remarkR2Media({ baseUrl: BASE_URL });
    const node = makeHtmlNode('<video><source src="/content/gallery/video.mp4"></video>');
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/index.md");

    plugin(tree, file);

    expect(node.value).toBe(`<video><source src="${BASE_URL}/content/gallery/video.mp4"></video>`);
  });

  it("rewrites single-quoted src in raw HTML blocks", () => {
    const plugin = remarkR2Media({ baseUrl: BASE_URL });
    const node = makeHtmlNode("<video><source src='/content/gallery/video.mp4'></video>");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/index.md");

    plugin(tree, file);

    expect(node.value).toBe(`<video><source src='${BASE_URL}/content/gallery/video.mp4'></video>`);
  });

  it("is a no-op when baseUrl is empty (local dev)", () => {
    const plugin = remarkR2Media({ baseUrl: "" });
    const node = makeImageNode("./photo.jpg");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/trip/index.md");

    plugin(tree, file);

    expect(node.url).toBe("./photo.jpg");
  });

  it("is a no-op when baseUrl is not provided", () => {
    const plugin = remarkR2Media({});
    const node = makeImageNode("./photo.jpg");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/content/gallery/trip/index.md");

    plugin(tree, file);

    expect(node.url).toBe("./photo.jpg");
  });

  it("is a no-op for files outside src/content/", () => {
    const plugin = remarkR2Media({ baseUrl: BASE_URL });
    const node = makeImageNode("./photo.jpg");
    const tree = makeRemarkTree([node]);
    const file = makeFile("/project/src/pages/about.md");

    plugin(tree, file);

    expect(node.url).toBe("./photo.jpg");
  });
});

// ── Rehype plugin tests ──────────────────────────────────────────────

describe("rehype-r2-media", () => {
  const BASE_URL = "https://pub-xxx.r2.dev/main";

  it("rewrites img src starting with /content/", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeElementNode("img", "/content/gallery/photo.jpg");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe(`${BASE_URL}/content/gallery/photo.jpg`);
  });

  it("rewrites source src starting with /content/", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeElementNode("source", "/content/gallery/video.mp4");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe(`${BASE_URL}/content/gallery/video.mp4`);
  });

  it("rewrites video src starting with /content/", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeElementNode("video", "/content/projects/demo.webm");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe(`${BASE_URL}/content/projects/demo.webm`);
  });

  it("rewrites audio src starting with /content/", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeElementNode("audio", "/content/recipes/narration.mp3");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe(`${BASE_URL}/content/recipes/narration.mp3`);
  });

  it("does not rewrite external https URL", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeElementNode("img", "https://external.com/photo.jpg");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe("https://external.com/photo.jpg");
  });

  it("does not rewrite non-/content/ path", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeElementNode("img", "/other/path.jpg");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe("/other/path.jpg");
  });

  it("does not rewrite non-media elements", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeElementNode("div", "/content/gallery/photo.jpg");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe("/content/gallery/photo.jpg");
  });

  it("is a no-op when baseUrl is empty", () => {
    const plugin = rehypeR2Media({ baseUrl: "" });
    const node = makeElementNode("img", "/content/gallery/photo.jpg");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe("/content/gallery/photo.jpg");
  });

  it("is a no-op when baseUrl is not provided", () => {
    const plugin = rehypeR2Media({});
    const node = makeElementNode("img", "/content/gallery/photo.jpg");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.properties.src).toBe("/content/gallery/photo.jpg");
  });
});
