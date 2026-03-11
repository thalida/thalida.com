import { visit } from "unist-util-visit";

/**
 * Rehype plugin that rewrites src attributes starting with /content/ to point to an R2 bucket.
 * Handles parsed <img>, <source>, <video>, <audio> elements and raw HTML blocks in markdown.
 *
 * When `baseUrl` is empty/unset, the plugin does nothing (local dev unchanged).
 */
export default function rehypeR2Media(options = {}) {
  const baseUrl = (options.baseUrl || "").replace(/\/$/, "");

  return (tree) => {
    if (!baseUrl) return;

    // Parsed HTML elements
    visit(tree, "element", (node) => {
      if (!["img", "source", "video", "audio"].includes(node.tagName)) return;

      const src = node.properties?.src;
      if (typeof src === "string" && src.startsWith("/content/")) {
        node.properties.src = `${baseUrl}${src}`;
      }
    });

    // Raw HTML blocks (inline HTML in markdown that isn't parsed into elements)
    visit(tree, "raw", (node) => {
      node.value = node.value.replace(/src="\/content\//g, `src="${baseUrl}/content/`);
      node.value = node.value.replace(/src='\/content\//g, `src='${baseUrl}/content/`);
    });
  };
}
