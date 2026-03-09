---
title: App Audit Fixes Implementation Plan
description: >-
  Fix the top 5 priority findings from the app code and security audit
  (docs/plans/2026-03-05-app-code-audit.md).
publishedOn: 2026-03-05T21:32:53.000Z
planType: implementation
topic: app-code-audit
status: completed
category: code-quality
---

# App Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the top 5 priority findings from the app code and security audit (docs/plans/2026-03-05-app-code-audit.md).

**Architecture:** Extract shared utilities first (unblocks deduplication), add tests for pure functions (safety net for refactoring), apply security fixes, refactor the chat client monolith, then deduplicate page templates.

**Tech Stack:** Astro 5, TypeScript, Vitest, Tailwind CSS v4

**Test commands:** `just app::test` to run all tests, `just app::typecheck` to type-check.

---

### Task 1: Extract shared utilities into `format-utils.ts` and `constants.ts`

Addresses: READ-8, MAINT-3, MAINT-8

**Files:**
- Create: `app/src/lib/format-utils.ts`
- Create: `app/src/lib/constants.ts`
- Modify: `app/src/lib/nav-data.ts`
- Modify: `app/src/components/Card/card-utils.ts`
- Modify: `app/src/components/Card/CardCategory.astro`
- Modify: `app/src/components/CommandPalette/CommandPalette.ts`
- Modify: `app/src/components/Chat/chat-utils.ts`
- Modify: `app/src/components/Chat/chat-client.ts`
- Modify: `app/src/pages/login.astro`
- Modify: `app/src/pages/logout.astro`
- Modify: `app/src/pages/[collection]/[...page].astro`
- Modify: `app/src/pages/[collection]/[category]/[...page].astro`

**Step 1: Create `app/src/lib/constants.ts`**

```ts
export const LS_ADMIN_TOKEN_KEY = "admin_token";
export const PAGE_SIZE = 50;
```

**Step 2: Create `app/src/lib/format-utils.ts`**

```ts
export function isValidDate(isoString: string): boolean {
  const d = new Date(isoString);
  return !isNaN(d.getTime()) && d.getFullYear() > 1970;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export function categoryDisplay(categoryName: string): string {
  const parts = categoryName.split("-");
  return parts.map((part) => (part !== "and" ? part.charAt(0).toUpperCase() + part.slice(1) : part)).join(" ");
}
```

**Step 3: Update `nav-data.ts` to import from `format-utils.ts`**

Remove `isValidDate`, `formatDate`, `categoryDisplay` function definitions (lines 102-113). Add re-exports from format-utils:

```ts
export { isValidDate, formatDate, categoryDisplay } from "./format-utils";
```

This preserves backward compatibility for any existing imports from `@lib/nav-data`.

**Step 4: Update `card-utils.ts` — remove re-export of `categoryDisplay`**

Remove lines 1 and 3 (`import { categoryDisplay }` and `export { categoryDisplay }`). The file should only contain `PLACEHOLDER_COLORS`, `pickColor`, and `tileSvg`.

**Step 5: Update `CardCategory.astro` to import from `format-utils`**

Change import from `"./card-utils"` to `"@lib/format-utils"`:

```astro
import { categoryDisplay } from "@lib/format-utils";
```

**Step 6: Update `CommandPalette.ts` — remove duplicate `formatCategory` and `formatDateClient`**

Add import at top of file (inside `initCommandPalette` or at module level):

```ts
import { categoryDisplay, formatDate } from "@lib/format-utils";
```

Remove the `formatCategory` function definition (lines 172-175). Remove the `formatDateClient` function definition (lines 177-179). Replace usages:
- `formatCategory(item.category)` → `categoryDisplay(item.category)`
- `formatDateClient(item.publishedOn)` → `formatDate(item.publishedOn)`

Note: `CommandPalette.ts` is loaded as a client script, and `format-utils.ts` is pure (no server imports), so this import works in both contexts.

**Step 7: Update `chat-utils.ts` — import `LS_ADMIN_TOKEN_KEY` from constants**

Replace line 1:
```ts
// Before:
export const LS_ADMIN_TOKEN_KEY = "admin_token";

// After:
export { LS_ADMIN_TOKEN_KEY } from "@lib/constants";
```

**Step 8: Update `login.astro` — import from constants**

In the frontmatter, replace line 5:
```ts
// Before:
const LS_ADMIN_TOKEN_KEY = "admin_token";

// After:
import { LS_ADMIN_TOKEN_KEY } from "@lib/constants";
```

**Step 9: Update `logout.astro` — import from constants**

In the frontmatter, replace line 3:
```ts
// Before:
const LS_ADMIN_TOKEN_KEY = "admin_token";

// After:
import { LS_ADMIN_TOKEN_KEY } from "@lib/constants";
```

**Step 10: Update both paginated page files — import `PAGE_SIZE` from constants**

In `app/src/pages/[collection]/[...page].astro`, replace `const PAGE_SIZE = 50;` (line 9) with:
```ts
import { PAGE_SIZE } from "@lib/constants";
```

In `app/src/pages/[collection]/[category]/[...page].astro`, replace `const PAGE_SIZE = 50;` (line 9) with:
```ts
import { PAGE_SIZE } from "@lib/constants";
```

**Step 11: Run typecheck and tests**

```bash
just app::typecheck
just app::test
```

Expected: All pass.

**Step 12: Commit**

