export const ROUTABLE_COLLECTIONS = new Set(["projects", "guides", "gallery", "recipes", "versions"]);

export function parseRoute(path: string): { collection: string; id: string } | null {
  const match = path.match(/^\/([^/]+)\/(.+?)\/?\s*$/);
  if (!match) return null;
  const [, collection, id] = match;
  if (!ROUTABLE_COLLECTIONS.has(collection)) return null;
  return { collection, id };
}
