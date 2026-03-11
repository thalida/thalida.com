// @vitest-environment node
import { describe, it, expect } from "vitest";
import rehypeR2Media from "@plugins/rehype-r2-media.mjs";

// ── Helpers ──────────────────────────────────────────────────────────

function makeElementNode(tagName, src) {
  return {
    type: "element",
    tagName,
    properties: { src },
  };
}

function makeRawNode(value) {
  return { type: "raw", value };
}

function makeRehypeTree(nodes) {
  return { type: "root", children: nodes };
}

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

  it("rewrites double-quoted src in raw HTML nodes", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeRawNode('<video><source src="/content/gallery/video.mp4"></video>');
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.value).toBe(`<video><source src="${BASE_URL}/content/gallery/video.mp4"></video>`);
  });

  it("rewrites single-quoted src in raw HTML nodes", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeRawNode("<video><source src='/content/gallery/video.mp4'></video>");
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.value).toBe(`<video><source src='${BASE_URL}/content/gallery/video.mp4'></video>`);
  });

  it("does not rewrite raw HTML without /content/ src", () => {
    const plugin = rehypeR2Media({ baseUrl: BASE_URL });
    const node = makeRawNode('<img src="/other/path.jpg">');
    const tree = makeRehypeTree([node]);

    plugin(tree);

    expect(node.value).toBe('<img src="/other/path.jpg">');
  });
});