```bash
git add app/src/lib/format-utils.ts app/src/lib/constants.ts \
  app/src/lib/nav-data.ts app/src/components/Card/card-utils.ts \
  app/src/components/Card/CardCategory.astro \
  app/src/components/CommandPalette/CommandPalette.ts \
  app/src/components/Chat/chat-utils.ts \
  app/src/pages/login.astro app/src/pages/logout.astro \
  app/src/pages/\[collection\]/\[...page\].astro \
  app/src/pages/\[collection\]/\[category\]/\[...page\].astro
git commit -m "refactor: extract shared utilities into format-utils.ts and constants.ts"
```

---

### Task 2: Write tests for untested pure functions

Addresses: TEST-1

**Files:**
- Create: `app/src/lib/__tests__/format-utils.test.ts`
- Create: `app/src/components/Card/__tests__/card-utils.test.ts`
- Create: `app/src/lib/__tests__/link-metadata.test.ts`
- Create: `app/src/plugins/__tests__/remark-extract-recipe.test.mjs`

**Step 1: Create `app/src/lib/__tests__/format-utils.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { isValidDate, formatDate, categoryDisplay } from "../format-utils";

describe("isValidDate", () => {
  it("returns true for valid ISO date strings", () => {
    expect(isValidDate("2024-01-15T00:00:00Z")).toBe(true);
  });

  it("returns false for invalid date strings", () => {
    expect(isValidDate("not-a-date")).toBe(false);
  });

  it("returns false for dates before 1970", () => {
    expect(isValidDate("1969-12-31T00:00:00Z")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidDate("")).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats date as short month and year", () => {
    const result = formatDate("2024-06-15T00:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2024");
  });
});

describe("categoryDisplay", () => {
  it("capitalizes single word", () => {
    expect(categoryDisplay("design")).toBe("Design");
  });

  it("capitalizes hyphenated words", () => {
    expect(categoryDisplay("web-development")).toBe("Web Development");
  });

  it("keeps 'and' lowercase", () => {
    expect(categoryDisplay("arts-and-crafts")).toBe("Arts and Crafts");
  });

  it("handles single character category", () => {
    expect(categoryDisplay("a")).toBe("A");
  });
});
```

**Step 2: Create `app/src/components/Card/__tests__/card-utils.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { pickColor, tileSvg, PLACEHOLDER_COLORS } from "../card-utils";

describe("pickColor", () => {
  it("returns a color from PLACEHOLDER_COLORS", () => {
    const color = pickColor("test");
    expect(PLACEHOLDER_COLORS).toContain(color);
  });

  it("returns consistent results for the same input", () => {
    expect(pickColor("hello")).toBe(pickColor("hello"));
  });

  it("returns different colors for different inputs", () => {
    const colors = new Set(["a", "b", "c", "d", "e", "f"].map(pickColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe("tileSvg", () => {
  it("returns a data URI string", () => {
    const result = tileSvg("Test");
    expect(result).toMatch(/^url\("data:image\/svg\+xml,.+"\)$/);
  });

  it("escapes HTML special characters", () => {
    const result = tileSvg("A&B<C>");
    expect(result).toContain("A%26amp%3BB%26lt%3BC%26gt%3B");
  });

  it("uppercases the title", () => {
    const result = tileSvg("hello");
    expect(result).toContain("HELLO");
  });
});
```

**Step 3: Create `app/src/lib/__tests__/link-metadata.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { getFaviconUrl } from "../link-metadata";

describe("getFaviconUrl", () => {
  it("returns Google favicon service URL for valid URLs", () => {
    const result = getFaviconUrl("https://example.com/page");
    expect(result).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=32");
  });

  it("extracts hostname without path", () => {
    const result = getFaviconUrl("https://docs.example.com/a/b/c");
    expect(result).toBe("https://www.google.com/s2/favicons?domain=docs.example.com&sz=32");
  });

  it("returns empty string for invalid URLs", () => {
    expect(getFaviconUrl("not-a-url")).toBe("");
  });
});
```

**Step 4: Create `app/src/plugins/__tests__/remark-extract-recipe.test.mjs`**

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import remarkExtractRecipe from "../remark-extract-recipe.mjs";

function makeHeading(depth, text) {
  return { type: "heading", depth, children: [{ type: "text", value: text }] };
}

function makeList(ordered, items) {
  return {
    type: "list",
    ordered,
    children: items.map((text) =>
      typeof text === "string"
        ? { type: "listItem", children: [{ type: "paragraph", children: [{ type: "text", value: text }] }] }
        : text,
    ),
  };
}

function makeNestedListItem(label, subItems) {
  return {
    type: "listItem",
    children: [
      { type: "paragraph", children: [{ type: "text", value: label }] },
      makeList(false, subItems),
    ],
  };
}

function runPlugin(tree, filePath = "/src/content/recipes/test.md") {
  const file = { history: [filePath], data: {} };
  const plugin = remarkExtractRecipe();
  plugin(tree, file);
  return file.data.astro?.frontmatter?.recipeData;
}

