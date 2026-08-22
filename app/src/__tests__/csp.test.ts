import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Production ships a strict Content-Security-Policy from `public/_headers`, but
 * `astro dev` serves no CSP at all. That gap let three posts hot-link images from
 * hosts the policy blocks: they rendered fine locally and silently failed in
 * production.
 *
 * These tests close the gap by checking every external resource URL we author —
 * in content markdown and in templates — against the real policy file.
 */

// vitest runs with the app package as its root.
const APP_DIR = process.cwd();
const HEADERS_FILE = join(APP_DIR, "public", "_headers");

/** Origin that `'self'` resolves to in production (`site` in astro.config.mjs). */
const SITE_ORIGIN = "https://thalida.com";

/**
 * Host that `rehype-r2-media` rewrites every `/content/...` path to. Must stay in
 * sync with the `PUBLIC_R2_BASE_URL` Cloudflare Pages variable.
 */
const R2_MEDIA_ORIGIN = "https://media.thalida.com";

/** CSP directive(s) that govern each element's `src`. */
const SRC_DIRECTIVES: Record<string, string[]> = {
  img: ["img-src"],
  script: ["script-src"],
  iframe: ["frame-src"],
  frame: ["frame-src"],
  video: ["media-src"],
  audio: ["media-src"],
  track: ["media-src"],
  // <source> is img-src inside <picture> and media-src inside <video>/<audio>;
  // without parsing the parent, accept either.
  source: ["img-src", "media-src"],
};

type Reference = { url: string; directives: string[]; file: string };

// ─── CSP parsing ──────────────────────────────────────────────────────

function parsePolicy(headersText: string): Map<string, string[]> {
  const line = headersText.split("\n").find((l) => l.trim().startsWith("Content-Security-Policy:"));
  if (!line) throw new Error(`No Content-Security-Policy found in ${HEADERS_FILE}`);

  const directives = new Map<string, string[]>();
  for (const chunk of line.trim().slice("Content-Security-Policy:".length).split(";")) {
    const [name, ...sources] = chunk.trim().split(/\s+/).filter(Boolean);
    if (name) directives.set(name, sources);
  }
  return directives;
}

/**
 * Whether a single CSP source expression permits a URL. Covers the subset this
 * policy uses: `'self'`, `'none'`, scheme sources (`data:`), and host sources
 * with an optional scheme and an optional `*.` subdomain wildcard.
 */
function sourceAllows(source: string, url: URL): boolean {
  if (source === "'none'") return false;
  if (source === "'self'") return url.origin === SITE_ORIGIN;
  if (source.startsWith("'")) return false; // 'unsafe-inline', nonces, hashes — not host matches
  if (/^[a-z][a-z0-9+.-]*:$/i.test(source)) return source.toLowerCase() === url.protocol;

  const match = /^(?:([a-z][a-z0-9+.-]*):\/\/)?([^/:]+)/i.exec(source);
  if (!match) return false;
  const [, scheme, host] = match;

  if (scheme && `${scheme.toLowerCase()}:` !== url.protocol) return false;
  if (host === "*") return true;
  if (host.startsWith("*.")) return url.hostname.endsWith(host.slice(1));
  return url.hostname === host.toLowerCase();
}

/** Fetch directives fall back to `default-src` when not explicitly listed. */
function isAllowed(policy: Map<string, string[]>, directive: string, url: URL): boolean {
  const sources = policy.get(directive) ?? policy.get("default-src");
  if (!sources) return true;
  return sources.some((source) => sourceAllows(source, url));
}

function allowedByAny(policy: Map<string, string[]>, directives: string[], url: URL): boolean {
  return directives.some((directive) => isAllowed(policy, directive, url));
}

// ─── Source scanning ──────────────────────────────────────────────────

function walk(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path, extensions));
    else if (extensions.some((ext) => entry.endsWith(ext))) files.push(path);
  }
  return files;
}

/**
 * Drop fenced code blocks and inline code. Markdown posts document HTML snippets
 * containing URLs that are never fetched — those must not count as references.
 */
