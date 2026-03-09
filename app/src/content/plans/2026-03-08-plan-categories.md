---
title: Plan Categories & Topic Cleanup Implementation Plan
description: >-
  Add category-based filtering to the plans page, merge fragmented topics,
  migrate publishedOn to full timestamps, and delete orphaned docs/plans/.
publishedOn: 2026-03-09T01:23:35.000Z
planType: implementation
topic: plan-categories
category: content
---

# Plan Categories & Topic Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 filterable categories to the plans page, merge fragmented topics, fix sort ordering with full timestamps, and clean up orphaned files.

**Architecture:** A Node.js migration script batch-updates all plan frontmatter (category, topic, publishedOn). PlanGrid's sort already handles dates correctly — we just need real timestamps. The existing CategoryFilter component will render once plans have category values.

**Tech Stack:** Node.js script with `gray-matter` for frontmatter parsing, git log for timestamp extraction.

---

### Task 1: Write the migration script

**Files:**
- Create: `scripts/migrate-plan-frontmatter.mjs`

**Step 1: Create the script**

```js
#!/usr/bin/env node
/**
 * Migrates plan frontmatter:
 * 1. Adds `category` based on topic→category mapping
 * 2. Merges fragmented topics
 * 3. Converts publishedOn from date to full ISO timestamp (from git history)
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import matter from "gray-matter";

const PLANS_DIR = "app/src/content/plans";

// Topic → category mapping
const TOPIC_TO_CATEGORY = {
  // code-quality
  "api-code-audit": "code-quality",
  "app-code-audit": "code-quality",
  "app-audit-fixes": "code-quality",
  "code-quality-fixes": "code-quality",
  "css-audit": "code-quality",
  "codebase-cleanup": "code-quality",
  "remove-apply": "code-quality",

  // live-window
  "live-window-refactor": "live-window",
  "live-window-class-refactor": "live-window",
  "live-window-playground": "live-window",
  "public-playground": "live-window",
  "live-window-test-page": "live-window",
  "live-window-readability-audit": "live-window",
  "idle-blinds": "live-window",
  "weather-code-audit": "live-window",
  "weather-id-system": "live-window",
  "weather-visual-fixes": "live-window",
  "weather-api-proxy": "live-window",
  "sky-gradient": "live-window",
  "stars-layer": "live-window",
  "sun-moon-layers": "live-window",

  // chat
  "clientid-identity": "chat",
  "signed-client-identity": "chat",
  "chat-auto-page-context": "chat",
  "admin-help-command": "chat",
  "admin-moderation-tools": "chat",
  "idle-websocket-disconnect": "chat",

  // styling
  "color-standardization": "styling",
  "subheader-color": "styling",
  "neon-cursor": "styling",
  "card-component": "styling",
  "syntax-highlighting": "styling",
  "responsive-tailwind": "styling",
  "mobile-styles-audit": "styling",
  "mobile-styles-fix": "styling",

  // layout
  "sidebar-redesign": "layout",
  "info-panel": "layout",
  "command-palette-enhancements": "layout",
  "collection-pagination": "layout",
  "site-footer": "layout",
  "home-page-redesign": "layout",
  "home-styling": "layout",
  "spotify-player": "layout",

  // content
  "meta-seo": "content",
  "meta-card-image": "content",
  "link-metadata": "content",
  "post-url-nesting": "content",
  "markdown-plugins": "content",
  "version-post": "content",
  "plans-collection": "content",
  "plan-categories": "content",
  "dead-link-detection": "content",
  "image-audit": "content",
};

// Topic merges: old topic → new topic
const TOPIC_MERGES = {
  "app-audit-fixes": "app-code-audit",
  "code-quality-fixes": "app-code-audit",
  "mobile-styles-fix": "mobile-styles",
  "mobile-styles-audit": "mobile-styles",
  "live-window-class-refactor": "live-window-refactor",
  "public-playground": "live-window-playground",
  "signed-client-identity": "client-identity",
  "clientid-identity": "client-identity",
  "meta-card-image": "meta-seo",
  "home-styling": "home-page-redesign",
  "subheader-color": "color-standardization",
};

function getGitTimestamp(filePath) {
  const filename = filePath.split("/").pop();

  // Try the original docs/plans/ path first (files were migrated from there)
  const originalPath = `docs/plans/${filename}`;
  try {
    const result = execSync(
      `git log --all --format=%aI -- "${originalPath}"`,
      { encoding: "utf-8" }
    ).trim();
    if (result) return result.split("\n").pop(); // earliest commit
  } catch {
    // ignore
  }

  // Fall back to current path (for files created directly in content/plans/)
  try {
    const result = execSync(
      `git log --diff-filter=A --format=%aI -- "${filePath}"`,
      { encoding: "utf-8" }
    ).trim();
    if (result) return result.split("\n").pop();
  } catch {
    // ignore
  }
  return null;
}

async function main() {
  const files = (await readdir(PLANS_DIR)).filter((f) => f.endsWith(".md"));
  let updated = 0;

  for (const file of files) {
    const filePath = `${PLANS_DIR}/${file}`;
    const raw = await readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    let changed = false;

    // 1. Add category from topic
    const topic = data.topic;
    if (topic && !data.category) {
      const category = TOPIC_TO_CATEGORY[topic];
      if (category) {
        data.category = category;
        changed = true;
      } else {
        console.warn(`  WARN: no category mapping for topic "${topic}" in ${file}`);
      }
    }

    // 2. Merge topics
    if (topic && TOPIC_MERGES[topic]) {
      const newTopic = TOPIC_MERGES[topic];
      console.log(`  MERGE: ${topic} → ${newTopic} in ${file}`);
      data.topic = newTopic;
      // Update category for the new topic too
      if (TOPIC_TO_CATEGORY[newTopic]) {
        data.category = TOPIC_TO_CATEGORY[newTopic] ?? data.category;
      }
      changed = true;
    }

    // 3. Convert publishedOn and updatedOn to full ISO timestamps
    for (const field of ["publishedOn", "updatedOn"]) {
      const currentDate = data[field];
      if (!currentDate) continue;

      const dateStr =
        currentDate instanceof Date
          ? currentDate.toISOString()
          : String(currentDate);

      // If it's date-only (no time component), get git timestamp
      if (!dateStr.includes("T") || dateStr.endsWith("T00:00:00.000Z")) {
        const gitTimestamp = getGitTimestamp(filePath);
        if (gitTimestamp) {
          data[field] = new Date(gitTimestamp);
          changed = true;
        }
      }
    }

    if (changed) {
      const output = matter.stringify(content, data);
      await writeFile(filePath, output);
      updated++;
      console.log(`  UPDATED: ${file}`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${files.length} files.`);
}

