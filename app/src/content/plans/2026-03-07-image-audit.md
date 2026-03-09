---
title: Image Audit Implementation Plan
description: >-
  Rename all image files to kebab-case, write descriptive alt text for every
  image (by viewing each one), reorganize meta images into a subfolder, and
  clean up gallery folder structure.
publishedOn: 2026-03-07T23:08:46.000Z
subcategory: image-audit
category: content
tags: [implementation]
---

# Image Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename all image files to kebab-case, write descriptive alt text for every image (by viewing each one), reorganize meta images into a subfolder, and clean up gallery folder structure.

**Architecture:** Section-by-section audit with commits after each section. For every image: view it with the Read tool, rename file with `git mv`, update all references in markdown/code, and write descriptive alt text based on what the image actually shows.

**Tech Stack:** Astro content collections, markdown, git

**IMPORTANT:** For every image, you MUST use the Read tool to view the image file before writing alt text. Describe what you actually see, not what the project is about.

---

### Task 1: Meta Images Folder Restructure

**Files:**
- Create: `app/public/meta/` directory
- Move: all favicon/OG files from `app/public/` to `app/public/meta/`
- Modify: `app/src/components/SEO/SEO.astro`
- Modify: `app/public/site.webmanifest`

**Step 1: Create meta directory and move files**

```bash
mkdir -p app/public/meta
git mv app/public/favicon.svg app/public/meta/favicon.svg
git mv app/public/favicon-16x16.png app/public/meta/favicon-16x16.png
git mv app/public/favicon-32x32.png app/public/meta/favicon-32x32.png
git mv app/public/apple-touch-icon.png app/public/meta/apple-touch-icon.png
git mv app/public/android-chrome-192x192.png app/public/meta/android-chrome-192x192.png
git mv app/public/android-chrome-512x512.png app/public/meta/android-chrome-512x512.png
# Rename card files to og-card prefix
git mv app/public/card-1200x630.png app/public/meta/og-card-1200x630.png
git mv app/public/card-1200x630.svg app/public/meta/og-card-1200x630.svg
git mv app/public/card-512x512.png app/public/meta/og-card-512x512.png
git mv app/public/card-512x512.svg app/public/meta/og-card-512x512.svg
# Copy favicon.ico to meta AND keep at root as fallback
cp app/public/favicon.ico app/public/meta/favicon.ico
```

**Step 2: Update SEO.astro references**

In `app/src/components/SEO/SEO.astro`, update:
- Line 32: `${siteUrl}/card-1200x630.png` → `${siteUrl}/meta/og-card-1200x630.png`
- Line 66: `/favicon.ico` → `/favicon.ico` (keep as root fallback)
- Line 67: `/favicon.svg` → `/meta/favicon.svg`
- Line 68: `/apple-touch-icon.png` → `/meta/apple-touch-icon.png`

**Step 3: Update site.webmanifest**

In `app/public/site.webmanifest`, update icon paths:
- `/android-chrome-192x192.png` → `/meta/android-chrome-192x192.png`
- `/android-chrome-512x512.png` → `/meta/android-chrome-512x512.png`

**Step 4: Commit**

```bash
git add app/public/meta/ app/public/favicon.ico app/src/components/SEO/SEO.astro app/public/site.webmanifest
git commit -m "chore: move meta images to /meta/ subfolder"
```

---

### Task 2: Projects A-C (advent-of-code, ao3-sync, bitly-roulette, builders-guide, ciphers-codes, code-city)

**Files:** All `.md` and image files in `app/src/content/projects/` for these 6 projects.

For each project below: **view every image with the Read tool**, then rename the file and write alt text.

#### advent-of-code
- `Screen_Shot_2022-02-19_at_18.29.31.png` → view, rename to descriptive kebab-case, update coverImage + 1 markdown ref
- `Screen_Shot_2022-02-19_at_18.30.29.png` → view, rename, update 1 markdown ref
- `Screen_Shot_2022-02-19_at_18.32.20.png` → view, rename, update 1 markdown ref
- Fix all markdown alt text (currently just filenames)
- Fix coverImageAlt if needed after viewing

#### ao3-sync
- `Screenshot 2025-07-03 at 00.51.28.png` → view, rename, update coverImage + 1 markdown ref (note: markdown uses angle bracket syntax)
- Fix coverImageAlt ("AO3 Screenshot" is too vague)

