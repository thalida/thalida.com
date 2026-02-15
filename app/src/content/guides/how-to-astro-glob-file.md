---
title: "How to: Glob Files using Astro"
description: Add support for globbing files in Astro projects.
tags: ["astro"]
publishedOn: 2025-07-03
coverImage: how-to-astro-glob-file/Screenshot 2025-07-03 at 18.10.16.png
coverImageAlt: Screenshot of links section of thalida.com
category: astro
---

![how-to-astro-glob-file/Screenshot 2025-07-03 at 18.10.16.png](<how-to-astro-glob-file/Screenshot 2025-07-03 at 18.10.16.png>)


## Goal

Astro currently does not support globbing files when using the `file` collection type.
This guide provides a workaround to glob files in Astro projects, allowing you to include multiple list files
in a single collection.


I use this function to generate my [Links](/links) page, which includes multiple YAML files in a single collection.


## Solution

```ts
async function fileGlob({ filename, pattern, base }: { filename: string, pattern: string, base: string }) {
  const yamlFiles = fs.glob(pattern, { cwd: base });
  const outputDir = `${base}/dist`
  const outputPath = `${outputDir}/${filename}`;

  await fs.mkdir(outputDir, { recursive: true });

  let isFirst = true
  for await (const entry of yamlFiles) {
    const writeOrAppend = isFirst ? fs.writeFile : fs.appendFile
    await writeOrAppend(outputPath, `\n${await fs.readFile(`${base}/${entry}`, 'utf-8')}`);
    isFirst = false
  }

  return file(outputPath);
}
```

This function uses the `fs.glob` method to find files matching the specified pattern in the given base directory.
It then reads each file and appends its content to a single output file, which is then returned as a `file` collection type.
The output file is created in a `dist` directory relative to the content base directory, and the function ensures that the directory exists before writing to it.


## Usage

You can use the `fileGlob` function in your Astro project to glob files. Here's an example of how to use it:

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `string` | The name of the output file that will contain the globbed content. |
| `pattern` | `string` | The glob pattern to match files. |
| `base` | `string` | The base directory where the files are located. |

```ts
defineCollection({
  loader: await fileGlob({
    filename: "links.yaml",
    pattern: "*.yaml",
    base,
  }),
  schema: ({ image }) => z.object({
    title: z.string(),
  }),
});
```