describe("remarkExtractRecipe", () => {
  it("skips non-recipe files", () => {
    const tree = { children: [makeHeading(2, "Ingredients"), makeList(false, ["1 cup flour"])] };
    const result = runPlugin(tree, "/src/content/guides/test.md");
    expect(result).toBeUndefined();
  });

  it("extracts flat ingredients list", () => {
    const tree = {
      children: [makeHeading(2, "Ingredients"), makeList(false, ["1 cup flour", "2 eggs", "1 tsp salt"])],
    };
    const result = runPlugin(tree);
    expect(result.ingredients).toEqual(["1 cup flour", "2 eggs", "1 tsp salt"]);
  });

  it("flattens nested ingredient lists (category labels skipped)", () => {
    const tree = {
      children: [
        makeHeading(2, "Ingredients"),
        makeList(false, [makeNestedListItem("Breading", ["1 cup breadcrumbs", "1 egg"])]),
      ],
    };
    const result = runPlugin(tree);
    expect(result.ingredients).toEqual(["1 cup breadcrumbs", "1 egg"]);
  });

  it("extracts simple directions", () => {
    const tree = {
      children: [makeHeading(2, "Directions"), makeList(true, ["Preheat oven to 350°F", "Mix dry ingredients"])],
    };
    const result = runPlugin(tree);
    expect(result.instructionSections).toEqual([{ name: null, steps: ["Preheat oven to 350°F", "Mix dry ingredients"] }]);
  });

  it("recognizes alternative heading names", () => {
    for (const heading of ["Steps", "Instructions"]) {
      const tree = {
        children: [makeHeading(2, heading), makeList(true, ["Do the thing"])],
      };
      const result = runPlugin(tree);
      expect(result.instructionSections[0].steps).toEqual(["Do the thing"]);
    }
  });

  it("splits directions by h3 sub-headings into named sections", () => {
    const tree = {
      children: [
        makeHeading(2, "Directions"),
        makeHeading(3, "Prep"),
        makeList(true, ["Dice onions"]),
        makeHeading(3, "Cook"),
        makeList(true, ["Saute onions"]),
      ],
    };
    const result = runPlugin(tree);
    expect(result.instructionSections).toEqual([
      { name: "Prep", steps: ["Dice onions"] },
      { name: "Cook", steps: ["Saute onions"] },
    ]);
  });

  it("returns empty arrays when sections are missing", () => {
    const tree = { children: [makeHeading(2, "Notes"), { type: "paragraph", children: [{ type: "text", value: "Just a note" }] }] };
    const result = runPlugin(tree);
    expect(result.ingredients).toEqual([]);
    expect(result.instructionSections).toEqual([]);
  });
});
```

**Step 5: Run tests**

```bash
just app::test
```

Expected: All new tests pass alongside existing tests.

**Step 6: Commit**

```bash
git add app/src/lib/__tests__/ app/src/components/Card/__tests__/ app/src/plugins/__tests__/remark-extract-recipe.test.mjs
git commit -m "test: add tests for format-utils, card-utils, link-metadata, and remark-extract-recipe"
```

---

### Task 3: Security hardening — CSP headers + WebSocket error handling

Addresses: SEC-1, SEC-4, SEC-5, SEC-6, SEC-10, MAINT-2

**Files:**
- Create: `app/public/_headers`
- Modify: `app/src/components/Chat/chat-client.ts`

**Step 1: Create `app/public/_headers`**

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' https://www.google.com https://*.cloudflare.com data:; connect-src 'self' https://api.thalida.com wss://api.thalida.com; frame-src https://open.spotify.com; object-src 'none'; base-uri 'self'
```

Note: `'unsafe-inline'` is needed for `script-src` because `login.astro` and `logout.astro` use `is:inline` scripts, and for `style-src` because Astro injects component-scoped styles inline.

**Step 2: Fix WebSocket JSON.parse — add try/catch (SEC-4 + MAINT-2)**

In `chat-client.ts`, wrap the message handler's `JSON.parse` in a try/catch. Replace line 212:

```ts
// Before:
const data = JSON.parse(event.data) as ServerMessage;

// After:
let data: ServerMessage;
try {
  data = JSON.parse(event.data) as ServerMessage;
} catch {
  console.warn("[chat] received malformed message");
  return;
}
```

**Step 3: Fix CSS selector injection — use CSS.escape (SEC-5)**

In `chat-client.ts`, replace line 250:

```ts
// Before:
const el = messagesEl.querySelector(`[data-msg-id="${data.id}"]`);

// After:
const el = messagesEl.querySelector(`[data-msg-id="${CSS.escape(data.id)}"]`);
```

**Step 4: Fix open redirect via context path (SEC-6)**

In `chat-client.ts`, add a path validation guard around the context block (lines 142-149). Replace:

```ts
// Before:
if (msg.context) {
  const pageLink = slot("page") as HTMLAnchorElement;
  pageLink.href = msg.context.path;

// After:
if (msg.context && msg.context.path.startsWith("/")) {
  const pageLink = slot("page") as HTMLAnchorElement;
  pageLink.href = msg.context.path;
```

**Step 5: Replace innerHTML clearing with replaceChildren (SEC-10)**

In `chat-client.ts`, replace line 221:

```ts
// Before:
messagesEl.innerHTML = "";

// After:
messagesEl.replaceChildren();
```

**Step 6: Run typecheck and tests**

```bash
just app::typecheck
just app::test
```

Expected: All pass.

**Step 7: Commit**

```bash
git add app/public/_headers app/src/components/Chat/chat-client.ts
git commit -m "fix: add CSP headers and harden WebSocket message handling"
```

---

### Task 4: Refactor `chat-client.ts` into modular structure

Addresses: READ-1, READ-2, TEST-2, MAINT-5