#### bitly-roulette
- `Screen_Shot_2022-02-19_at_18.53.19.png` → view, rename, update coverImage + 1 markdown ref

#### builders-guide
- `Screen_Shot_2022-02-19_at_19.08.28.png` → view, rename, update coverImage + 1 markdown ref
- `Paper.2020.me.58.png` through `Paper.2020.me.68.png` (11 files) → view each, rename to descriptive names, update markdown table refs
- `Splash.png` → view, rename to kebab-case
- `Items_Empty.png` → view, rename to kebab-case
- `Recipe_Tree_Collpased.png` → view, rename to kebab-case (fix typo: "Collpased")
- `Shopping_List.png` → view, rename to kebab-case
- Fix all markdown alt text

#### ciphers-codes
- `Screen_Shot_2022-02-19_at_19.57.46.png` + 10 more Screen_Shot files → view each, rename, update refs
- `cipers_v3.png` → view, rename (fix typo: "cipers")
- `Desktop.png` → view, rename to descriptive kebab-case
- `ciphers.png` → view, consider rename
- `ciphers_logo.png` → rename to `ciphers-logo.png`
- Fix all markdown alt text

#### code-city
- `Untitled.png` → view, rename to descriptive name
- `Paper.2020.me.52.png` → view, rename
- `Paper.codecity.14.png` → view, rename
- `Paper.codecity.18.png` → view, rename
- Fix markdown alt text (currently "Untitled")

**Step: Commit after all 6 projects**
```bash
git add app/src/content/projects/advent-of-code/ app/src/content/projects/ao3-sync/ app/src/content/projects/bitly-roulette/ app/src/content/projects/builders-guide/ app/src/content/projects/ciphers-codes/ app/src/content/projects/code-city/
git commit -m "chore: rename images and fix alt text for projects A-C"
```

---

### Task 3: Projects D-H (devscript, divider-wall, fiary, grindless, homer-bathroom)

#### devscript
- `themes-split.png` → already decent name, keep. View and fix markdown alt ("devscript-theme-screenshot" → descriptive)

#### divider-wall
- `IMG_2706.jpeg` → view, rename, update coverImage + markdown ref
- `IMG_2265.jpeg` → view, rename, update markdown ref
- Fix markdown alt text (currently filenames)

#### fiary
- `Screenshot 2025-07-02 at 20.55.45.png` → view, rename, update coverImage + markdown ref (uses %20 encoding)
- `Paper.fiary.1.png`, `Paper.fiary.4.png`, `Paper.fiary.5.png`, `Paper.fiary.7.png`, `Paper.fiary.8.png` → view each, rename, update refs
- Fix all markdown alt text

#### grindless
- `d0fe9f07-b737-4067-85ff-0dee6ba08ffa-profile_banner-480.png` → view, rename, update coverImage + markdown ref

#### homer-bathroom
- `IMG_2806~2.jpg` → view, rename, update coverImage ref
- `IMG_2806.jpeg` → view, rename, update markdown ref
- `IMG_2807.jpeg` → view, rename
- Note: markdown references `IMG_2813.GIF` which may not exist — check and fix broken ref
- Also check `app/public/content/projects/homer-bathroom/` for any images there

**Step: Commit**
```bash
git add app/src/content/projects/devscript/ app/src/content/projects/divider-wall/ app/src/content/projects/fiary/ app/src/content/projects/grindless/ app/src/content/projects/homer-bathroom/
git commit -m "chore: rename images and fix alt text for projects D-H"
```

---

### Task 4: Projects I-M (is-trump-still-president, laser-cut-signs, listany, live-window, live-window-image-generator, makerfold, mapdo, maybe-social, mynn)

#### is-trump-still-president
- `Screen_Shot_2022-02-20_at_21.48.02.png` → view, rename, update coverImage + markdown ref

#### laser-cut-signs
- `IMG_3319.png`, `IMG_2761.png`, `IMG_2762.png`, `IMG_2763.png` → view each, rename, update refs
- Fix coverImageAlt ("Laser cut sign" is too vague)

#### listany
- `Untitled.png` → view, rename, update coverImage + markdown ref
- `Paper.2020.me.135.png` through `Paper.2020.me.165.png` (24 files) → view each, rename, update table refs
- `Screenshot 2025-07-02 at 21.02.11.png` → view, rename
- `Home.png` → view, rename to kebab-case descriptive
- `Black.png` → view, rename to kebab-case descriptive
- Fix all markdown alt text (currently "Untitled" and filenames)

