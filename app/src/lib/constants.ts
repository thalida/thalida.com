export const SS_SESSION_TOKEN_KEY = "session_token";
export const PAGE_SIZE = 30;
export const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || "http://localhost:8787";

const r2BaseUrl = (import.meta.env.PUBLIC_R2_BASE_URL || "").replace(/\/$/, "");
// CF_PAGES_BRANCH is injected via vite.define in astro.config.mjs
const mediaBranch = import.meta.env.CF_PAGES_BRANCH || "main";
export const MEDIA_BASE_URL = r2BaseUrl ? `${r2BaseUrl}/${mediaBranch}` : "";

/** Rewrite `/content/...` paths to R2 URLs in production; pass-through in dev. */
export function resolveMediaUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (MEDIA_BASE_URL && path.startsWith("/content/")) {
    return `${MEDIA_BASE_URL}${path}`;
  }
  return path;
}
