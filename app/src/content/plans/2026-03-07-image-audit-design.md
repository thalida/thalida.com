---
title: Image Audit Design
description: >-
  Audit all image file names and alt text across the site. Fix bad/unclear file
  naming (kebab-case), add/update alt text on all images, organize meta images
  into a clear subfolder, and ensure all folder paths make sense.
publishedOn: 2026-03-07T23:08:46.000Z
subcategory: image-audit
category: content
tags: [design]
---

# Image Audit Design

## Goal

Audit all image file names and alt text across the site. Fix bad/unclear file naming (kebab-case), add/update alt text on all images, organize meta images into a clear subfolder, and ensure all folder paths make sense.

## Decisions

- **Naming convention:** kebab-case for all image files
- **Alt text approach:** View each image to write accurate, descriptive alt text
- **Scope:** Everything — all ~349 image files
- **Execution:** Section-by-section with commits after each
- **Meta images:** Move to `app/public/meta/` subfolder, keep `favicon.ico` fallback at root
- **Gallery standalone images:** Move from `images/` catch-all into individual folders per entry

## File Naming Rules

1. All filenames use kebab-case: `my-image-name.png`
2. No auto-generated names (Screenshot..., Screen_Shot..., IMG_..., IMAG...)
3. No UUIDs/hashes as names
4. No generic names (Untitled.png)
5. Names should be descriptive of the image content
6. Keep existing names that already follow convention

## Meta Images Reorganization

Move from `app/public/` root to `app/public/meta/`:

```
app/public/meta/
  favicon.ico
  favicon.svg
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png
  android-chrome-192x192.png
  android-chrome-512x512.png
  og-card-1200x630.png
  og-card-1200x630.svg
  og-card-512x512.png
  og-card-512x512.svg
```

Keep `favicon.ico` also at root as browser fallback. Update `SEO.astro` and `site.webmanifest`.

## Gallery Folder Cleanup

Move standalone gallery images from `gallery/images/` into individual folders:
- `gallery/images/neon_shapes.png` → `gallery/neon-shapes/neon-shapes.png`
- `gallery/images/dream_room.jpg` → `gallery/dream-room/dream-room.jpg`
- `gallery/images/gallery_of_phones.png` → `gallery/gallery-of-phones/gallery-of-phones.png`

Update markdown references in corresponding `.md` files.

## Alt Text Rules

1. Describe what the image shows visually, not the project concept
2. Be specific: "Screenshot of login form with email and password fields" not "Login page"
3. Include relevant details visible in the image
4. Leave already-good alt text as-is
5. For decorative images that are purely ornamental, use empty alt="" (rare in this codebase)

## Execution Order

1. **Public meta images** — folder restructure + reference updates
2. **Projects** (~40 projects) — rename files, update references, write alt text
3. **Gallery** (~6 entries) — rename files, restructure folders, write alt text
4. **Guides** (~7 entries) — rename files, update references, write alt text
5. **Versions** (~14 entries) — rename files, update references, write alt text
6. **Assets** (about images) — verify naming, check for references needing alt text

## Reference Update Checklist

For every renamed file, update:
- [ ] Frontmatter `coverImage:` field
- [ ] Markdown `![alt](src)` references
- [ ] HTML `<img src="">` references
- [ ] Any component imports or dynamic references