main().catch(console.error);
```

**Step 2: Commit the script**

```bash
git add scripts/migrate-plan-frontmatter.mjs
git commit -m "feat: add plan frontmatter migration script"
```

---

### Task 2: Install gray-matter and run the migration

**Step 1: Install gray-matter as a dev dependency**

```bash
cd /Users/thalida/Documents/Repos/thalida.com
npm install --save-dev gray-matter
```

**Step 2: Run the migration script**

```bash
node scripts/migrate-plan-frontmatter.mjs
```

Expected: all ~97 plan files updated with `category`, merged `topic` values, and full ISO timestamps.

**Step 3: Spot-check a few files**

Verify that:
- `app/src/content/plans/2026-03-05-app-audit-fixes.md` now has `topic: "app-code-audit"` and `category: "code-quality"`
- `app/src/content/plans/2026-03-07-public-playground-design.md` now has `topic: "live-window-playground"` and `category: "live-window"`
- `app/src/content/plans/2026-03-08-plan-categories-design.md` now has `category: "content"`
- All files have full ISO timestamps in `publishedOn`

**Step 4: Commit the migrated files**

```bash
git add app/src/content/plans/
git commit -m "feat: add categories and merge topics across all plan files"
```

---

### Task 3: Delete orphaned docs/plans/ and clean up ignore files

**Files:**
- Delete: `docs/plans/` (entire directory)
- Modify: `.markdownlintignore` — remove `docs/plans/` line
- Modify: `.prettierignore` — remove `docs/plans/` line
- Delete: `scripts/migrate-plans.mjs` (the original migration script, no longer needed)

**Step 1: Delete docs/plans/**

```bash
rm -rf docs/plans/
```

**Step 2: Update .markdownlintignore**

Remove the `docs/plans/` line. File should only contain:

```
app/src/content/plans/
```

**Step 3: Update .prettierignore**

Remove the `docs/plans/` line. Keep all other entries.

**Step 4: Delete the old migration script if it exists**

```bash
rm -f scripts/migrate-plans.mjs
```

**Step 5: Commit**

```bash
git add -A docs/plans/ .markdownlintignore .prettierignore scripts/migrate-plans.mjs
git commit -m "chore: delete orphaned docs/plans/ and clean up ignore files"
```

---

### Task 4: Build and verify

**Step 1: Run the build**

```bash
just app::build
```

Expected: build succeeds with no errors.

**Step 2: Serve and check the plans page**

```bash
just app::serve
```

Verify:
- Plans page shows category filter buttons: Code Quality, Live Window, Chat, Styling, Layout, Content
- Clicking a category filters to only those topics
- Topic cards still group design + implementation plans correctly
- Plan-categories topic appears first (newest timestamp)
- Merged topics show combined plans in a single card (e.g., app-code-audit has 3+ plans)

**Step 3: Commit any fixes if needed**

---

### Task 5: Clean up migration script

**Step 1: Remove the migration script (one-time use)**

```bash
rm scripts/migrate-plan-frontmatter.mjs
git add scripts/migrate-plan-frontmatter.mjs
git commit -m "chore: remove one-time plan migration script"
```