#### live-window
- `cover.png` → already good name. View and verify alt text is accurate.
- Check `app/public/content/projects/live-window/cover.png` — same image?
- Alt text already good in both coverImageAlt and HTML img tag

#### live-window-image-generator
- `Screenshot 2025-07-02 at 22.04.40.png` → view, rename, update coverImage + markdown ref
- **IMPORTANT:** Fix 4 empty-alt `<img>` tags in the markdown (lines 22, 37-39). These are external API URLs — add alt text describing what each shows.

#### makerfold
- `makefold.png` → view, consider rename (typo: "makefold" vs "makerfold")
- `makefold2.png` → view, rename
- `All_Large_Icons.png` → rename to `all-large-icons.png`, view, add alt
- `Maker__Fold.png` → rename to `maker-fold-logo.png` (or similar), view, add alt

#### mapdo
- `Untitled.png` → view, rename
- `Screen_Shot_2022-02-19_at_21.08.37.png` → view, rename
- `Dribbble_HD.png` → rename to `dribbble-hd.png`, view, add alt
- `Dribbble_HD2.png` → rename to `dribbble-hd-2.png`, view, add alt
- `Loading.png` → rename to `loading.png`, view, add alt
- Fix coverImageAlt (currently describes the project concept, not the image)

#### maybe-social
- `Screen_Shot_2022-02-20_at_20.08.10.png` → view, rename, update coverImage + markdown ref
- `Landing.png` → rename to `landing.png`, view, add alt
- `Image_post.png` → rename to `image-post.png`, view, add alt
- `List.png` → rename to `list.png`, view, add alt
- `View_-_Teddy_Bear.png` → rename to `view-teddy-bear.png`, view, add alt

#### mynn
- `Screenshot 2025-07-02 at 21.32.09.png` → view, rename, update coverImage + markdown ref (angle bracket syntax)
- `Screenshot 2025-07-02 at 21.32.31.png` → view, rename, update markdown ref
- `Screenshot 2025-07-02 at 21.33.09.png` → view, rename, update markdown ref

**Step: Commit**
```bash
git add app/src/content/projects/is-trump-still-president/ app/src/content/projects/laser-cut-signs/ app/src/content/projects/listany/ app/src/content/projects/live-window/ app/src/content/projects/live-window-image-generator/ app/src/content/projects/makerfold/ app/src/content/projects/mapdo/ app/src/content/projects/maybe-social/ app/src/content/projects/mynn/
git commit -m "chore: rename images and fix alt text for projects I-M"
```

---

### Task 5: Projects N-S (napkinnotes, open-api-docs-viewer, revibed, shapeconnector, statusboard)

#### napkinnotes
- `316388682-7c94cbc2-1702-42b5-a7e1-b8e5fbdedb75.gif` → view, rename to descriptive name, update coverImage
- Fix markdown alt ("napkin-notes" → descriptive based on image content)
- Note: markdown inline image uses external GitHub URL, not local file — update alt text there too

#### open-api-docs-viewer
- `theme-elements-dark-large.png` → already good name. View and verify alt.
- Fix markdown alt ("Overview" → more descriptive)
- Note: all inline images use external GitHub URLs — update alt text on those `<img>` tags (already have decent alt but verify)

#### revibed
- `Tablet.png` → rename to `tablet.png`, view, add alt
- `Paper.revibed.3.png` → view, rename
- `Paper.revibed.4.png` → view, rename
- Fix coverImageAlt (currently describes project, not image)

#### shapeconnector
- `shapeconnector_teaser2.png` → rename to `shapeconnector-teaser.png`, view, add alt
- `gameplay.gif` → already good name. View, add alt.
- `Freeplay.png` → rename to `freeplay.png`, view, add alt
- `Freeplay_Finished.png` → rename to `freeplay-finished.png`, view, add alt
- `Freeplay_Moved_too_many.png` → rename to `freeplay-moved-too-many.png`, view, add alt
- `Freeplay_Moved.png` → rename to `freeplay-moved.png`, view, add alt