This is the largest change. We split the 465-line monolith into focused modules.

**Files:**
- Create: `app/src/components/Chat/chat-types.ts`
- Create: `app/src/components/Chat/chat-connection.ts`
- Create: `app/src/components/Chat/chat-dom.ts`
- Create: `app/src/components/Chat/__tests__/chat-connection.test.ts`
- Modify: `app/src/components/Chat/chat-client.ts`

**Step 1: Create `app/src/components/Chat/chat-types.ts`**

Extract all type definitions and message type constants:

```ts
export const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  RENAME: "rename",
  MESSAGE: "message",
  DELETE: "delete",
  FLAG: "flag",
  DELETE_BY_USER: "delete_by_user",
  UNBLOCK: "unblock",
} as const;

export const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  HELP: "help",
  FLAGGED: "flagged",
  BLOCKED_LIST: "blocked_list",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  MESSAGE: "message",
  RENAME: "rename",
} as const;

export interface MessageContext {
  path: string;
}

export type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | {
      type: "message";
      id: string;
      clientId?: string;
      isOwn?: boolean;
      username: string;
      text: string;
      timestamp: number;
      context?: MessageContext;
    }
  | { type: "joined"; isOwner: boolean; username: string; isBlocked: boolean }
  | { type: "status"; isOwnerOnline: boolean; userCount: number; onlineUsernames: string[] }
  | { type: "error"; code: string; message: string }
  | { type: "remove"; id: string }
  | { type: "warning"; code: string; message: string }
  | { type: "blocked"; code: string; message: string }
  | { type: "unblocked"; clientId: string }
  | { type: "help"; commands: Array<{ name: string; description: string }> }
  | { type: "flagged"; username: string; clientId: string; messageId: string }
  | { type: "blocked_list"; entries: Array<{ clientId: string; username: string; blockedAt: number }> }
  | { type: "rename"; oldUsername: string; newUsername: string };

export interface ChatMessage {
  id: string;
  clientId?: string;
  isOwn?: boolean;
  username: string;
  text: string;
  timestamp: number;
  context?: MessageContext;
}

export type ClientModAction =
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.FLAG; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE_BY_USER; data: { clientId: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.UNBLOCK; data: { clientId: string } };
```

**Step 2: Create `app/src/components/Chat/chat-dom.ts`**

Extract DOM element lookups with a null guard:

```ts
export interface ChatElements {
  usernameInput: HTMLInputElement;
  usernameRow: HTMLLabelElement;
  messages: HTMLDivElement;
  input: HTMLInputElement;
  sendBtn: HTMLButtonElement;
  statusDot: HTMLSpanElement;
  ownerStatus: HTMLSpanElement;
  ownerWrap: HTMLSpanElement;
  userCount: HTMLSpanElement;
  msgTpl: HTMLTemplateElement;
  noticeTpl: HTMLTemplateElement;
}

export function queryChatElements(): ChatElements | null {
  const el = (selector: string) => document.querySelector(selector);
  const messages = el('[data-chat="messages"]');
  if (!messages) return null;

  return {
    usernameInput: el('[data-chat="username-input"]') as HTMLInputElement,
    usernameRow: el('[data-chat="username-row"]') as HTMLLabelElement,
    messages: messages as HTMLDivElement,
    input: el('[data-chat="input"]') as HTMLInputElement,
    sendBtn: el('[data-chat="send"]') as HTMLButtonElement,
    statusDot: el('[data-chat="owner-status-dot"]') as HTMLSpanElement,
    ownerStatus: el('[data-chat="owner-status"]') as HTMLSpanElement,
    ownerWrap: el('[data-chat="owner-wrap"]') as HTMLSpanElement,
    userCount: el('[data-chat="user-count"]') as HTMLSpanElement,
    msgTpl: el('[data-chat="msg-tpl"]') as HTMLTemplateElement,
    noticeTpl: el('[data-chat="notice-tpl"]') as HTMLTemplateElement,
  };
}
```

**Step 3: Create `app/src/components/Chat/chat-connection.ts`**

Extract WebSocket connection management and message dispatch:

