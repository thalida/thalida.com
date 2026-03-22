import { getCollection } from "astro:content";
import { COLLECTION_NAMES, collectionMeta, type EntryData } from "../content.config";
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

export const NAV_ORDER: NavEntry[] = [
  { type: "page", page: "", label: "Home" },
  { type: "page", page: "about", label: "About" },
  ...COLLECTION_NAMES.map((name) => ({ type: "collection" as const, collection: name })),
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

  const linkEntries = await getCollection("links", ({ data }) => !(data as EntryData).draft);
  const linkUrls = linkEntries.map((e) => e.id);
  const linkMetadataMap = await getLinkMetadataMap(linkUrls);

  for (const name of COLLECTION_NAMES) {
    const entries = await getCollection(name, ({ data }) => !(data as EntryData).draft);
    const sorted = entries.sort(
      (a, b) =>
        new Date((b.data as EntryData).publishedOn).getTime() - new Date((a.data as EntryData).publishedOn).getTime(),
    );

    const categoriesSet = new Set<string>();
    const items: NavItem[] = [];

    for (const entry of sorted) {
      const d = entry.data as EntryData;
      const coverImageSrc = resolveMediaUrl(d.coverImage);

      const isLink = name === "links";
      const linkMeta = isLink ? linkMetadataMap[entry.id] : undefined;
      const isDead = isLink && linkMeta?.dead === true;

      const parsed = parseContentPath(entry.id);
      const category = isDead ? "dead-links" : (d.category ?? parsed.category);
      if (category) categoriesSet.add(category);

      items.push({
        id: entry.id,
        collection: name,
        title: (isLink && linkMeta?.metaTitle) || d.title,
        href: d.link,
        description: d.description,
        tags: d.tags,
        category,
        originalCategory: isDead ? d.category : undefined,
        publishedOn: d.publishedOn.toISOString(),
        coverImageSrc,
        coverImageAlt: d.coverImageAlt,
        faviconUrl: isLink ? linkMeta?.faviconUrl : undefined,
        metaDescription: (isLink && linkMeta?.metaDescription) || d.description,
        subcategory: d.subcategory ?? parsed.subcategory,
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