#### statusboard
- `Screenshot 2025-07-02 at 22.17.00.png` → view, rename, update coverImage + markdown ref
- `Screen_ Dashboard.png` → view, rename (note space after underscore)
- `Screen_ Activity.png` → view, rename
- `Screen_ Issues.png` → view, rename
- `Screen_ Login.png` → view, rename
- `Screenshot 2025-07-02 at 22.14.18.png` → view, rename
- `Screenshot 2025-07-02 at 22.14.26.png` → view, rename

**Step: Commit**
```bash
git add app/src/content/projects/napkinnotes/ app/src/content/projects/open-api-docs-viewer/ app/src/content/projects/revibed/ app/src/content/projects/shapeconnector/ app/src/content/projects/statusboard/
git commit -m "chore: rename images and fix alt text for projects N-S"
```

---

### Task 6: Projects T-Z (thisisalsome, tictactoe-cubed, timezone, tourus-y3-coasters, trailblazer, unpack-link, wordbird)

#### thisisalsome
- `Screen_Shot_2022-02-20_at_18.06.51.png` → view, rename, update coverImage + markdown refs
- `Screen_Shot_2022-02-20_at_18.13.38.png` → view, rename
- `Screen_Shot_2022-02-20_at_18.12.36.png` → view, rename

#### tictactoe-cubed
- `Screen_Shot_2022-02-20_at_16.55.40.png` → view, rename, update coverImage + markdown ref
- `Screen_Shot_2022-02-20_at_16.55.40 1.png` → view, rename (note space before 1)
- `Screen_Shot_2022-02-20_at_16.58.57.png` → view, rename

#### timezone
- `Screen_Shot_2022-02-20_at_21.33.03.png` → view, rename, update coverImage + markdown ref

#### tourus-y3-coasters
- `IMG_7725.jpeg` → view, rename, update coverImage + markdown ref
- Fix coverImageAlt ("Tourus Year 3 Coasters" — just the name, not descriptive of image)

#### trailblazer
- `Paper.2020.me.20.png` → view, rename, update coverImage + markdown ref
- `Paper.2020.me.12.png` through `Paper.2020.me.27.png` (12 more files) → view each, rename, update refs
- Fix coverImageAlt (currently describes project, not image)

#### unpack-link
- `Screen_Shot_2019-07-14_at_6.10.06_PM.png` → view, rename, update coverImage + markdown ref
- `nested_tweets_try4_shorter.gif` → rename to `nested-tweets.gif`, view, add alt
- `ex_1.gif` through `ex_4.gif` → rename to `example-1.gif` through `example-4.gif`, view, add alt
- `Home_-_Dark_Gray.png` → rename to `home-dark-gray.png`, view, add alt
- `Results.png` → rename to `results.png`, view, add alt

#### wordbird
- `Untitled.png` → view, rename to descriptive name, update coverImage + markdown ref
- Fix markdown alt (currently "Untitled")

**Step: Commit**
```bash
git add app/src/content/projects/thisisalsome/ app/src/content/projects/tictactoe-cubed/ app/src/content/projects/timezone/ app/src/content/projects/tourus-y3-coasters/ app/src/content/projects/trailblazer/ app/src/content/projects/unpack-link/ app/src/content/projects/wordbird/
git commit -m "chore: rename images and fix alt text for projects T-Z"
```

---

### Task 7: Projects in public/content (fiary, homer-bathroom, live-window, tourus-y3-coasters)

Check `app/public/content/projects/` for images that need renaming to match the src/content renames done in Tasks 2-6.

**Files:**
- `app/public/content/projects/fiary/` — check for images, rename to match
- `app/public/content/projects/homer-bathroom/` — check for images, rename to match
- `app/public/content/projects/live-window/cover.png` — already good
- `app/public/content/projects/tourus-y3-coasters/` — check for images, rename to match

**Step: Commit**
```bash
git add app/public/content/projects/
git commit -m "chore: rename public content project images to match src renames"
```

---

### Task 8: Gallery — Folder Restructure and Image Audit

**Files:**
- Move: `app/src/content/gallery/images/` contents into individual folders
- Rename: all gallery image files to kebab-case
- Modify: all gallery `.md` files

#### Standalone gallery entries (move from images/ to individual folders)

