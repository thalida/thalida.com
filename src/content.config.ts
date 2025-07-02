// 1. Import utilities from `astro:content`
import { defineCollection, reference, z } from 'astro:content';

// 2. Import loader(s)
import { glob, file } from 'astro/loaders';

// 3. Define your collection(s)

export const COLLECTION_CHOICES = ["guides", "links", "projects", "gallery", "recipes"] as const;

function makeCollection(collectionName: typeof COLLECTION_CHOICES[number]) {
  return defineCollection({
    loader: glob({ pattern:"**/*.{md,mdx}", base: `./src/content/${collectionName}` }),
    schema: ({ image }) => z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      link: z.string().optional(),
      coverImage: image().optional(),
      coverImageAlt: z.string().optional(),
      description: z.string().optional(),
      publishedOn: z.coerce.date(),
      updatedOn: z.coerce.date().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      related: z.array(reference(collectionName)).optional(),
      rating: z.coerce.number().optional(),
    }),
  });
}


// 4. Export a single `collections` object to register your collection(s)
export const collections = COLLECTION_CHOICES.reduce((acc, collectionName) => {
  acc[collectionName] = makeCollection(collectionName);
  return acc;
}, {} as Record<typeof COLLECTION_CHOICES[number], ReturnType<typeof defineCollection>>);



export const collectionMeta = {
  "projects": {
    "title": "Projects",
    "description": "A collection of my personal and professional projects, crafts, and experiments.",
    "bgColor": "bg-red-50 dark:bg-red-950",
    "headerColor": "bg-gradient-to-r from-rose-400 to-red-600 bg-clip-text text-transparent",
    "imageBgColor": "bg-gradient-to-r from-pink-100 to-rose-200 dark:from-pink-700 dark:to-rose-800",
  },
  "guides": {
    "title": "Guides",
    "description": "Step-by-step guides and tutorials on various topics, from web development to design.",
    "bgColor": "bg-purple-50 dark:bg-purple-950",
    "headerColor": "bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent",
    "imageBgColor": "bg-gradient-to-r from-indigo-100 to-violet-200 dark:from-indigo-700 dark:to-violet-800",
  },
  "links": {
    "title": "Links",
    "description": "A curated list of resources, tools, and websites that I find useful and inspiring.",
    "bgColor": "bg-blue-50 dark:bg-blue-950",
    "headerColor": "bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent",
    "imageBgColor": "bg-gradient-to-r from-cyan-100 to-sky-200 dark:from-cyan-700 dark:to-sky-800",
  },
  "gallery": {
    "title": "Gallery",
    "description": "A showcase of my photography, art, and visual projects.",
    "bgColor": "bg-yellow-50 dark:bg-yellow-950",
    "headerColor": "bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent",
    "imageBgColor": "bg-gradient-to-r from-orange-100 to-amber-200 dark:from-orange-700 dark:to-amber-800",
  },
  "recipes": {
    "title": "Recipes",
    "description": "A collection of my favorite recipes, from quick meals to elaborate dishes.",
    "bgColor": "bg-emerald-50 dark:bg-emerald-950",
    "headerColor": "bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent",
    "imageBgColor": "bg-gradient-to-r from-lime-100 to-green-200 dark:from-lime-700 dark:to-green-800",
  },
}

export const collectionOrder = [
  "projects",
  "guides",
  "gallery",
  "links",
];
