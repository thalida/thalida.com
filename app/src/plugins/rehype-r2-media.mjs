import { visit } from "unist-util-visit";

/**
 * Rehype plugin that rewrites src attributes starting with /content/ to point to an R2 bucket.
 * Handles <img>, <source>, <video>, and <audio> elements.
 *
 * When `baseUrl` is empty/unset, the plugin does nothing (local dev unchanged).
 */
export default function rehypeR2Media(options = {}) {
  const baseUrl = (options.baseUrl || "").replace(/\/$/, "");

  return (tree) => {
    if (!baseUrl) return;

    visit(tree, "element", (node) => {
      if (!["img", "source", "video", "audio"].includes(node.tagName)) return;

      const src = node.properties?.src;
      if (typeof src === "string" && src.startsWith("/content/")) {
        node.properties.src = `${baseUrl}${src}`;
      }
    });
  };
}