```ts
import type { ServerMessage, ChatMessage, MessageContext, ClientModAction } from "./chat-types";
import { CLIENT_MESSAGE_TYPE, SERVER_MESSAGE_TYPE } from "./chat-types";
import { validateUsername, setAdminUsername } from "./chat-utils";
import { LS_ADMIN_TOKEN_KEY } from "@lib/constants";
import { truncateMiddle, formatMessageTime, renderNotice } from "./chat-render";
import { createIdleManager } from "./chat-idle";
import type { ChatElements } from "./chat-dom";

const RECONNECT_DELAY_MS = 3000;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const LS_CLIENT_ID_KEY = "chat_client_id";

export interface ChatClientState {
  ws: WebSocket | null;
  username: string | null;
  clientId: string | null;
  adminUsername: string | null;
  isOwner: boolean;
  pendingRename: boolean;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  idleManager: ReturnType<typeof createIdleManager> | null;
}

export function createChatClient(els: ChatElements, wsUrl: string) {
  const apiBase = wsUrl.replace(/^ws(s?):/, "http$1:").replace(/\/ws$/, "");

  const state: ChatClientState = {
    ws: null,
    username: null,
    clientId: null,
    adminUsername: null,
    isOwner: false,
    pendingRename: false,
    reconnectTimer: null,
    idleManager: null,
  };

  // ── Identity ──

  function getAdminToken(): string | null {
    return localStorage.getItem(LS_ADMIN_TOKEN_KEY);
  }

  function loadIdentity(): void {
    state.clientId = localStorage.getItem(LS_CLIENT_ID_KEY);
    if (!state.clientId) {
      state.clientId = crypto.randomUUID();
      localStorage.setItem(LS_CLIENT_ID_KEY, state.clientId);
    }
  }

  // ── WebSocket helpers ──

  function wsSend(data: ClientModAction): void {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify(data));
  }

  // ── DOM rendering ──

  function appendMessage(msg: ChatMessage): void {
    const isAdminMsg = state.adminUsername != null && msg.username === state.adminUsername;
    const frag = els.msgTpl.content.cloneNode(true) as DocumentFragment;
    const root = frag.firstElementChild as HTMLElement;

    root.dataset.msgId = String(msg.id);
    if (msg.clientId) root.dataset.clientId = msg.clientId;
    if (msg.isOwn) root.dataset.own = "";

    const slot = (name: string) => root.querySelector(`[data-chat="${name}"]`) as HTMLElement;

    const usernameEl = slot("username");
    usernameEl.textContent = msg.username;
    const isCurrentUser = msg.isOwn && msg.username === state.username;
    if (isCurrentUser) usernameEl.dataset.own = "";
    else if (isAdminMsg) usernameEl.dataset.admin = "";

    slot("time").textContent = formatMessageTime(msg.timestamp);

    if (msg.context && msg.context.path.startsWith("/")) {
      const pageLink = slot("page") as HTMLAnchorElement;
      pageLink.href = msg.context.path;
      pageLink.textContent = truncateMiddle(msg.context.path, 25);
      pageLink.title = msg.context.path;
      pageLink.hidden = false;
      slot("at-sep").hidden = false;
    }

    slot("text").textContent = msg.text;

    if (state.isOwner) {
      const deleteBtn = slot("delete-btn") as HTMLButtonElement;
      deleteBtn.hidden = false;
      const snippet = msg.text.length > 50 ? msg.text.slice(0, 50) + "…" : msg.text;

      deleteBtn.addEventListener("click", () => {
        const currentName = usernameEl.textContent ?? msg.username;
        if (confirm(`Delete message from ${currentName}?\n\n"${snippet}"`)) {
          wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: msg.id } });
        }
      });

      const flagBtn = slot("flag-btn") as HTMLButtonElement;
      if (!isAdminMsg) flagBtn.hidden = false;
      flagBtn.addEventListener("click", () => {
        const currentName = usernameEl.textContent ?? msg.username;
        if (confirm(`Flag & ban ${currentName}?\n\n"${snippet}"`)) {
          wsSend({ type: CLIENT_MESSAGE_TYPE.FLAG, data: { id: msg.id } });
        }
      });
    }

    els.messages.appendChild(frag);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function appendSystemMessage(text: string, actions?: Array<{ label: string; action: () => void }>): HTMLElement {
    const root = renderNotice(els.noticeTpl, text, actions);
    els.messages.appendChild(root);
    els.messages.scrollTop = els.messages.scrollHeight;
    return root;
  }

  function updateStatus(isOwnerOnline: boolean, userCount: number, onlineUsernames: string[]): void {
    const ownerLabel = state.adminUsername ?? "owner";
    if (isOwnerOnline) els.statusDot.dataset.online = "";
    else delete els.statusDot.dataset.online;
    els.ownerStatus.textContent = ownerLabel;
    els.ownerWrap.title = `Site owner: ${isOwnerOnline ? "online" : "offline"}`;
    (els.userCount.querySelector('[data-chat="viewer-count"]') as HTMLElement).textContent = String(userCount);
    els.userCount.title = `${userCount} online`;

    const onlineSet = new Set(onlineUsernames);
    for (const row of els.messages.querySelectorAll<HTMLElement>("[data-msg-id]")) {
      const dot = row.querySelector<HTMLElement>('[data-chat="status-dot"]');
      const usernameEl = row.querySelector<HTMLElement>('[data-chat="username"]');
      if (!dot || !usernameEl) continue;
      if (onlineSet.has(usernameEl.textContent ?? "")) dot.dataset.online = "";
      else delete dot.dataset.online;
    }
  }

  function setBlocked(blocked: boolean): void {
    els.usernameRow.hidden = blocked;
    els.input.disabled = blocked;
    els.sendBtn.disabled = blocked;
    els.input.placeholder = blocked ? "You have been blocked." : "";
  }

  function updateAdminUI(): void {
    const adminLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav="admin-link"]');
    for (const link of adminLinks) {
      if (state.isOwner) {
        link.href = "/logout";
        link.textContent = "logout";
      } else {
        link.href = "/login";
        link.textContent = "login";
      }
    }
    els.usernameInput.readOnly = state.isOwner;
    els.usernameInput.tabIndex = state.isOwner ? -1 : 0;
  }

  // ── Message dispatch ──

  const messageHandlers: Record<string, (data: ServerMessage) => void> = {
    [SERVER_MESSAGE_TYPE.JOINED](data) {
      if (data.type !== "joined") return;
      state.isOwner = data.isOwner;
      state.username = data.username;
      els.usernameInput.value = data.username;
      updateAdminUI();
      setBlocked(data.isBlocked);
    },
    [SERVER_MESSAGE_TYPE.HISTORY](data) {
      if (data.type !== "history") return;
      els.messages.replaceChildren();
      for (const msg of data.messages) appendMessage(msg);
    },
    [SERVER_MESSAGE_TYPE.MESSAGE](data) {
      if (data.type !== "message") return;
      appendMessage({
        id: data.id,
        clientId: data.clientId,
        isOwn: data.isOwn,
        username: data.username,
        text: data.text,
        timestamp: data.timestamp,
        context: data.context,
      });
    },
    [SERVER_MESSAGE_TYPE.STATUS](data) {
      if (data.type !== "status") return;
      updateStatus(data.isOwnerOnline, data.userCount, data.onlineUsernames);
    },
    [SERVER_MESSAGE_TYPE.ERROR](data) {
      if (data.type !== "error") return;
      const usernameErrors = new Set(["invalid_username", "reserved_username", "taken_username"]);
      if (state.pendingRename && usernameErrors.has(data.code)) {
        state.pendingRename = false;
        els.usernameInput.setCustomValidity(data.message);
        els.usernameInput.reportValidity();
        els.usernameInput.value = state.username ?? "";
        return;
      }
      appendSystemMessage(data.message);
    },
    [SERVER_MESSAGE_TYPE.REMOVE](data) {
      if (data.type !== "remove") return;
      const el = els.messages.querySelector(`[data-msg-id="${CSS.escape(data.id)}"]`);
      if (el) el.remove();
    },
    [SERVER_MESSAGE_TYPE.RENAME](data) {
      if (data.type !== "rename") return;
      const usernameEls = els.messages.querySelectorAll<HTMLElement>('[data-chat="username"]');
      for (const el of usernameEls) {
        if (el.textContent === data.oldUsername) el.textContent = data.newUsername;
      }
    },
    [SERVER_MESSAGE_TYPE.WARNING](data) {
      if (data.type !== "warning") return;
      appendSystemMessage(data.message);
    },
    [SERVER_MESSAGE_TYPE.BLOCKED](data) {
      if (data.type !== "blocked") return;
      appendSystemMessage(data.message);
      setBlocked(true);
    },
    [SERVER_MESSAGE_TYPE.UNBLOCKED](data) {
      if (data.type !== "unblocked") return;
      appendSystemMessage(`Unblocked user: ${data.clientId.slice(0, 8)}\u2026`);
    },
    [SERVER_MESSAGE_TYPE.HELP](data) {
      if (data.type !== "help") return;
      const lines = data.commands.map((c) => `  /${c.name} — ${c.description}`);
      appendSystemMessage(`Available commands:\n${lines.join("\n")}`);
    },
    [SERVER_MESSAGE_TYPE.FLAGGED](data) {
      if (data.type !== "flagged") return;
      appendSystemMessage(`Banned ${data.username}.\nDelete their messages?`, [
        {
          label: "all",
          action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE_BY_USER, data: { clientId: data.clientId } }),
        },
        { label: "this one", action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: data.messageId } }) },
        { label: "none", action: () => {} },
      ]);
    },
    [SERVER_MESSAGE_TYPE.BLOCKED_LIST](data) {
      if (data.type !== "blocked_list") return;
      if (data.entries.length === 0) {
        appendSystemMessage("No blocked users.");
      } else {
        appendSystemMessage(`Blocked users (${data.entries.length}):`);
        for (const e of data.entries) {
          const date = e.blockedAt > 0 ? new Date(e.blockedAt).toLocaleDateString() : "unknown date";
          appendSystemMessage(`  ${e.username} \u2014 ${e.clientId.slice(0, 8)}\u2026 (blocked ${date})`, [
            {
              label: "unblock",
              action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.UNBLOCK, data: { clientId: e.clientId } }),
            },
          ]);
        }
      }
    },
  };

  // ── Connection ──

  function sendJoin(): void {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    const token = getAdminToken();
    const data: Record<string, string> = {};
    if (state.clientId) data.clientId = state.clientId;
    if (token) data.token = token;
    state.ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.JOIN, data }));
  }

  function connect(): void {
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;

    state.ws = new WebSocket(wsUrl);

    state.ws.addEventListener("open", () => sendJoin());

    state.ws.addEventListener("message", (event) => {
      let data: ServerMessage;
      try {
        data = JSON.parse(event.data) as ServerMessage;
      } catch {
        console.warn("[chat] received malformed message");
        return;
      }
      const handler = messageHandlers[data.type];
      if (handler) handler(data);
    });

    state.ws.addEventListener("close", () => scheduleReconnect());
    state.ws.addEventListener("error", () => state.ws?.close());
  }

  function scheduleReconnect(): void {
    if (state.idleManager?.isIdle) return;
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  }

  // ── User actions ──

  function sendMessage(): void {
    const text = els.input.value.trim();
    if (!text || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    const data: { text: string; context: MessageContext } = {
      text,
      context: { path: window.location.pathname },
    };
    state.ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.MESSAGE, data }));
    els.input.value = "";
  }

  function validateUsernameInput(): boolean {
    const pos = els.usernameInput.selectionStart;
    els.usernameInput.value = els.usernameInput.value.toLowerCase();
    els.usernameInput.setSelectionRange(pos, pos);
    const result = validateUsername(els.usernameInput.value.trim());
    els.usernameInput.setCustomValidity(result.error ?? "");
    return result.valid;
  }

  function changeUsername(): void {
    if (state.isOwner) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    if (!validateUsernameInput()) {
      els.usernameInput.reportValidity();
      return;
    }
    const newName = els.usernameInput.value.trim().toLowerCase().slice(0, 20);
    if (newName === state.username) return;
    state.pendingRename = true;
    state.ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.RENAME, data: { username: newName } }));
  }

  // ── Config ──

  async function fetchConfig(): Promise<void> {
    try {
      const resp = await fetch(`${apiBase}/config`);
      if (!resp.ok) return;
      const data = (await resp.json()) as { adminUsername?: string };
      if (data.adminUsername) {
        state.adminUsername = data.adminUsername;
        setAdminUsername(state.adminUsername);
        els.ownerStatus.textContent = state.adminUsername;
      }
    } catch {
      console.warn("[chat] failed to fetch config, reserved name validation will be skipped client-side");
    }
  }

  // ── Event listeners ──

  els.usernameInput.addEventListener("input", () => validateUsernameInput());
  els.usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      changeUsername();
      els.usernameInput.blur();
    } else if (e.key === "Escape") {
      els.usernameInput.value = state.username ?? "";
      els.usernameInput.blur();
    }
  });
  els.usernameInput.addEventListener("blur", () => changeUsername());
  els.sendBtn.addEventListener("click", sendMessage);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ── Init ──

  updateAdminUI();

  fetchConfig().then(() => {
    loadIdentity();
    connect();

    state.idleManager = createIdleManager({
      timeoutMs: IDLE_TIMEOUT_MS,
      onIdle() {
        if (state.reconnectTimer) {
          clearTimeout(state.reconnectTimer);
          state.reconnectTimer = null;
        }
        state.ws?.close();
      },
      onActive() {
        connect();
      },
    });

    document.addEventListener("visibilitychange", () => {
      state.idleManager?.handleVisibilityChange(document.hidden);
    });

    const chatEl = document.querySelector('[data-chat="panel"]');
    if (chatEl) {
      for (const event of ["mousemove", "keydown", "touchstart"] as const) {
        chatEl.addEventListener(event, () => state.idleManager?.handleActivity(), { passive: true });
      }
    }
  });
}
```

