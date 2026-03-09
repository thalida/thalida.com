#!/usr/bin/env node
/**
 * Migrates plan frontmatter:
 * 1. Adds `category` based on topic→category mapping
 * 2. Merges fragmented topics
 * 3. Converts publishedOn/updatedOn from date to full ISO timestamp (from git history)
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
    const result = execSync(`git log --all --format=%aI -- "${originalPath}"`, { encoding: "utf-8" }).trim();
    if (result) return result.split("\n").pop(); // earliest commit
  } catch {
    // ignore
  }

  // Fall back to current path (for files created directly in content/plans/)
  try {
    const result = execSync(`git log --diff-filter=A --format=%aI -- "${filePath}"`, { encoding: "utf-8" }).trim();
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

      const dateStr = currentDate instanceof Date ? currentDate.toISOString() : String(currentDate);

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
