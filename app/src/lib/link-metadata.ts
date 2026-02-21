import { promises as fs } from "node:fs";

const CACHE_PATH = ".generated/link-metadata.json";
const FETCH_TIMEOUT_MS = 3000;
const CONCURRENCY = 10;

export type LinkMetadata = {
  metaTitle?: string;
  metaDescription?: string;
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .trim();
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
    metaTitle: rawTitle ? decodeHtmlEntities(rawTitle) : undefined,
    metaDescription: rawDesc ? decodeHtmlEntities(rawDesc) : undefined,
  };
}

async function fetchMetadata(url: string): Promise<LinkMetadata> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; thalida.com-bot/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return { fetchedAt: Date.now() };
    const html = await res.text();
    return { ...parseMetadata(html), fetchedAt: Date.now() };
  } catch {
    return { fetchedAt: Date.now() };
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

  const toFetch = urls.filter((url) => !cache[url]);

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (url) => ({ url, meta: await fetchMetadata(url) })));
    for (const { url, meta } of results) {
      cache[url] = meta;
    }
  }

  if (toFetch.length > 0) {
    await fs.mkdir(".generated", { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  }

  return cache;
}
