/**
 * fix-image-refs.ts
 *
 * After migrating from flat `slug.md` files to `slug/index.md` directories,
 * image references still contain the old slug prefix. This script strips
 * that prefix so paths resolve relative to the index.md file.
 *
 * Patterns fixed:
 *   coverImage: slug/file.ext         → coverImage: ./file.ext
 *   coverImage: ./slug/file.ext       → coverImage: ./file.ext
 *   ![alt](slug/file.ext)             → ![alt](./file.ext)
 *   ![alt](./slug/file.ext)           → ![alt](./file.ext)
 *   ![alt](slug/sub/file.ext)         → ![alt](./sub/file.ext)
 *
 * Usage:
 *   npx tsx scripts/fix-image-refs.ts --dry-run   # preview changes
 *   npx tsx scripts/fix-image-refs.ts              # apply changes
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CONTENT_ROOT = path.resolve(import.meta.dirname, "../src/content");
const DRY_RUN = process.argv.includes("--dry-run");

// Find all index.md files under content
function findIndexFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findIndexFiles(fullPath));
    } else if (entry.name === "index.md") {
      results.push(fullPath);
    }
  }
  return results;
}

function fixFile(filePath: string): boolean {
  const slug = path.basename(path.dirname(filePath));
  const content = fs.readFileSync(filePath, "utf-8");
  let updated = content;

  // Escape slug for regex (handles special chars, though slugs are typically safe)
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Fix coverImage in frontmatter:
  //   coverImage: slug/file.ext       → coverImage: ./file.ext
  //   coverImage: ./slug/file.ext     → coverImage: ./file.ext
  updated = updated.replace(new RegExp(`(coverImage:\\s*)(?:\\.\\/)?(${escapedSlug})\\/`, "g"), "$1./");

  // Fix markdown image references:
  //   ![alt](slug/rest)       → ![alt](./rest)
  //   ![alt](./slug/rest)     → ![alt](./rest)
  updated = updated.replace(new RegExp(`(!\\[[^\\]]*\\]\\()(?:\\.\\/)?(${escapedSlug})\\/`, "g"), "$1./");

  if (updated !== content) {
    const rel = path.relative(CONTENT_ROOT, filePath);
    console.log(`  fixed  ${rel}`);
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, updated, "utf-8");
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\nfix-image-refs ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"}\n`);

const files = findIndexFiles(CONTENT_ROOT);
let fixedCount = 0;

for (const file of files) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\nDone. ${fixedCount} files ${DRY_RUN ? "would be" : ""} fixed out of ${files.length} total.\n`);
