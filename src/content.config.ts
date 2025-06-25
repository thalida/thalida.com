// 1. Import utilities from `astro:content`
import { defineCollection, reference, z } from 'astro:content';

// 2. Import loader(s)
import { glob, file } from 'astro/loaders';
import { sub } from 'three/tsl';

// 3. Define your collection(s)

export const COLLECTION_CHOICES = ["guides", "links", "projects", "recipes"] as const;

function makeCollection(collectionName: typeof COLLECTION_CHOICES[number]) {
  return defineCollection({
    loader: glob({ pattern:"**/*.{md,mdx}", base: `./src/content/${collectionName}` }),
    schema: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      link: z.string().optional(),
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
