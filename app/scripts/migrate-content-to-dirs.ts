/**
 * migrate-content-to-dirs.ts
 *
 * Restructures flat content files into a filesystem hierarchy where category
 * and subcategory are encoded in the directory path.
 *
 * Before:  content/[collection]/slug.md  + content/[collection]/slug/ (assets)
 * After:   content/[collection]/[category/[subcategory/]]slug/index.md (assets alongside)
 *
 * Usage:
 *   npx tsx scripts/migrate-content-to-dirs.ts --dry-run   # preview
 *   npx tsx scripts/migrate-content-to-dirs.ts              # execute
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COLLECTIONS = ["projects", "guides", "gallery", "recipes", "versions", "plans"];

const CONTENT_ROOT = path.resolve(import.meta.dirname, "../src/content");

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  return {
    data: parseYaml(match[1]) as Record<string, unknown>,
    body: match[2],
  };
}

function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  const yaml = stringifyYaml(data).trimEnd();
  return `---\n${yaml}\n---\n${body}`;
}

// ---------------------------------------------------------------------------
// Migration logic
// ---------------------------------------------------------------------------

interface MoveAction {
  type: "move-file" | "move-assets" | "remove-dir";
  from: string;
  to: string;
}

function planMigration(): MoveAction[] {
  const actions: MoveAction[] = [];

  for (const collection of COLLECTIONS) {
    const collectionDir = path.join(CONTENT_ROOT, collection);
    if (!fs.existsSync(collectionDir)) {
      console.log(`  [skip] collection not found: ${collection}`);
      continue;
    }

    const entries = fs.readdirSync(collectionDir);
    const mdFiles = entries.filter((e) => e.endsWith(".md"));

    for (const mdFile of mdFiles) {
      const mdPath = path.join(collectionDir, mdFile);
      const slug = mdFile.replace(/\.md$/, "");
      const assetDir = path.join(collectionDir, slug);
      const hasAssets = fs.existsSync(assetDir) && fs.statSync(assetDir).isDirectory();

      // Read frontmatter
      const content = fs.readFileSync(mdPath, "utf-8");
      const { data } = parseFrontmatter(content);

      const category = data.category as string | undefined;
      const subcategory = data.subcategory as string | undefined;

      // Build target directory
      const segments: string[] = [collectionDir];
      if (category) segments.push(String(category));
      if (subcategory) segments.push(String(subcategory));
      segments.push(slug);

      const targetDir = path.join(...segments);
      const targetFile = path.join(targetDir, "index.md");

      // File move
      actions.push({ type: "move-file", from: mdPath, to: targetFile });

      // Asset move (move contents of asset dir into target dir)
      if (hasAssets) {
        actions.push({ type: "move-assets", from: assetDir, to: targetDir });
        actions.push({ type: "remove-dir", from: assetDir, to: "" });
      }
    }
  }

  return actions;
}

function rewriteFrontmatter(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const { data, body } = parseFrontmatter(content);

  let changed = false;
  if ("category" in data) {
    delete data.category;
    changed = true;
  }
  if ("subcategory" in data) {
    delete data.subcategory;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, stringifyFrontmatter(data, body), "utf-8");
  }
}

function execute(actions: MoveAction[]): void {
  const movedFiles: string[] = [];

  for (const action of actions) {
    const relFrom = path.relative(CONTENT_ROOT, action.from);
    const relTo = action.to ? path.relative(CONTENT_ROOT, action.to) : "";

    switch (action.type) {
      case "move-file": {
        console.log(`  mv  ${relFrom}  →  ${relTo}`);
        if (!DRY_RUN) {
          fs.mkdirSync(path.dirname(action.to), { recursive: true });
          fs.renameSync(action.from, action.to);
          movedFiles.push(action.to);
        }
        break;
      }
      case "move-assets": {
        console.log(`  mv  ${relFrom}/*  →  ${relTo}/`);
        if (!DRY_RUN) {
          fs.mkdirSync(action.to, { recursive: true });
          const assetEntries = fs.readdirSync(action.from);
          for (const entry of assetEntries) {
            const src = path.join(action.from, entry);
            const dst = path.join(action.to, entry);
            // If destination already exists (e.g., index.md), skip
            if (fs.existsSync(dst)) continue;
            fs.renameSync(src, dst);
          }
        }
        break;
      }
      case "remove-dir": {
        console.log(`  rm  ${relFrom}/  (empty after move)`);
        if (!DRY_RUN) {
          // Remove only if empty (safety check)
          const remaining = fs.readdirSync(action.from);
          if (remaining.length === 0) {
            fs.rmdirSync(action.from);
          } else {
            console.warn(`  [warn] dir not empty, skipping removal: ${relFrom}`);
          }
        }
        break;
      }
    }
  }

  // Rewrite frontmatter on moved files (remove category/subcategory)
  if (!DRY_RUN) {
    console.log("\nRewriting frontmatter...");
    for (const filePath of movedFiles) {
      const rel = path.relative(CONTENT_ROOT, filePath);
      console.log(`  rewrite  ${rel}`);
      rewriteFrontmatter(filePath);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\n🗂  Content migration ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"}\n`);

const actions = planMigration();
console.log(`\nPlanned ${actions.length} actions:\n`);
execute(actions);

const fileMoves = actions.filter((a) => a.type === "move-file").length;
console.log(`\nDone. ${fileMoves} files ${DRY_RUN ? "would be" : ""} migrated.\n`);
