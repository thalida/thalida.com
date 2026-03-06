import { promises as fs } from "node:fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

export const COLLECTION_NAMES = ["projects", "guides", "gallery", "recipes", "versions", "links"] as const;

export type CollectionName = (typeof COLLECTION_NAMES)[number];

export type CardVariant = "stacked" | "link" | "compact" | "gallery";

export const collectionMeta: Record<CollectionName, { title: string; description: string; cardVariant: CardVariant }> =
  {
    projects: {
      title: "Projects",
      description: "Personal and professional projects, crafts, and experiments.",
      cardVariant: "stacked",
    },
    guides: {
      title: "Guides",
      description: "Step-by-step guides and tutorials.",
      cardVariant: "stacked",
    },
    gallery: {
      title: "Gallery",
      description: "Photography, art, and visual projects.",
      cardVariant: "gallery",
    },
    links: {
      title: "Links",
      description: "Curated resources, tools, and websites.",
      cardVariant: "link",
    },
    recipes: {
      title: "Recipes",
      description: "Favorite recipes.",
      cardVariant: "compact",
    },
    versions: {
      title: "Site Versions",
      description: "The evolution of thalida.com.",
      cardVariant: "stacked",
    },
  };

async function combineYamlFiles({ filename, pattern, base }: { filename: string; pattern: string; base: string }) {
  const yamlFiles = fs.glob(pattern, { cwd: base });
  // Write combined file outside src/content/ to avoid triggering Astro's file watcher loop
  const outputDir = `.generated`;
  const outputPath = `${outputDir}/${filename}`;

  await fs.mkdir(outputDir, { recursive: true });

  // Parse all YAML files and deduplicate by id
  const seenIds = new Set<string>();
  const allEntries: Record<string, unknown>[] = [];

  for await (const entry of yamlFiles) {
    const content = await fs.readFile(`${base}/${entry}`, "utf-8");
    const parsed = parseYaml(content) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) continue;

    for (const item of parsed) {
      const id = String(item.id ?? "");
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      allEntries.push(item);
    }
  }

  const newContent = stringifyYaml(allEntries);
  const existing = await fs.readFile(outputPath, "utf-8").catch(() => "");
  if (newContent !== existing) {
    await fs.writeFile(outputPath, newContent);
  }

  return file(outputPath);
}

async function makeCollection(collectionName: CollectionName) {
  const base = `./src/content/${collectionName}`;

  let loader;
  if (collectionName === "links") {
    loader = await combineYamlFiles({
      filename: "links.yaml",
      pattern: "*.yaml",
      base,
    });
  } else {
    loader = glob({ pattern: "**/*.{md,mdx}", base });
  }

  return defineCollection({
    loader,
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        link: z.string().optional(),
        coverImage: image().optional(),
        coverImageAlt: z.string().optional(),
        description: z.string().optional(),
        publishedOn: z.coerce.date(),
        updatedOn: z.coerce.date().optional(),
        draft: z.boolean().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        // Recipe-specific optional fields
        prepTime: z.string().optional(),
        cookTime: z.string().optional(),
        totalTime: z.string().optional(),
        recipeYield: z.string().optional(),
        recipeCuisine: z.string().optional(),
        calories: z.string().optional(),
      }),
  });
}

const collections = {} as Record<CollectionName, ReturnType<typeof defineCollection>>;
for (const name of COLLECTION_NAMES) {
  collections[name] = await makeCollection(name);
}

export { collections };