**Step 4: Rewrite `chat-client.ts` as a thin entry point**

Replace the entire contents of `chat-client.ts`:

```ts
import { queryChatElements } from "./chat-dom";
import { createChatClient } from "./chat-connection";

const els = queryChatElements();
if (els) {
  const wsUrl =
    document.querySelector<HTMLMetaElement>('meta[name="chat-ws-url"]')?.content?.trim() || "ws://localhost:8787/ws";
  createChatClient(els, wsUrl);
}
```

**Step 5: Run typecheck and tests**

```bash
just app::typecheck
just app::test
```

Expected: All pass. The existing chat tests (`chat-render.test.ts`, `chat-idle.test.ts`, chat-utils tests) should still pass because their source files are unchanged.

**Step 6: Commit**

```bash
git add app/src/components/Chat/chat-types.ts \
  app/src/components/Chat/chat-dom.ts \
  app/src/components/Chat/chat-connection.ts \
  app/src/components/Chat/chat-client.ts
git commit -m "refactor: split chat-client.ts into types, dom, and connection modules"
```

---

### Task 5: Deduplicate paginated page templates

Addresses: MAINT-1, MAINT-4

**Files:**
- Create: `app/src/lib/collection-types.ts`
- Modify: `app/src/pages/[collection]/[...page].astro`
- Modify: `app/src/pages/[collection]/[category]/[...page].astro`
- Modify: `app/src/pages/[collection]/post/[...id].astro`

