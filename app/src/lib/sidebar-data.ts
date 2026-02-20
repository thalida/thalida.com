import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import { COLLECTION_NAMES, collectionMeta } from "../content.config";

export type SidebarItem = {
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
};

export type SidebarCollection = {
  name: string;
  title: string;
  items: SidebarItem[];
  allTags: string[];
  allCategories: string[];
};

export type SidebarEntry = { type: "page"; page: string; label: string } | { type: "collection"; collection: string };

export const SIDEBAR_ORDER: SidebarEntry[] = [
  { type: "page", page: "about", label: "About" },
  { type: "collection", collection: "projects" },
  { type: "collection", collection: "guides" },
  { type: "collection", collection: "gallery" },
  { type: "collection", collection: "recipes" },
  { type: "collection", collection: "versions" },
  { type: "page", page: "links", label: "Links" },
];

export async function getSidebarData(): Promise<Record<string, SidebarCollection>> {
  const data: Record<string, SidebarCollection> = {};

  for (const name of COLLECTION_NAMES) {
    if (name === "links") continue; // links are not navigable in the sidebar

    const entries = await getCollection(name, ({ data }) => !data.draft);
    const sorted = entries.sort(
      (a, b) => new Date(b.data.publishedOn).getTime() - new Date(a.data.publishedOn).getTime(),
    );

    const tagsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const items: SidebarItem[] = [];

    for (const entry of sorted) {
      let coverImageSrc: string | undefined;
      if (entry.data.coverImage) {
        const optimized = await getImage({ src: entry.data.coverImage, width: 400 });
        coverImageSrc = optimized.src;
      }

      if (entry.data.tags) entry.data.tags.forEach((t: string) => tagsSet.add(t));
      if (entry.data.category) categoriesSet.add(entry.data.category);

      items.push({
        id: entry.id,
        collection: name,
        title: entry.data.title,
        href: entry.data.link,
        description: entry.data.description,
        tags: entry.data.tags,
        category: entry.data.category,
        publishedOn: entry.data.publishedOn.toISOString(),
        coverImageSrc,
        coverImageAlt: entry.data.coverImageAlt,
      });
    }

    data[name] = {
      name,
      title: collectionMeta[name].title,
      items,
      allTags: [...tagsSet].sort(),
      allCategories: [...categoriesSet].sort(),
    };
  }

  return data;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}
