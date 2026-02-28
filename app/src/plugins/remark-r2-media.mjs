import { visit } from "unist-util-visit";
import path from "node:path";

/**
 * Remark plugin that rewrites relative image URLs in markdown to point to an R2 bucket.
 * Also rewrites src="/content/..." in raw HTML blocks (e.g. <source>, <video>).
 *
 * When `baseUrl` is empty/unset, the plugin does nothing (local dev unchanged).
 */
export default function remarkR2Media(options = {}) {
  const baseUrl = (options.baseUrl || "").replace(/\/$/, "");

  return (tree, file) => {
    if (!baseUrl) return;

    const filePath = file.history?.[0] || file.path || "";
    const contentMatch = filePath.match(/src\/content\/([^/]+)\//);
    if (!contentMatch) return;

    const collection = contentMatch[1];
    const contentPrefix = `src/content/${collection}/`;
    const idx = filePath.indexOf(contentPrefix);
    const relativeFilePath = filePath.slice(idx + contentPrefix.length);
    const fileDir = path.posix.dirname(relativeFilePath);

    // Rewrite markdown image nodes: ![alt](relative/path.jpg)
    visit(tree, "image", (node) => {
      if (!node.url || node.url.startsWith("http") || node.url.startsWith("//")) return;

      const resolved =
        fileDir === "." ? path.posix.normalize(node.url) : path.posix.normalize(`${fileDir}/${node.url}`);

      node.url = `${baseUrl}/content/${collection}/${resolved}`;
    });

    // Rewrite raw HTML blocks: src="/content/..." → src="{baseUrl}/content/..."
    visit(tree, "html", (node) => {
      node.value = node.value.replace(/src="\/content\//g, `src="${baseUrl}/content/`);
      node.value = node.value.replace(/src='\/content\//g, `src='${baseUrl}/content/`);
    });
  };
}