```bash
mkdir -p app/src/content/gallery/neon-shapes
git mv "app/src/content/gallery/images/neon_shapes.png" "app/src/content/gallery/neon-shapes/neon-shapes.png"

mkdir -p app/src/content/gallery/dream-room
git mv "app/src/content/gallery/images/dream_room.jpg" "app/src/content/gallery/dream-room/dream-room.jpg"

mkdir -p app/src/content/gallery/gallery-of-phones
git mv "app/src/content/gallery/images/gallery_of_phones.png" "app/src/content/gallery/gallery-of-phones/gallery-of-phones.png"

# Remove empty images/ directory
rmdir app/src/content/gallery/images/
```

Update markdown refs in `neon_shapes.md`, `dream_room.md`, `gallery_of_phones.md`:
- `./images/neon_shapes.png` → `neon-shapes/neon-shapes.png`
- `./images/dream_room.jpg` → `dream-room/dream-room.jpg`
- `./images/gallery_of_phones.png` → `gallery-of-phones/gallery-of-phones.png`

Also rename the .md files themselves if snake_case:
- `neon_shapes.md` → `neon-shapes.md`
- `dream_room.md` → `dream-room.md`
- `gallery_of_phones.md` → `gallery-of-phones.md`

**IMPORTANT:** Check if renaming .md files affects Astro content collection slugs. If the slug is derived from the filename, this changes URLs. Read the Astro content config first. If slugs are explicit in frontmatter, renaming is safe. If not, add explicit slugs before renaming.

#### hudsonvalley
- `IMAG1094.jpg` → view, rename, update coverImage + markdown ref
- `1020181159_HDR~2.jpg` → view, rename
- `PXL_20250624_003031438.jpg` → view, rename
- Also check `app/public/content/gallery/hudsonvalley/` for images

#### iceland
- `iceland_photo.jpg` → rename to `iceland-photo.jpg`, view, add alt
- `iceland_layered_sketch.jpg` → rename to `iceland-layered-sketch.jpg`, view
- `IMG_20190830_140351.jpg` → view, rename
- `IMG_20190830_140953.jpg` → view, rename

#### stockphotos
- 27 files with Flickr hash names (e.g., `25677324952_36b5b13289_o.jpg`) → view each, rename to descriptive kebab-case
- Fix coverImageAlt (already good: "Thalida sitting reading a python book")
- Fix all markdown alt text (currently all "Stock Photo")

#### zion
- `zion.jpg` → already good. View, verify alt.
- `zion-2.jpg` → already good. View, add alt.
- `IMG_20160905_112309696_HDR.jpg` → view, rename
- `IMG_20160905_120545187_HDR.jpg` → view, rename
- `Untitled_Artwork.png` → view, rename to descriptive name

#### View all standalone gallery images and fix alt text
- `neon-shapes.png` → fix coverImageAlt ("Illustration" → descriptive)
- `dream-room.jpg` → fix markdown alt ("DreamRoom" → descriptive), fix coverImageAlt
- `gallery-of-phones.png` → fix coverImageAlt ("Illustration" → descriptive)

**Step: Commit**
```bash
git add app/src/content/gallery/
git commit -m "chore: restructure gallery folders, rename images, fix alt text"
```

---

### Task 9: Guides — Image Rename and Alt Text

**Files:** All guide `.md` files and their image directories in `app/src/content/guides/`.

