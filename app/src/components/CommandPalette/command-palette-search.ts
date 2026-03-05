export interface SearchItem {
  id: string;
  collection: string;
  collectionTitle: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  coverImageSrc?: string;
  publishedOn: string;
  faviconUrl?: string;
}

export interface NavCollectionData {
  title: string;
  items: SearchItem[];
}

export const MAX_PALETTE_RESULTS = 15;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Pagefind has no published type declarations
let pagefind: any = null;

export async function loadPagefind() {
  if (pagefind) return pagefind;
  try {
    // Use string concatenation to prevent Vite/Rollup from resolving this at build time.
    // Pagefind assets are generated post-build by astro-pagefind.
    const path = "/pagefind/pagefind.js";
    pagefind = await import(/* @vite-ignore */ path);
    await pagefind.init();
  } catch {
    pagefind = null;
  }
  return pagefind;
}

export function stringMatch(pool: SearchItem[], query: string): SearchItem[] {
  const q = query.toLowerCase();
  return pool.filter((item) => {
    return (
      item.title.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q) ||
      (item.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
      (item.category ?? "").toLowerCase().includes(q)
    );
  });
}

export async function getFiltered(
  allItems: SearchItem[],
  itemLookup: Map<string, SearchItem>,
  activeCollection: string | null,
  query: string,
): Promise<SearchItem[]> {
  let pool = allItems;

  if (activeCollection) {
    pool = pool.filter((item) => item.collection === activeCollection);
  }

  if (!query.trim()) return pool.slice(0, MAX_PALETTE_RESULTS);

  const pf = await loadPagefind();

  if (!pf) {
    return stringMatch(pool, query).slice(0, MAX_PALETTE_RESULTS);
  }

  // Pagefind search for content pages (not links)
  const pfResults: SearchItem[] = [];
  try {
    const search = await pf.search(query);
    for (const result of search.results) {
      const resultData = await result.data();
      const collection = resultData.meta?.collection;
      const itemId = resultData.meta?.itemId;
      if (!collection || !itemId) continue;
      if (activeCollection && collection !== activeCollection) continue;
      const item = itemLookup.get(`${collection}/${itemId}`);
      if (item) pfResults.push(item);
      if (pfResults.length >= MAX_PALETTE_RESULTS) break;
    }
  } catch {
    return stringMatch(pool, query).slice(0, MAX_PALETTE_RESULTS);
  }

  // String matching for links (Pagefind can't index them — no detail pages)
  const linksPool = pool.filter((item) => item.collection === "links");
  const linkMatches = stringMatch(linksPool, query);

  // Merge: Pagefind results first (ranked by relevance), then link matches
  const seen = new Set<string>(pfResults.map((item) => `${item.collection}/${item.id}`));
  const merged = [...pfResults];
  for (const item of linkMatches) {
    const key = `${item.collection}/${item.id}`;
    if (!seen.has(key)) {
      merged.push(item);
      seen.add(key);
    }
    if (merged.length >= MAX_PALETTE_RESULTS) break;
  }

  return merged.slice(0, MAX_PALETTE_RESULTS);
}