function stripCode(markdown: string): string {
  const kept: string[] = [];
  let fence: string | null = null;

  for (const line of markdown.split("\n")) {
    const opener = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (opener && line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (opener) {
      fence = opener[1];
      continue;
    }
    kept.push(line);
  }

  return kept.join("\n").replace(/`[^`\n]*`/g, "");
}

/** Absolute http(s) URLs only — relative paths are same-origin by construction. */
function collectFrom(source: string, file: string): Reference[] {
  const refs: Reference[] = [];

  const add = (url: string | undefined, directives: string[]) => {
    if (url && /^https?:\/\//i.test(url)) refs.push({ url, directives, file });
  };

  // Markdown image syntax: ![alt](url "title")
  for (const [, url] of source.matchAll(/!\[[^\]]*\]\(\s*<?([^\s)>]+)>?/g)) {
    add(url, ["img-src"]);
  }

  // Elements loaded via src=
  const tags = Object.keys(SRC_DIRECTIVES).join("|");
  for (const [, tag, url] of source.matchAll(new RegExp(`<(${tags})\\b[^>]*?\\ssrc=["']([^"']+)["']`, "gi"))) {
    add(url, SRC_DIRECTIVES[tag.toLowerCase()]);
  }

  // <video poster>
  for (const [, url] of source.matchAll(/<video\b[^>]*?\sposter=["']([^"']+)["']/gi)) {
    add(url, ["img-src"]);
  }

  // <link rel="stylesheet"> — other rel values (preconnect, icon) are not fetches
  // governed by a fetch directive, or resolve same-origin.
  for (const [tag] of source.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\srel=["'][^"']*\bstylesheet\b/i.test(tag)) continue;
    add(/\shref=["']([^"']+)["']/i.exec(tag)?.[1], ["style-src"]);
  }

  return refs;
}

function describeFailure(policy: Map<string, string[]>, ref: Reference): string {
  const directive = ref.directives[0];
  const sources = (policy.get(directive) ?? policy.get("default-src") ?? []).join(" ");
  return `${ref.file}\n    ${ref.url}\n    blocked by ${directive}: ${sources}`;
}

// ─── Tests ────────────────────────────────────────────────────────────

const policy = parsePolicy(readFileSync(HEADERS_FILE, "utf8"));

describe("production Content-Security-Policy", () => {
  it("resolves the app directory these tests scan", () => {
    expect(existsSync(HEADERS_FILE), `${HEADERS_FILE} not found — APP_DIR is wrong`).toBe(true);
  });

  it("declares the fetch directives these tests rely on", () => {
    expect(policy.get("default-src")).toBeDefined();
    for (const directive of ["img-src", "media-src", "script-src", "style-src"]) {
      expect(policy.get(directive), `${directive} missing from _headers`).toBeDefined();
    }
  });

  it("allows the R2 media host every /content/ path is rewritten to", () => {
    const media = new URL(`${R2_MEDIA_ORIGIN}/main/content/example.png`);
    expect(isAllowed(policy, "img-src", media)).toBe(true);
    expect(isAllowed(policy, "media-src", media)).toBe(true);
  });

  it("blocks hosts that are not allowlisted", () => {
    expect(isAllowed(policy, "img-src", new URL("https://raw.githubusercontent.com/a/b.png"))).toBe(false);
    expect(isAllowed(policy, "img-src", new URL("https://evil.example.com/a.png"))).toBe(false);
  });

  it("matches 'self', scheme sources, and subdomain wildcards", () => {
    expect(isAllowed(policy, "img-src", new URL(`${SITE_ORIGIN}/meta/og.png`))).toBe(true);
    expect(isAllowed(policy, "img-src", new URL("data:image/png;base64,AAAA"))).toBe(true);
    expect(isAllowed(policy, "img-src", new URL("https://www.gstatic.com/a.png"))).toBe(true);
    expect(isAllowed(policy, "font-src", new URL("https://fonts.gstatic.com/a.woff2"))).toBe(true);
  });

  it("falls back to default-src for directives it does not list", () => {
    // frame-src is 'none', so nothing is embeddable.
    expect(isAllowed(policy, "frame-src", new URL("https://open.spotify.com/embed/x"))).toBe(false);
  });
});

describe("authored resources are permitted by the CSP", () => {
  it("content markdown loads nothing the policy blocks", () => {
    const contentDir = join(APP_DIR, "src", "content");
    const refs = walk(contentDir, [".md", ".mdx"]).flatMap((file) =>
      collectFrom(stripCode(readFileSync(file, "utf8")), relative(APP_DIR, file)),
    );

    expect(refs.length, "scanner found no references — the walk or regexes are broken").toBeGreaterThan(0);

    const blocked = refs.filter((ref) => !allowedByAny(policy, ref.directives, new URL(ref.url)));
    expect(blocked.map((ref) => describeFailure(policy, ref))).toEqual([]);
  });

  it("templates load nothing the policy blocks", () => {
    const refs = ["layouts", "components", "pages"].flatMap((dir) =>
      walk(join(APP_DIR, "src", dir), [".astro", ".html"]).flatMap((file) =>
        collectFrom(readFileSync(file, "utf8"), relative(APP_DIR, file)),
      ),
    );

    expect(refs.length, "scanner found no references — the walk or regexes are broken").toBeGreaterThan(0);

    const blocked = refs.filter((ref) => !allowedByAny(policy, ref.directives, new URL(ref.url)));
    expect(blocked.map((ref) => describeFailure(policy, ref))).toEqual([]);
  });

  it("favicon proxy used by link cards is allowed", () => {
    // src/lib/link-metadata.ts builds this URL at runtime, so the scanners cannot see it.
    expect(isAllowed(policy, "img-src", new URL("https://www.google.com/s2/favicons?domain=x.com&sz=32"))).toBe(true);
  });
});
