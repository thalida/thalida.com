import { getCollection } from "astro:content";
import {
  COLLECTION_NAMES,
  DEFAULT_SORT,
  collectionMeta,
  isHiddenCollection,
  type CollectionName,
  type EntryData,
  type SortMode,
} from "../content.config";
import { getLinkMetadataMap } from "./link-metadata";
import { parseContentPath } from "./content-path";
import { resolveMediaUrl } from "./constants";

export type NavItem = {
  id: string;
  collection: string;
  title: string;
  href?: string;
  description?: string;
  tags?: string[];
  category?: string;
  originalCategory?: string;
  publishedOn: string; // ISO string for JSON serialization
  updatedOn?: string; // ISO string for JSON serialization
  coverImageSrc?: string;
  coverImageAlt?: string;
  faviconUrl?: string;
  metaDescription?: string;
  subcategory?: string;
};

export type NavCollection = {
  name: string;
  title: string;
  items: NavItem[];
  allCategories: string[];
  allSubcategories: Record<string, string[]>; // category -> subcategory[]
};

export type NavEntry = { type: "page"; page: string; label: string } | { type: "collection"; collection: string };

type AnyEntry = { id: string; data: EntryData };

/** When an entry was last touched: its update date, else its publish date. */
function lastUpdated(data: EntryData): number {
  return new Date(data.updatedOn ?? data.publishedOn).getTime();
}

/** Newest first, by the collection's configured sort date. See `SortMode`. */
function byDate(mode: SortMode) {
  return (a: AnyEntry, b: AnyEntry) => {
    if (mode === "updatedOn") {
      const updated = lastUpdated(b.data) - lastUpdated(a.data);
      if (updated !== 0) return updated;
    }
    return new Date(b.data.publishedOn).getTime() - new Date(a.data.publishedOn).getTime();
  };
}

export const NAV_ORDER: NavEntry[] = [
  { type: "page", page: "", label: "Home" },
  { type: "page", page: "about", label: "About" },
  ...COLLECTION_NAMES.filter((name) => !isHiddenCollection(name)).map((name) => ({
    type: "collection" as const,
    collection: name,
  })),
];

export const TOOLBAR_NAV_ORDER: NavEntry[] = [
  { type: "page", page: "", label: "Home" },
  { type: "page", page: "about", label: "About" },
  { type: "collection", collection: "projects" },
  { type: "collection", collection: "guides" },
];

let cachedNavData: Record<string, NavCollection> | null = null;

export async function getNavData(): Promise<Record<string, NavCollection>> {
  if (cachedNavData) return cachedNavData;

  const data: Record<string, NavCollection> = {};

  const linkEntries = ((await getCollection("links")) as unknown as AnyEntry[]).filter((e) => !e.data.draft);
  const linkUrls = linkEntries.map((e) => e.id);
  const linkMetadataMap = await getLinkMetadataMap(linkUrls);

  for (const name of COLLECTION_NAMES) {
    // Astro 7 types getCollection() over a union of names as a union of entry
    // types, which collapses .data to unknown. Every collection shares one
    // schema, so narrow to a single entry type here.
    const entries = ((await getCollection(name as CollectionName)) as unknown as AnyEntry[]).filter(
      (entry) => !entry.data.draft,
    );
    const sorted = entries.sort(byDate(collectionMeta[name].sort ?? DEFAULT_SORT));

    const categoriesSet = new Set<string>();
    const items: NavItem[] = [];

    for (const entry of sorted) {
      const coverImageSrc = resolveMediaUrl(entry.data.coverImage);

      const isLink = name === "links";
      const linkMeta = isLink ? linkMetadataMap[entry.id] : undefined;
      const isDead = isLink && linkMeta?.dead === true;

      const parsed = parseContentPath(entry.id);
      const category = isDead ? "dead-links" : (entry.data.category ?? parsed.category);
      if (category) categoriesSet.add(category);

      items.push({
        id: entry.id,
        collection: name,
        title: (isLink && linkMeta?.metaTitle) || entry.data.title,
        href: entry.data.link,
        description: entry.data.description,
        tags: entry.data.tags,
        category,
        originalCategory: isDead ? entry.data.category : undefined,
        publishedOn: entry.data.publishedOn.toISOString(),
        updatedOn: entry.data.updatedOn?.toISOString(),
        coverImageSrc,
        coverImageAlt: entry.data.coverImageAlt,
        faviconUrl: isLink ? linkMeta?.faviconUrl : undefined,
        metaDescription: (isLink && linkMeta?.metaDescription) || entry.data.description,
        subcategory: entry.data.subcategory ?? parsed.subcategory,
      });
    }

    const subcategoriesMap: Record<string, string[]> = {};
    for (const item of items) {
      if (item.category && item.subcategory) {
        if (!subcategoriesMap[item.category]) {
          subcategoriesMap[item.category] = [];
        }
        if (!subcategoriesMap[item.category].includes(item.subcategory)) {
          subcategoriesMap[item.category].push(item.subcategory);
        }
      }
    }
    for (const cat of Object.keys(subcategoriesMap)) {
      subcategoriesMap[cat].sort();
    }

    data[name] = {
      name,
      title: collectionMeta[name].title,
      items,
      allCategories: [...categoriesSet]
        .sort((a, b) => (name === "versions" ? b.localeCompare(a) : a.localeCompare(b)))
        .sort((a, b) => (a === "dead-links" ? 1 : b === "dead-links" ? -1 : 0)),
      allSubcategories: subcategoriesMap,
    };
  }

  cachedNavData = data;
  return data;
}
