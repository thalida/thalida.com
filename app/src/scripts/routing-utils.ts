export const ROUTABLE_COLLECTIONS = new Set(["projects", "guides", "gallery", "recipes", "versions"]);

export const STANDALONE_PAGES = new Set(["about"]);

export function parseRoute(path: string): { collection: string; id: string } | { page: string } | null {
  const trimmed = path.replace(/\/?\s*$/, "");

  const pageMatch = trimmed.match(/^\/([^/]+)$/);
  if (pageMatch && STANDALONE_PAGES.has(pageMatch[1])) {
    return { page: pageMatch[1] };
  }

  const match = trimmed.match(/^\/([^/]+)\/(.+?)$/);
  if (!match) return null;
  const [, collection, id] = match;
  if (!ROUTABLE_COLLECTIONS.has(collection)) return null;
  return { collection, id };
}
