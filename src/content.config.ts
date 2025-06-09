// 1. Import utilities from `astro:content`
import { defineCollection, reference, z } from 'astro:content';

// 2. Import loader(s)
import { glob, file } from 'astro/loaders';

// 3. Define your collection(s)

export const COLLECTION_CHOICES = {
  FOOD: "food",
  CRAFT: "craft",
  TECH: "tech",
  LINKS: "links",
}

export const COLLECTION_NAMES = Object.values(COLLECTION_CHOICES);

export const COLLECTION_TYPE_CHOICES = {
  MARKDOWN: "markdown",
  YAML: "yaml",
}

export const COLLECTION_TYPE_MAPPING = {
  [COLLECTION_CHOICES.FOOD]: COLLECTION_TYPE_CHOICES.MARKDOWN,
  [COLLECTION_CHOICES.CRAFT]: COLLECTION_TYPE_CHOICES.MARKDOWN,
  [COLLECTION_CHOICES.TECH]: COLLECTION_TYPE_CHOICES.MARKDOWN,
  [COLLECTION_CHOICES.LINKS]: COLLECTION_TYPE_CHOICES.YAML,
}

function makeCollection(collectionName: typeof COLLECTION_CHOICES[keyof typeof COLLECTION_CHOICES], extraSchema: z.ZodTypeAny = z.object({})) {
  // Determine the type of collection based on the mapping
  const collectionType = COLLECTION_TYPE_MAPPING[collectionName];
  if (collectionType === COLLECTION_TYPE_CHOICES.MARKDOWN) {
    return makeMarkdownCollection(collectionName, extraSchema);
  } else if (collectionType === COLLECTION_TYPE_CHOICES.YAML) {
    return makeYamlCollection(collectionName, extraSchema);
  } else {
    throw new Error(`Unknown collection type: ${collectionType}`);
  }
}

function makeMarkdownCollection(collectionName: typeof COLLECTION_CHOICES[keyof typeof COLLECTION_CHOICES], extraSchema: z.ZodTypeAny = z.object({})) {
  return defineCollection({
    loader: glob({ pattern:"**/*.{md,mdx}", base: `./src/content/${collectionName}` }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      publishedOn: z.coerce.date(),
      updatedOn: z.coerce.date().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      related: z.array(reference(collectionName)).optional(),
      ...extraSchema.shape, // Spread the extra schema properties
    }),
  });
}

function makeYamlCollection(collectionName: typeof COLLECTION_CHOICES[keyof typeof COLLECTION_CHOICES], extraSchema: z.ZodTypeAny = z.object({})) {
  return defineCollection({
    loader: file(`./src/content/${collectionName}/${collectionName}.yaml`),
    schema: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      publishedOn: z.coerce.date(),
      updatedOn: z.coerce.date().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      related: z.array(reference(collectionName)).optional(),
      ...extraSchema.shape, // Spread the extra schema properties
    }),
  });
}


// 4. Export a single `collections` object to register your collection(s)
export const collections = Object.values(COLLECTION_CHOICES).reduce((acc, collectionName) => {
  let extraSchema = z.object({});
  if (collectionName === COLLECTION_CHOICES.LINKS) {
    extraSchema = z.object({
      rating: z.coerce.number().optional(),
      review: z.string().optional(),
    });
  }

  acc[collectionName] = makeCollection(collectionName, extraSchema);
  return acc;
}, {} as Record<typeof COLLECTION_CHOICES[keyof typeof COLLECTION_CHOICES], ReturnType<typeof defineCollection>>);