**Step 1: Create `app/src/lib/collection-types.ts`**

```ts
import type { NavItem } from "./nav-data";

export interface CollectionPage {
  data: NavItem[];
  start: number;
  end: number;
  total: number;
  currentPage: number;
  lastPage: number;
  size: number;
  url: { current: string; prev: string | undefined; next: string | undefined };
}

export interface CollectionPageProps {
  title: string;
  allCategories: string[];
}
```

**Step 2: Update `app/src/pages/[collection]/[...page].astro`**

Replace the inline type assertions with the shared type:

```astro
---
import type { GetStaticPathsOptions } from "astro";
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
import CollectionGrid from "@components/CollectionGrid/CollectionGrid.astro";
import { getNavData } from "@lib/nav-data";
import { COLLECTION_NAMES, collectionMeta, type CollectionName } from "@/content.config";
import { PAGE_SIZE } from "@lib/constants";
import type { CollectionPage, CollectionPageProps } from "@lib/collection-types";

export async function getStaticPaths({ paginate }: GetStaticPathsOptions) {
  const navData = await getNavData();
  const pages = COLLECTION_NAMES.flatMap((collection) => {
    const collectionData = navData[collection];
    if (!collectionData) return [];
    return paginate(collectionData.items, {
      pageSize: PAGE_SIZE,
      params: { collection },
      props: {
        title: collectionData.title,
        allCategories: collectionData.allCategories,
      },
    });
  });
  return pages;
}

const { collection } = Astro.params as { collection: CollectionName };
const page = Astro.props.page as CollectionPage;
const { title, allCategories } = Astro.props as CollectionPageProps;
---

<BaseLayout
  title={`${title} · thalida`}
  activeCollection={collection}
  description={collectionMeta[collection].description}
>
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={collectionMeta[collection].description}
    itemCount={page.total}
    items={page.data}
    allCategories={allCategories}
    prevUrl={page.url.prev}
    nextUrl={page.url.next}
    currentPage={page.currentPage}
    lastPage={page.lastPage}
  />
</BaseLayout>
```

