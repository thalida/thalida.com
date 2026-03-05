import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import { COLLECTION_NAMES, collectionMeta } from "../content.config";
import { getLinkMetadataMap, getFaviconUrl } from "./link-metadata";

const COVER_IMAGE_WIDTH = 400;

export type NavItem = {
  id: string;
  collection: string;
  title: string;
  href?: string;
  description?: string;
  tags?: string[];
  category?: string;
  publishedOn: string; // ISO string for JSON serialization
  coverImageSrc?: string;
  coverImageAlt?: string;
  faviconUrl?: string;
  metaDescription?: string;
};

export type NavCollection = {
  name: string;
  title: string;
  items: NavItem[];
  allCategories: string[];
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

export async function getNavData(): Promise<Record<string, NavCollection>> {
  const data: Record<string, NavCollection> = {};

  const linkEntries = await getCollection("links", ({ data }) => !data.draft);
  const linkUrls = linkEntries.map((e) => e.id);
  const linkMetadataMap = await getLinkMetadataMap(linkUrls);

  for (const name of COLLECTION_NAMES) {
    const entries = await getCollection(name, ({ data }) => !data.draft);
    const sorted = entries.sort(
      (a, b) => new Date(b.data.publishedOn).getTime() - new Date(a.data.publishedOn).getTime(),
    );

    const categoriesSet = new Set<string>();
    const items: NavItem[] = [];

    for (const entry of sorted) {
      let coverImageSrc: string | undefined;
      if (entry.data.coverImage) {
        const optimized = await getImage({ src: entry.data.coverImage, width: COVER_IMAGE_WIDTH });
        coverImageSrc = optimized.src;
      }

      if (entry.data.category) categoriesSet.add(entry.data.category);

      const isLink = name === "links";
      const linkMeta = isLink ? linkMetadataMap[entry.id] : undefined;

      items.push({
        id: entry.id,
        collection: name,
        title: (isLink && linkMeta?.metaTitle) || entry.data.title,
        href: entry.data.link,
        description: entry.data.description,
        tags: entry.data.tags,
        category: entry.data.category,
        publishedOn: entry.data.publishedOn.toISOString(),
        coverImageSrc,
        coverImageAlt: entry.data.coverImageAlt,
        faviconUrl: isLink ? getFaviconUrl(entry.id) : undefined,
        metaDescription: (isLink && linkMeta?.metaDescription) || entry.data.description,
      });
    }

    data[name] = {
      name,
      title: collectionMeta[name].title,
      items,
      allCategories: [...categoriesSet].sort((a, b) => (name === "versions" ? b.localeCompare(a) : a.localeCompare(b))),
    };
  }

  return data;
}

export { isValidDate, formatDate, categoryDisplay } from "./format-utils";
