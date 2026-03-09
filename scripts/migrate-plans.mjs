#!/usr/bin/env node

/**
 * migrate-plans.mjs
 *
 * Migrates plan markdown files from docs/plans/ to app/src/content/plans/
 * with injected YAML frontmatter.
 *
 * Usage: node scripts/migrate-plans.mjs
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SRC_DIR = join(ROOT, "docs", "plans");
const DEST_DIR = join(ROOT, "app", "src", "content", "plans");

// ---------------------------------------------------------------------------
// Filename parsing
// ---------------------------------------------------------------------------

const DATE_PREFIX_RE = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;

/**
 * Parse a plan filename into its components.
 *
 * Examples:
 *   2026-02-20-sidebar-redesign-design.md  -> { publishedOn: "2026-02-20", topic: "sidebar-redesign", planType: "design" }
 *   2026-02-20-sidebar-redesign.md         -> { publishedOn: "2026-02-20", topic: "sidebar-redesign", planType: "implementation" }
 *   2026-02-22-home-page-redesign-implementation.md -> { publishedOn: "2026-02-22", topic: "home-page-redesign", planType: "implementation" }
 */
function parseFilename(filename) {
  const match = filename.match(DATE_PREFIX_RE);
  if (!match) return null;

  const publishedOn = match[1];
  let stem = match[2]; // everything between date and .md

  let planType = "implementation";
  if (stem.endsWith("-design")) {
    planType = "design";
    stem = stem.slice(0, -"-design".length);
  } else if (stem.endsWith("-implementation")) {
    // Strip -implementation suffix so topic is clean
    stem = stem.slice(0, -"-implementation".length);
  } else if (stem.endsWith("-plan")) {
    // Treat -plan as equivalent to -implementation
    stem = stem.slice(0, -"-plan".length);
  }

  return { publishedOn, topic: stem, planType };
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

/**
 * Extract the title from the first `# heading` in the markdown content.
 * Returns null if no heading is found.
 */
function extractTitle(content) {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Extract a description from the first non-empty paragraph after the heading.
 * Skips lines starting with: #, >, ---, ```, - , *
 *
 * Special handling for **Goal:** lines — these contain the best one-line
 * summary in many implementation plans, so we extract the text after the label.
 *
 * Returns null if no suitable paragraph is found.
 */
function extractDescription(content) {
  const lines = content.split("\n");
  let pastHeading = false;
  let inCodeBlock = false;

  for (const line of lines) {
    // Wait until we've passed the first heading
    if (!pastHeading) {
      if (/^#\s+/.test(line)) pastHeading = true;
      continue;
    }

    const trimmed = line.trim();

    // Track code blocks so we don't pick up code as description
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Skip empty lines
    if (!trimmed) continue;

    // Skip lines we should ignore
    if (/^#{1,6}\s/.test(trimmed)) continue; // headings
    if (trimmed.startsWith(">")) continue; // blockquotes
    if (trimmed.startsWith("---")) continue; // horizontal rules
    if (trimmed.startsWith("- ")) continue; // unordered list items
    if (trimmed.startsWith("* ")) continue; // unordered list items (alt)
    if (/^\d+\.\s/.test(trimmed)) continue; // ordered list items

    // **Goal:** or **Goal**: lines — extract the text after the label as description
    // Handles both **Goal:**  (colon inside bold) and **Goal**: (colon outside bold)
    const goalMatch = trimmed.match(/^\*\*Goal:?\*\*:?\s*(.+)/);
    if (goalMatch) return goalMatch[1].trim();

    // Skip other **bold-label** metadata lines (Date, Architecture, Tech Stack, etc.)
    // Handles both **Label:** (colon inside) and **Label**: (colon outside) variants
    if (/^\*\*[^*]+:?\*\*:?/.test(trimmed)) continue;

    // This is our description paragraph — take the first line
    return trimmed;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Sensitive content detection
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate potential secrets or sensitive content.
 *
 * We look for things that look like actual secret VALUES, not just
 * references to environment variable names in code examples.
 */
const SENSITIVE_PATTERNS = [
  // Actual API key values (long alphanumeric strings assigned to variables)
  { re: /sk-[a-zA-Z0-9]{20,}/, label: "OpenAI-style API key value" },
  // Bearer token with actual value
  {
    re: /Bearer\s+[a-zA-Z0-9_\-.]{20,}/,
    label: "Bearer token with actual value",
  },
  // Password or secret with a literal string value assigned
  {
    re: /(?:password|secret|credential)\s*[:=]\s*["'][^"']{8,}["']/i,
    label: "Password/secret assignment with literal value",
  },
  // Actual .env file contents (KEY=value on its own line, not in code blocks or references)
  {
    re: /^(?:OPENAI_API_KEY|SECRET_KEY|DATABASE_URL|PRIVATE_KEY)\s*=\s*\S+/m,
    label: "Possible .env secret assignment",
  },
  // Private keys
  { re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, label: "Private key" },
  // AWS-style access keys
  { re: /AKIA[0-9A-Z]{16}/, label: "AWS access key ID" },
];

/**
 * Scan content for sensitive patterns.
 * Returns an array of matched labels, or empty array if clean.
 */
function scanForSensitiveContent(content) {
  const flags = [];
  for (const { re, label } of SENSITIVE_PATTERNS) {
    if (re.test(content)) {
      flags.push(label);
    }
  }
  return flags;
}

// ---------------------------------------------------------------------------
// YAML frontmatter generation
// ---------------------------------------------------------------------------

/**
 * Escape a string for use as a YAML double-quoted value.
 * Handles titles with colons, quotes, and other special characters.
 */
function yamlQuote(str) {
  // If the string contains characters that need quoting in YAML, wrap in double quotes
  if (/[:#\[\]{}|>&*!,?'"`\\@%]/.test(str) || str.startsWith("-")) {
    // Escape backslashes and double quotes inside the string
    const escaped = str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return `"${str}"`;
}

function buildFrontmatter({ title, description, publishedOn, planType, topic }) {
  const lines = ["---"];
  lines.push(`title: ${yamlQuote(title)}`);
  if (description) {
    lines.push(`description: ${yamlQuote(description)}`);
  } else {
    lines.push(`description: ""`);
  }
  lines.push(`publishedOn: ${publishedOn}`);
  lines.push(`planType: ${yamlQuote(planType)}`);
  lines.push(`topic: ${yamlQuote(topic)}`);
  lines.push(`status: "completed"`);
  lines.push("---");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  // Ensure destination directory exists
  await mkdir(DEST_DIR, { recursive: true });

  // Read all .md files from source
  const entries = await readdir(SRC_DIR);
  const mdFiles = entries.filter((f) => f.endsWith(".md")).sort();

  console.log(`Found ${mdFiles.length} plan files in ${SRC_DIR}\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  const flaggedFiles = [];
  const parseErrors = [];

  for (const filename of mdFiles) {
    const srcPath = join(SRC_DIR, filename);
    const content = await readFile(srcPath, "utf-8");

    // 1. Parse filename
    const parsed = parseFilename(filename);
    if (!parsed) {
      parseErrors.push({ filename, reason: "Could not parse date prefix from filename" });
      skippedCount++;
      continue;
    }

    // 2. Scan for sensitive content
    const sensitiveFlags = scanForSensitiveContent(content);
    if (sensitiveFlags.length > 0) {
      flaggedFiles.push({ filename, flags: sensitiveFlags });
      skippedCount++;
      continue;
    }

    // 3. Extract title and description
    const title = extractTitle(content) || parsed.topic;
    const description = extractDescription(content);

    // 4. Build frontmatter and write output
    const frontmatter = buildFrontmatter({
      title,
      description,
      publishedOn: parsed.publishedOn,
      planType: parsed.planType,
      topic: parsed.topic,
    });

    const output = frontmatter + "\n\n" + content;
    const destPath = join(DEST_DIR, filename);
    await writeFile(destPath, output, "utf-8");
    migratedCount++;
  }

  // Report
  console.log("=".repeat(60));
  console.log(`Migration complete`);
  console.log(`  Migrated: ${migratedCount}`);
  console.log(`  Skipped:  ${skippedCount}`);
  console.log("=".repeat(60));

  if (parseErrors.length > 0) {
    console.log(`\nParse errors (${parseErrors.length}):`);
    for (const { filename, reason } of parseErrors) {
      console.log(`  - ${filename}: ${reason}`);
    }
  }

  if (flaggedFiles.length > 0) {
    console.log(`\nFlagged for manual review (${flaggedFiles.length}):`);
    for (const { filename, flags } of flaggedFiles) {
      console.log(`  - ${filename}`);
      for (const flag of flags) {
        console.log(`      Reason: ${flag}`);
      }
    }
  }

  if (flaggedFiles.length === 0 && parseErrors.length === 0) {
    console.log("\nNo files flagged or errored. All files migrated successfully.");
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
