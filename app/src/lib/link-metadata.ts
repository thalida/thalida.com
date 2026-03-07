import { promises as fs } from "node:fs";
import he from "he";

const CACHE_PATH = ".generated/link-metadata.json";
const FETCH_TIMEOUT_MS = 3000;
const CONCURRENCY = 10;
const REVALIDATE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type LinkMetadata = {
  metaTitle?: string;
  metaDescription?: string;
  faviconUrl?: string;
  dead?: boolean;
  fetchedAt: number;
};

type MetadataCache = Record<string, LinkMetadata>;

export function getFaviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

function parseMetadata(html: string): Pick<LinkMetadata, "metaTitle" | "metaDescription"> {
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

  const ogDesc =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];

  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];

  const rawTitle = ogTitle ?? titleTag;
  const rawDesc = ogDesc ?? metaDesc;

  return {
    metaTitle: rawTitle ? he.decode(rawTitle).trim() : undefined,
    metaDescription: rawDesc ? he.decode(rawDesc).trim() : undefined,
  };
}

async function validateFavicon(url: string): Promise<string | undefined> {
  const faviconUrl = getFaviconUrl(url);
  if (!faviconUrl) return undefined;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(faviconUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return res.ok ? faviconUrl : undefined;
  } catch {
    return undefined;
  }
}

async function fetchMetadata(url: string): Promise<LinkMetadata> {
  try {
    const [pageResult, faviconUrl] = await Promise.all([
      (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; thalida.com-bot/1.0)" },
        });
        clearTimeout(timer);
        if (!res.ok) return { dead: true };
        const html = await res.text();
        return { ...parseMetadata(html), dead: false };
      })(),
      validateFavicon(url),
    ]);
    return { ...pageResult, faviconUrl, fetchedAt: Date.now() };
  } catch {
    return { dead: true, fetchedAt: Date.now() };
  }
}

export async function getLinkMetadataMap(urls: string[]): Promise<MetadataCache> {
  let cache: MetadataCache = {};
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    cache = JSON.parse(raw) as MetadataCache;
  } catch {
    // cache missing or corrupt — start fresh
  }

  const now = Date.now();
  const toFetch = urls.filter((url) => !cache[url]);
  const toRevalidate = urls.filter((url) => cache[url] && cache[url].fetchedAt + REVALIDATE_AFTER_MS < now);
  const toRevalidateSet = new Set(toRevalidate);
  const toRevalidateFavicon = urls.filter(
    (url) => cache[url] && !("faviconUrl" in cache[url]) && !toRevalidateSet.has(url),
  );

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, meta: await fetchMetadata(url) })));
    for (const { url, meta } of results) {
      cache[url] = meta;
    }
  }

  for (let i = 0; i < toRevalidate.length; i += CONCURRENCY) {
    const batch = toRevalidate.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, meta: await fetchMetadata(url) })));
    for (const { url, meta } of results) {
      cache[url] = meta;
    }
  }

  for (let i = 0; i < toRevalidateFavicon.length; i += CONCURRENCY) {
    const batch = toRevalidateFavicon.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, faviconUrl: await validateFavicon(url) })));
    for (const { url, faviconUrl } of results) {
      cache[url] = { ...cache[url], faviconUrl };
    }
  }

  if (toFetch.length > 0 || toRevalidate.length > 0 || toRevalidateFavicon.length > 0) {
    await fs.mkdir(".generated", { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  }

  return cache;
}
