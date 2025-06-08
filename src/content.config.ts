// 1. Import utilities from `astro:content`
import { defineCollection, reference, z } from 'astro:content';

// 2. Import loader(s)
import { glob, file } from 'astro/loaders';

// 3. Define your collection(s)
function makeMdCollection(name: ["food", "art", "work", "links"][number]) {
  return defineCollection({
    loader: glob({ pattern:"**/*.{md,mdx}", base: `./src/content/${name}` }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      publishedOn: z.coerce.date(),
      updatedOn: z.coerce.date().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      related: z.array(reference(name)).optional(),
    }),
  });
}

const links = defineCollection({
  loader:  file("./src/content/links/links.yaml"),
  schema: z.object({
    rating: z.coerce.number().optional(),
    review: z.string().optional(),
    publishedOn: z.coerce.date(),
    updatedOn: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    related: z.array(reference("links")).optional(),
  }),
});
const food = makeMdCollection("food");
const art = makeMdCollection("art");
const work = makeMdCollection("work");

// 4. Export a single `collections` object to register your collection(s)
export const collections = { links, food, art, work };