#### custom-django-admin-add-template
- `Screenshot 2025-07-02 at 17.42.10.png` → view, rename, update coverImage
- Fix coverImageAlt ("Custom Django Admin Add Template" → descriptive of what's shown)

#### custom-django-unfold-admin-dashboard
- `Screenshot_2023-11-12_at_00.13.08.png` → view, rename, update coverImage + markdown ref
- Fix markdown alt ("Screenshot 2023-11-12 at 00.13.08.png" → descriptive)

#### design-trends
- `628F8A28-14EB-4319-A350-14674058490D.jpeg` → view, rename, update coverImage + markdown ref
- `5DB19519-EEB8-4ADB-BB7E-6802E0A1B0E6.jpeg` → view, rename, update markdown ref
- `3BB80C54-C2F0-4EBB-9A75-72A960B248FC.jpeg` → view, rename, update markdown ref
- Fix all alt text (currently UUID filenames)

#### django-react-native-auth
- `Screenshot_2023-11-11_at_13.22.17.png` → view, rename
- `Screenshot_2023-11-11_at_13.36.11.png` → view, rename
- `Screenshot_2023-11-11_at_13.37.21.png` → view, rename
- `Screenshot_2023-11-11_at_13.44.41.png` → view, rename
- `Screenshot_2023-11-11_at_13.58.10.png` → view, rename
- `Screenshot_2023-11-11_at_13.58.47.png` → view, rename
- Fix alt text (some already decent like "App Registration > New Application", others are filenames)

#### how-to-astro-glob-file
- `Screenshot 2025-07-03 at 18.10.16.png` → view, rename, update coverImage + markdown ref
- Fix markdown alt (currently the full file path)

#### knowledge-base-brain-dump
- `pexels-eye4dtail-122308.jpg` → rename to descriptive kebab-case (it's a Pexels stock photo), view
- `pexels-ann-h-45017-592677.jpg` → rename to descriptive kebab-case, view (may be unreferenced — check)
- Alt text already decent ("Assorted rubber ducks")

#### knowledge-base-django-generic-fields
- `Screenshot 2025-07-02 at 17.43.24.png` → view, rename, update coverImage
- Fix coverImageAlt ("Django Generic Fields" → descriptive of what's shown)

**Step: Commit**
```bash
git add app/src/content/guides/
git commit -m "chore: rename guide images and fix alt text"
```

---

### Task 10: Versions 2007-2017 — Image Rename and Alt Text

**Files:** All version `.md` files and their image directories for 2007-2017 entries.

#### 2007-the-lost-era
- `Screenshot 2025-07-02 at 13.56.39.png` → view, rename, update coverImage + 2 markdown refs

#### 2012-brown-minimal
- `Untitled.png`, `Untitled 1.png`, `Untitled 2.png` → view each, rename to descriptive names
- `mock.1.png`, `mock.2.png` → rename to `mockup-1.png`, `mockup-2.png` (or more descriptive)
- `screenshot.png` → keep or rename if more descriptive name warranted
- Fix markdown alt (currently all "Untitled")

#### 2013-1-flat-cards
- `Untitled.png` through `Untitled 4.png` (5 files) → view each, rename
- `mock.1.png` through `mock.4.png` → rename to `mockup-1.png` etc.
- `screenshot.png` → keep or rename
- Fix markdown alt (currently all "Untitled")

#### 2013-2-flat-live
- `Untitled.png` through `Untitled 9.png` (10 files) → view each, rename
- `concept.0.png` through `concept.5.png` → rename to `concept-0.png` etc.
- `mock.1.png` through `mock.6.png` → rename to `mockup-1.png` etc.
- `screenshot.png` → keep or rename
- Fix markdown alt (currently all "Untitled")

#### 2014-fullscreen-lowpoly
- `Untitled.png` through `Untitled 3.png` → view each, rename
- `mock.1.png` through `mock.4.png` → rename
- `screenshot.png` → keep or rename

#### 2015-magic-floating-card
- `Untitled.png` → view, rename
- `mock.1.png` → already has good alt ("Floating card mockup")
- `screenshot.png` → keep or rename

#### 2016-color-split
- `Untitled.png` → view, rename
- `mock.1.png`, `mock.2.png` → rename
- `screenshot.png` → keep or rename

#### 2017-1-lowpoly-space
- `Untitled.png` → view, rename
- `mock.1.png`, `mock.2.png` → rename
- `screenshot.png` → keep or rename

#### 2017-2-shape-clock
- `Untitled.png` → view, rename
- `mock.1.png` → rename
- `screenshot.png` → keep or rename

**Step: Commit**
```bash
git add app/src/content/versions/2007-the-lost-era/ app/src/content/versions/2012-brown-minimal/ app/src/content/versions/2013-1-flat-cards/ app/src/content/versions/2013-2-flat-live/ app/src/content/versions/2014-fullscreen-lowpoly/ app/src/content/versions/2015-magic-floating-card/ app/src/content/versions/2016-color-split/ app/src/content/versions/2017-1-lowpoly-space/ app/src/content/versions/2017-2-shape-clock/
git commit -m "chore: rename version images 2007-2017 and fix alt text"
```

---

### Task 11: Versions 2018-2026 — Image Rename and Alt Text

#### 2018-1-space-calendar
- `Untitled.png` → view, rename
- `mock.1.png` through `mock.3.png` → rename
- `screenshot.png` → keep or rename

#### 2018-2-illustrated-window
- `Untitled.png` → view, rename
- Weather GIFs (`cloudy.gif`, `fog.gif`, `rain.gif`, `snow.gif`, `wind.gif`) → already good names, view and verify alt
- `mock.1.png` through `mock.4.png` → rename
- `sketch.1.jpg` through `sketch.3.jpg` → rename to `sketch-1.jpg` etc.

#### 2022-super-window
- `Screen_Shot_2022-07-31_at_15.28.17.png` → view, rename, update coverImage + markdown ref
- `Paper.2020.me.74.png` through `Paper.2020.me.84.png` (8 files) → view each, rename
- `theme-toggle.gif` → already good name, view, add alt

#### 2025-astro-animated
- `Screenshot 2025-07-02 at 11.44.06.png` → view, rename, update coverImage
- `Screenshot 2025-07-03 at 16.48.24.png` → view, rename, update markdown refs
- `Screenshot 2025-07-03 at 16.52.55.png` → view, rename
- `Screenshot 2025-07-03 at 16.53.46.png` → view, rename, update markdown ref
- `Screenshot 2025-07-03 at 16.57.15.png` → view, rename
- `weather.gif`, `weather-digital.gif` → already good names
- Inspo images (6 screenshots in `inspo/`) → view each, rename
- Also rename public copies: `app/public/content/versions/2025-astro-animated/weather.gif` and `weather-digital.gif` if they match

#### 2026-neon-playground
- `cover.png` → already good name, verify alt text
- `chat.png` → already good name, verify alt text
- `live-window.png` → already good name, verify alt text
- Also check `app/public/content/versions/2026-neon-playground/chat.png`

**Step: Commit**
```bash
git add app/src/content/versions/2018-1-space-calendar/ app/src/content/versions/2018-2-illustrated-window/ app/src/content/versions/2022-super-window/ app/src/content/versions/2025-astro-animated/ app/src/content/versions/2026-neon-playground/ app/public/content/versions/
git commit -m "chore: rename version images 2018-2026 and fix alt text"
```

---

### Task 12: Assets and Cursor SVGs

**Files:**
- `app/src/assets/about/` — verify naming
- `app/public/cursors/` — view and verify naming

#### About assets
- `me-avatar.png` → already kebab-case, good
- `me-headshot.png` → already kebab-case, good
- `me-memoji.png` → already kebab-case, good
- `me-rainbow.png` → already kebab-case, good
- Check if these have alt text where used (search for references in .astro components)

#### Cursor SVGs
- View each cursor SVG in `app/public/cursors/`
- Verify all names are kebab-case
- Cursors are decorative/functional, not content images — they don't need alt text

**Step: Commit (only if changes needed)**

---

### Task 13: Build Verification

**Step 1: Run the build**

```bash
just app::build
```

Expected: Build succeeds with no broken image references.

**Step 2: Check for broken references**

Search for any remaining non-kebab-case image references:
```bash
grep -rn "Screen_Shot\|Screenshot 20\|Paper\.20\|IMG_\|IMAG\|Untitled\." app/src/content/ --include="*.md"
```

Expected: No matches (all references updated).

**Step 3: Check for orphaned images**

Look for image files that aren't referenced anywhere. These can be cleaned up or flagged.

**Step 4: Update TODO.md**

Mark the `audit all image names and alt tags` item as complete in `TODO.md`.

**Step 5: Final commit**

```bash
git add TODO.md
git commit -m "chore: mark image audit complete in TODO"
```

---

## Notes for the Implementing Agent

1. **Always view images before writing alt text.** Use the Read tool on image files — it will display them visually. Write alt text based on what you actually see.

2. **When renaming files with `git mv`**, be careful with spaces and special characters in filenames. Use quotes around paths.

3. **Update ALL references** for each rename — check frontmatter `coverImage`, `coverImageAlt`, markdown `![alt](src)`, HTML `<img src="" alt="">`, and any public/ copies.

4. **Markdown table image references** use a different syntax — some images are in `| col | col |` table cells. Make sure to update those too.

5. **Angle bracket syntax** — some markdown refs use `![alt](<path with spaces>)`. After renaming to kebab-case (no spaces), you can drop the angle brackets.

6. **External URLs** (GitHub raw content) — don't rename those, just fix alt text.

7. **`app/public/content/`** images are referenced with absolute paths starting with `/content/...`. Make sure to update those paths if you rename the files.

8. **Content collection slugs** — if gallery .md files are renamed (snake_case → kebab-case), verify this doesn't break URL routing. Add explicit `slug:` frontmatter if needed.