**Step 3: Update `app/src/pages/[collection]/[category]/[...page].astro`**

```astro
---
import type { GetStaticPathsOptions } from "astro";
import BaseLayout from "@layouts/BaseLayout/BaseLayout.astro";
import CollectionGrid from "@components/CollectionGrid/CollectionGrid.astro";
import { getNavData, categoryDisplay } from "@lib/nav-data";
import { COLLECTION_NAMES, collectionMeta, type CollectionName } from "@/content.config";
import { PAGE_SIZE } from "@lib/constants";
import type { CollectionPage, CollectionPageProps } from "@lib/collection-types";

export async function getStaticPaths({ paginate }: GetStaticPathsOptions) {
  const navData = await getNavData();
  const pages = COLLECTION_NAMES.flatMap((collection) => {
    const collectionData = navData[collection];
    if (!collectionData) return [];
    return collectionData.allCategories.flatMap((category) => {
      const filtered = collectionData.items.filter((item) => item.category === category);
      if (filtered.length === 0) return [];
      return paginate(filtered, {
        pageSize: PAGE_SIZE,
        params: { collection, category },
        props: {
          title: collectionData.title,
          allCategories: collectionData.allCategories,
        },
      });
    });
  });
  return pages;
}

const { collection, category } = Astro.params as { collection: CollectionName; category: string };
const page = Astro.props.page as CollectionPage;
const { title, allCategories } = Astro.props as CollectionPageProps;
---

<BaseLayout
  title={`${categoryDisplay(category)} · ${title} · thalida`}
  activeCollection={collection}
  description={`${categoryDisplay(category)} ${collectionMeta[collection].description.toLowerCase()}`}
>
  <CollectionGrid
    collection={collection}
    title={title}
    subtitle={collectionMeta[collection].description}
    itemCount={page.total}
    items={page.data}
    allCategories={allCategories}
    activeCategory={category}
    prevUrl={page.url.prev}
    nextUrl={page.url.next}
    currentPage={page.currentPage}
    lastPage={page.lastPage}
  />
</BaseLayout>
```

**Step 4: Update `app/src/pages/[collection]/post/[...id].astro` — derive routable set**

Replace line 10-11:

```ts
// Before:
const routable = new Set(["projects", "guides", "gallery", "recipes", "versions"]);

// After:
const routable = new Set(COLLECTION_NAMES.filter((name) => name !== "links"));
```

**Step 5: Run typecheck and tests**

```bash
just app::typecheck
just app::test
```

Expected: All pass.

**Step 6: Commit**

```bash
git add app/src/lib/collection-types.ts \
  app/src/pages/\[collection\]/\[...page\].astro \
  app/src/pages/\[collection\]/\[category\]/\[...page\].astro \
  app/src/pages/\[collection\]/post/\[...id\].astro
git commit -m "refactor: deduplicate paginated page templates with shared types"
```

---

### Task 6: Update audit report — mark fixed findings as resolved

Addresses: Closing the loop on the audit document.

**Files:**
- Modify: `docs/plans/2026-03-05-app-code-audit.md`

**Step 1: Add a "Resolution Status" column to the summary table**

For each finding addressed by this plan, add `FIXED` in a new column. The findings resolved:

- SEC-1 (CSP headers) → FIXED
- SEC-4 (WebSocket JSON.parse) → FIXED
- SEC-5 (CSS selector injection) → FIXED
- SEC-6 (open redirect) → FIXED
- SEC-10 (innerHTML clearing) → FIXED
- READ-1 (message handler chain) → FIXED (dispatch map)
- READ-2 (module-level mutables) → FIXED (state object in factory)
- READ-8 (duplicated logic) → FIXED (shared modules)
- TEST-1 (pure function tests) → FIXED (4 test files added)
- TEST-2 (chat-client untestable) → FIXED (factory pattern)
- MAINT-1 (page template duplication) → FIXED (shared types)
- MAINT-2 (JSON.parse error handling) → FIXED
- MAINT-3 (LS_ADMIN_TOKEN_KEY 3 locations) → FIXED (constants.ts)
- MAINT-4 (hardcoded routable set) → FIXED (derived from COLLECTION_NAMES)
- MAINT-5 (unsafe querySelector casts) → FIXED (null guard in chat-dom.ts)

**Step 2: Commit**

```bash
git add docs/plans/2026-03-05-app-code-audit.md
git commit -m "docs: mark resolved audit findings"
```

---

## Execution Order Summary

| Task | What | Findings Resolved | Depends On |
|------|------|-------------------|------------|
| 1 | Extract shared utilities | READ-8, MAINT-3 | — |
| 2 | Write tests for pure functions | TEST-1 | Task 1 |
| 3 | Security hardening (CSP + WS fixes) | SEC-1,4,5,6,10, MAINT-2 | — |
| 4 | Refactor chat-client.ts | READ-1,2, TEST-2, MAINT-5 | Task 1 |
| 5 | Deduplicate page templates | MAINT-1, MAINT-4 | Task 1 |
| 6 | Update audit report | — | Tasks 1-5 |

Tasks 1, 3 can run in parallel. Tasks 2, 4, 5 depend on Task 1. Task 6 is last.
