---
title: "Code Quality Audit Fixes"
description: "Fix all HIGH and MEDIUM findings from the comprehensive code audit —"
publishedOn: 2026-03-05
planType: "implementation"
topic: "code-quality-fixes"
status: "completed"
---

# Code Quality Audit Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all HIGH and MEDIUM findings from the comprehensive code audit —
correctness bugs, security gaps, and structural/organizational issues.

**Architecture:** Three phases:

1. Correctness & security fixes (Tasks 1-8)
2. App bug fixes (Tasks 9-11)
3. Structural cleanup & code organization (Tasks 13-21)

Task 12 is an intermediate verification checkpoint.

**Tech Stack:** TypeScript, Cloudflare Workers (Durable Objects, SQLite), Astro, Vitest

---

## Task 1: Fix in-memory/SQL desync in ChatStorage

The most important fix. Currently `addMessage`, `removeMessage`, `blockClient`, etc. mutate in-memory state first, then try SQL. If SQL fails, memory diverges from storage.

**Files:**
- Modify: `api/src/chat-storage.ts` (lines 229-332)
- Test: `api/src/__tests__/chat-room.test.ts`

**Step 1: Refactor `addMessage` — SQL first, memory second**

In `api/src/chat-storage.ts`, replace lines 229-246:

```typescript
addMessage(message: ChatMessage): void {
  this.messages.push(message);
  try {
    this.storage.sql.exec(
      `INSERT INTO messages (id, client_id, username, text, context_path, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      message.id,
      message.clientId,
      message.username,
      message.text,
      message.context?.path ?? null,
      this.toISOString(message.timestamp),
    );
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to persist message:", err);
  }
}
```

With:

```typescript
addMessage(message: ChatMessage): boolean {
  try {
    this.storage.sql.exec(
      `INSERT INTO messages (id, client_id, username, text, context_path, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      message.id,
      message.clientId,
      message.username,
      message.text,
      message.context?.path ?? null,
      this.toISOString(message.timestamp),
    );
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to persist message:", err);
    return false;
  }
  this.messages.push(message);
  return true;
}
```

**Step 2: Refactor `removeMessage` — SQL first**

Replace lines 248-260:

```typescript
removeMessage(id: string): boolean {
  const idx = this.messages.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  this.messages.splice(idx, 1);
  try {
    this.storage.sql.exec(`DELETE FROM messages WHERE id = ?`, id);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to remove message:", err);
  }
  return true;
}
```

With:

```typescript
removeMessage(id: string): boolean {
  const idx = this.messages.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  try {
    this.storage.sql.exec(`DELETE FROM messages WHERE id = ?`, id);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to remove message:", err);
    return false;
  }
  this.messages.splice(idx, 1);
  return true;
}
```

**Step 3: Refactor `removeMessagesByClient` — SQL first**

Replace lines 262-273:

```typescript
removeMessagesByClient(clientId: string): ChatMessage[] {
  const removed = this.messages.filter((m) => m.clientId === clientId);
  this.messages = this.messages.filter((m) => m.clientId !== clientId);
  try {
    this.storage.sql.exec(`DELETE FROM messages WHERE client_id = ?`, clientId);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to remove messages for client:", err);
  }
  return removed;
}
```

With:

```typescript
removeMessagesByClient(clientId: string): ChatMessage[] {
  const removed = this.messages.filter((m) => m.clientId === clientId);
  if (removed.length === 0) return [];
  try {
    this.storage.sql.exec(`DELETE FROM messages WHERE client_id = ?`, clientId);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to remove messages for client:", err);
    return [];
  }
  this.messages = this.messages.filter((m) => m.clientId !== clientId);
  return removed;
}
```

**Step 4: Refactor `renameMessagesForClient` — SQL first**

Replace lines 275-288:

```typescript
renameMessagesForClient(clientId: string, newUsername: string): void {
  for (const msg of this.messages) {
    if (msg.clientId === clientId) msg.username = newUsername;
  }
  try {
    this.storage.sql.exec(`UPDATE messages SET username = ? WHERE client_id = ?`, newUsername, clientId);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to rename messages:", err);
  }
}
```

With:

```typescript
renameMessagesForClient(clientId: string, newUsername: string): void {
  try {
    this.storage.sql.exec(`UPDATE messages SET username = ? WHERE client_id = ?`, newUsername, clientId);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to rename messages:", err);
    return;
  }
  for (const msg of this.messages) {
    if (msg.clientId === clientId) msg.username = newUsername;
  }
}
```

**Step 5: Refactor `clearAllMessages` — SQL first**

Replace lines 291-302:

```typescript
clearAllMessages(): string[] {
  const removedIds = this.messages.map((m) => m.id);
  this.messages = [];
  try {
    this.storage.sql.exec(`DELETE FROM messages`);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to clear messages:", err);
  }
  return removedIds;
}
```

With:

```typescript
clearAllMessages(): string[] {
  const removedIds = this.messages.map((m) => m.id);
  try {
    this.storage.sql.exec(`DELETE FROM messages`);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `messages: ${err}`;
    console.error("[storage] failed to clear messages:", err);
    return [];
  }
  this.messages = [];
  return removedIds;
}
```

**Step 6: Refactor `blockClient` — SQL first**

Replace lines 306-321:

```typescript
blockClient(clientId: string, username: string): void {
  this.blockedEntries.set(clientId, { username, blockedAt: Date.now() });
  try {
    this.storage.sql.exec(
      `INSERT OR REPLACE INTO blocked_clients (client_id, username, created_at) VALUES (?, ?, ?)`,
      clientId,
      username,
      this.toISOString(Date.now()),
    );
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `blocked_clients: ${err}`;
    console.error("[storage] failed to persist blocked client:", err);
  }
}
```

With:

```typescript
blockClient(clientId: string, username: string): void {
  const now = Date.now();
  try {
    this.storage.sql.exec(
      `INSERT OR REPLACE INTO blocked_clients (client_id, username, created_at) VALUES (?, ?, ?)`,
      clientId,
      username,
      this.toISOString(now),
    );
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `blocked_clients: ${err}`;
    console.error("[storage] failed to persist blocked client:", err);
    return;
  }
  this.blockedEntries.set(clientId, { username, blockedAt: now });
}
```

**Step 7: Refactor `unblockClient` — SQL first**

Replace lines 323-332:

```typescript
unblockClient(clientId: string): void {
  this.blockedEntries.delete(clientId);
  try {
    this.storage.sql.exec(`DELETE FROM blocked_clients WHERE client_id = ?`, clientId);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `blocked_clients: ${err}`;
    console.error("[storage] failed to remove blocked client:", err);
  }
}
```

With:

```typescript
unblockClient(clientId: string): void {
  try {
    this.storage.sql.exec(`DELETE FROM blocked_clients WHERE client_id = ?`, clientId);
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `blocked_clients: ${err}`;
    console.error("[storage] failed to remove blocked client:", err);
    return;
  }
  this.blockedEntries.delete(clientId);
}
```

**Step 8: Refactor `setClientMapping` — SQL first**

Replace lines 359-372:

```typescript
async setClientMapping(clientId: string, username: string): Promise<void> {
  try {
    this.storage.sql.exec(
      `INSERT INTO clients (client_id, username, last_seen_at)
       VALUES (?, ?, ?)
       ON CONFLICT(client_id) DO UPDATE SET username = excluded.username, last_seen_at = excluded.last_seen_at`,
      clientId,
      username,
      this.toISOString(Date.now()),
    );
    this._lastSaveError = null;
  } catch (err) {
    this._lastSaveError = `clients: ${err}`;
    console.error("[storage] failed to set client mapping:", err);
  }
}
```

This one is already SQL-first (no in-memory cache for client mappings). No change needed — just verify it's correct.

**Step 9: Update `handleChatMessage` in chat-room.ts to check `addMessage` return**

In `api/src/chat-room.ts`, replace lines 329-330:

```typescript
    this.storage.addMessage(message);
    this.broadcastMessage(message);
```

With:

```typescript
    if (!this.storage.addMessage(message)) return;
    this.broadcastMessage(message);
```

**Step 10: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 11: Commit**

```bash
git add api/src/chat-storage.ts api/src/chat-room.ts
git commit -m "fix: prevent in-memory/SQL desync by writing SQL before updating memory"
```

---

## Task 2: Fix `sendHistory` bypassing error-safe `send()` helper

**Files:**
- Modify: `api/src/chat-room.ts` (lines 529-532)

**Step 1: Route sendHistory through the `send()` helper**

Replace lines 529-532:

```typescript
  private sendHistory(ws: WebSocket, viewer: ConnectionInfo): void {
    const messages = this.storage.getMessages().map((m) => this.sanitizeMessage(m, viewer));
    ws.send(JSON.stringify({ type: SERVER_MESSAGE_TYPE.HISTORY, messages }));
  }
```

With:

```typescript
  private sendHistory(ws: WebSocket, viewer: ConnectionInfo): void {
    const messages = this.storage.getMessages().map((m) => this.sanitizeMessage(m, viewer));
    try {
      ws.send(JSON.stringify({ type: SERVER_MESSAGE_TYPE.HISTORY, messages }));
    } catch {
      this.spectators.delete(ws);
      this.connections.delete(ws);
    }
  }
```

Note: We can't use `this.send()` here because the history message shape (`{ type, messages }`) doesn't fit the `ServerMessage` union type cleanly. Instead, replicate the same error-handling pattern.

**Step 2: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add api/src/chat-room.ts
git commit -m "fix: add error handling to sendHistory to match send() helper"
```

---

## Task 3: Require Origin header on WebSocket connections

**Files:**
- Modify: `api/src/api.ts` (lines 73-77)
- Test: `api/src/__tests__/index.test.ts`

**Step 1: Write failing test — reject missing Origin**

In `api/src/__tests__/index.test.ts`, add a test in the WebSocket section:

```typescript
it("rejects WebSocket upgrade with no Origin header", async () => {
  const resp = await SELF.fetch("https://fake-host/ws", {
    headers: { Upgrade: "websocket" },
  });
  expect(resp.status).toBe(403);
  expect(await resp.text()).toBe("Forbidden origin");
});
```

**Step 2: Run test to verify it fails**

Run: `just api::test`
Expected: FAIL — currently returns 101 (WebSocket upgrade succeeds without Origin).

**Step 3: Fix the origin check in `api.ts`**

Replace lines 73-77 in `api/src/api.ts`:

```typescript
  const origin = request.headers.get("Origin") ?? "";
  if (origin && !isAllowedOrigin(env, origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }
```

With:

```typescript
  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedOrigin(env, origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }
```

**Step 4: Update existing tests that connect without Origin**

The existing tests in `chat-room.test.ts` use `SELF.fetch("https://fake-host/ws", { headers: { Upgrade: "websocket" } })`. These will now fail because they lack an Origin header. The `openWs()` helper needs to include it:

In `api/src/__tests__/chat-room.test.ts`, update the `openWs` helper (lines 8-16):

```typescript
async function openWs(): Promise<WebSocket> {
  const resp = await SELF.fetch("https://fake-host/ws", {
    headers: { Upgrade: "websocket", Origin: "https://thalida.com" },
  });
  const ws = resp.webSocket;
  if (!ws) throw new Error("No WebSocket returned");
  ws.accept();
  return ws;
}
```

**Step 5: Run tests to verify they pass**

Run: `just api::test`
Expected: All tests pass, including the new one.

**Step 6: Commit**

```bash
git add api/src/api.ts api/src/__tests__/index.test.ts api/src/__tests__/chat-room.test.ts
git commit -m "fix: require Origin header on WebSocket connections"
```

---

## Task 4: Add upper bound to username suffix loop

**Files:**
- Modify: `api/src/chat-room.ts` (lines 216-224)
- Modify: `api/src/config.ts` (add constant)

**Step 1: Add `MAX_USERNAME_SUFFIX` constant**

In `api/src/config.ts`, add after the `MAX_USERNAME_RETRIES` constant:

```typescript
export const MAX_USERNAME_SUFFIX = 100;
```

**Step 2: Import and use in chat-room.ts**

Update the import in `api/src/chat-room.ts` to include `MAX_USERNAME_SUFFIX`, then replace lines 216-224:

```typescript
          if (retries >= MAX_USERNAME_RETRIES) {
            // Exhausted base names — append numeric suffix
            let suffix = 1;
            const baseName = generateRandomUsername();
            name = `${baseName}-${suffix}`;
            while (await this.storage.isUsernameTaken(name, resolvedClientId, this.connections.values())) {
              suffix++;
              name = `${baseName}-${suffix}`;
            }
            break;
          }
```

With:

```typescript
          if (retries >= MAX_USERNAME_RETRIES) {
            // Exhausted base names — append numeric suffix with bounded attempts
            let suffix = 1;
            const baseName = generateRandomUsername();
            name = `${baseName}-${suffix}`;
            while (
              suffix <= MAX_USERNAME_SUFFIX &&
              await this.storage.isUsernameTaken(name, resolvedClientId, this.connections.values())
            ) {
              suffix++;
              name = `${baseName}-${suffix}`;
            }
            if (suffix > MAX_USERNAME_SUFFIX) {
              // Absolute fallback: use a UUID-based name
              name = `user-${crypto.randomUUID().slice(0, 8)}`;
            }
            break;
          }
```

**Step 3: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add api/src/config.ts api/src/chat-room.ts
git commit -m "fix: bound username suffix loop and add UUID fallback"
```

---

## Task 5: Validate message `data` fields at dispatch boundary

**Files:**
- Modify: `api/src/chat-room.ts` (lines 136-163)

**Step 1: Add string coercion for `handleDelete`, `handleFlag`, `handleDeleteByUser`**

Replace the switch cases for DELETE, FLAG, DELETE_BY_USER (lines 149-157):

```typescript
      case CLIENT_MESSAGE_TYPE.DELETE:
        this.handleDelete(ws, data as ClientDeleteData);
        break;
      case CLIENT_MESSAGE_TYPE.FLAG:
        this.handleFlag(ws, data as ClientFlagData);
        break;
      case CLIENT_MESSAGE_TYPE.DELETE_BY_USER:
        this.handleDeleteByUser(ws, data as ClientDeleteByUserData);
        break;
```

With:

```typescript
      case CLIENT_MESSAGE_TYPE.DELETE: {
        const d = data as Record<string, unknown>;
        this.handleDelete(ws, { id: String(d.id ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.FLAG: {
        const d = data as Record<string, unknown>;
        this.handleFlag(ws, { id: String(d.id ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.DELETE_BY_USER: {
        const d = data as Record<string, unknown>;
        this.handleDeleteByUser(ws, { clientId: String(d.clientId ?? "") });
        break;
      }
```

**Step 2: Restrict `context` object to only `path` in `handleChatMessage`**

In `api/src/chat-room.ts`, replace line 326:

```typescript
      ...(context?.path && /^\/[-a-z0-9._/]*$/.test(context.path) ? { context } : {}),
```

With:

```typescript
      ...(context?.path && /^\/[-a-z0-9._/]*$/.test(context.path) ? { context: { path: context.path } } : {}),
```

**Step 3: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add api/src/chat-room.ts
git commit -m "fix: validate data fields at message dispatch boundary"
```

---

## Task 6: Await all handlers in `handleMessage` and lowercase `adminUsername`

**Files:**
- Modify: `api/src/chat-room.ts` (lines 146-163, line 47)

**Step 1: Await remaining handlers**

In the switch statement, add `await` to `handleChatMessage`, `handleDelete`, `handleFlag`, `handleDeleteByUser`, `handleUnblock`. These are currently sync, but awaiting them is correct practice and prevents silent error drops if they're ever made async.

First, make the methods async:

Change `private handleChatMessage(` to `private async handleChatMessage(` (returns `Promise<void>`).
Change `private handleDelete(` to `private async handleDelete(`.
Change `private handleFlag(` to `private async handleFlag(`.
Change `private handleDeleteByUser(` to `private async handleDeleteByUser(`.
Change `private handleUnblock(` to `private async handleUnblock(`.

Then update the switch cases from Task 5 to add `await`:

```typescript
      case CLIENT_MESSAGE_TYPE.MESSAGE:
        await this.handleChatMessage(ws, data as ClientChatData);
        break;
      case CLIENT_MESSAGE_TYPE.DELETE: {
        const d = data as Record<string, unknown>;
        await this.handleDelete(ws, { id: String(d.id ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.FLAG: {
        const d = data as Record<string, unknown>;
        await this.handleFlag(ws, { id: String(d.id ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.DELETE_BY_USER: {
        const d = data as Record<string, unknown>;
        await this.handleDeleteByUser(ws, { clientId: String(d.clientId ?? "") });
        break;
      }
      case CLIENT_MESSAGE_TYPE.UNBLOCK: {
        const d = data as Record<string, unknown>;
        await this.handleUnblock(ws, String(d.clientId ?? ""));
        break;
      }
```

**Step 2: Lowercase `adminUsername` in constructor**

Replace line 47:

```typescript
    this.adminUsername = env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
```

With:

```typescript
    this.adminUsername = (env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).toLowerCase();
```

**Step 3: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add api/src/chat-room.ts
git commit -m "fix: await all message handlers and lowercase adminUsername"
```

---

## Task 7: Add CORS headers to 404 response

**Files:**
- Modify: `api/src/index.ts` (line 34)
- Test: `api/src/__tests__/index.test.ts`

**Step 1: Write failing test**

In `api/src/__tests__/index.test.ts`, add:

```typescript
it("returns CORS headers on 404", async () => {
  const resp = await SELF.fetch("https://fake-host/nonexistent", {
    headers: { Origin: "https://thalida.com" },
  });
  expect(resp.status).toBe(404);
  expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("https://thalida.com");
});
```

**Step 2: Run test to verify it fails**

Run: `just api::test`
Expected: FAIL — 404 has no CORS headers.

**Step 3: Add CORS headers to 404**

In `api/src/index.ts`, import `corsHeaders` from `./api` and update the 404 response.

First, add import:

```typescript
import {
  handleCors,
  handleWebSocket,
  handleAuth,
  handleConfig,
  handleHealthCheck,
  handleLocation,
  handleWeather,
  corsHeaders,
} from "./api";
```

Note: `corsHeaders` is not currently exported. Export it from `api.ts`:

In `api/src/api.ts`, change `function corsHeaders(` to `export function corsHeaders(`.

Then replace line 34 in `index.ts`:

```typescript
      return new Response("Not found", { status: 404 });
```

With:

```typescript
      return new Response("Not found", { status: 404, headers: corsHeaders(env, request) });
```

**Step 4: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add api/src/index.ts api/src/api.ts api/src/__tests__/index.test.ts
git commit -m "fix: add CORS headers to 404 response"
```

---

## Task 8: Log migration errors and debounce `cleanupExpiredClients`

**Files:**
- Modify: `api/src/chat-storage.ts` (lines 64-75, lines 399-406)
- Modify: `api/src/chat-room.ts` (lines 82-85)

**Step 1: Log the migration catch block**

Replace lines 73-75 in `api/src/chat-storage.ts`:

```typescript
    } catch {
      // Table doesn't exist, nothing to migrate
    }
```

With:

```typescript
    } catch (err) {
      console.error("[storage] client_mappings migration error:", err);
    }
```

**Step 2: Add cleanup debounce in ChatRoom**

Add a private field to `ChatRoom`:

```typescript
  private lastCleanupAt = 0;
```

Replace lines 82-85 in `api/src/chat-room.ts`:

```typescript
    this.storage.cleanupExpiredClients().catch((err) => {
      console.error("[clients] cleanup error:", err);
    });
```

With:

```typescript
    const now = Date.now();
    if (now - this.lastCleanupAt > 60_000) {
      this.lastCleanupAt = now;
      this.storage.cleanupExpiredClients().catch((err) => {
        console.error("[clients] cleanup error:", err);
      });
    }
```

**Step 3: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add api/src/chat-storage.ts api/src/chat-room.ts
git commit -m "fix: log migration errors and debounce client cleanup"
```

---

## Task 9: Fix duplicate event listeners on Astro page navigation

This is the most impactful app-side fix. Three files add event listeners on every `astro:page-load` without cleanup.

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.ts`
- Modify: `app/src/components/CommandPalette/CommandPalette.ts`
- Modify: `app/src/pages/index.astro`

**Step 1: Fix BaseLayout.ts — use AbortController**

Replace the entire file content of `app/src/layouts/BaseLayout/BaseLayout.ts`:

```typescript
let layoutAC: AbortController | null = null;

function initResponsiveUI() {
  layoutAC?.abort();
  layoutAC = new AbortController();
  const { signal } = layoutAC;

  const menuBtn = document.querySelector<HTMLElement>('[data-layout="menu-btn"]');
  const navPanel = document.querySelector<HTMLElement>('[data-layout="nav-panel"]');
  const navBackdrop = document.querySelector<HTMLElement>('[data-layout="nav-backdrop"]');
  const chatPanel = document.querySelector<HTMLElement>('[data-chat="panel"]');
  const chatFab = document.querySelector<HTMLElement>('[data-layout="chat-fab"]');
  const chatOverlay = document.querySelector<HTMLElement>('[data-layout="chat-overlay"]');
  const chatOverlayBackdrop = document.querySelector<HTMLElement>('[data-layout="chat-overlay-backdrop"]');
  const chatOverlayContent = document.querySelector<HTMLElement>('[data-layout="chat-overlay-content"]');

  function closeNav() {
    navPanel?.classList.remove("open");
    navBackdrop?.classList.remove("visible");
    document.body.classList.remove("overflow-hidden");
  }

  function moveChatToOverlay() {
    if (!chatPanel || !chatOverlayContent) return;
    while (chatPanel.firstChild) {
      chatOverlayContent.appendChild(chatPanel.firstChild);
    }
  }

  function moveChatBack() {
    if (!chatPanel || !chatOverlayContent) return;
    while (chatOverlayContent.firstChild) {
      chatPanel.appendChild(chatOverlayContent.firstChild);
    }
  }

  function closeChat() {
    chatOverlay?.classList.remove("open");
    chatOverlayBackdrop?.classList.remove("visible");
    moveChatBack();
    document.body.classList.remove("overflow-hidden");
  }

  function closeAll() {
    closeNav();
    closeChat();
  }

  function toggleNav() {
    const willOpen = !navPanel?.classList.contains("open");
    closeAll();
    if (willOpen) {
      navPanel?.classList.add("open");
      navBackdrop?.classList.add("visible");
      document.body.classList.add("overflow-hidden");
    }
  }

  menuBtn?.addEventListener("click", toggleNav, { signal });

  navBackdrop?.addEventListener("click", closeNav, { signal });

  navPanel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav, { signal });
  });

  function openChat() {
    closeNav();
    moveChatToOverlay();
    chatOverlay?.classList.add("open");
    chatOverlayBackdrop?.classList.add("visible");
    document.body.classList.add("overflow-hidden");
  }

  chatFab?.addEventListener("click", openChat, { signal });

  const chatOverlayClose = document.querySelector<HTMLElement>('[data-chat="overlay-close"]');
  chatOverlayClose?.addEventListener("click", closeChat, { signal });
  chatOverlayBackdrop?.addEventListener("click", closeChat, { signal });

  const xlQuery = window.matchMedia("(min-width: 1280px)");
  xlQuery.addEventListener("change", (e) => {
    if (e.matches) closeNav();
  }, { signal });

  const lgQuery = window.matchMedia("(min-width: 1024px)");
  lgQuery.addEventListener("change", (e) => {
    if (e.matches) closeChat();
  }, { signal });
}

document.addEventListener("astro:page-load", initResponsiveUI);

// Preserve nav scroll across View Transitions
let savedNavScroll = 0;
document.addEventListener("astro:before-swap", () => {
  const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
  if (nav) savedNavScroll = nav.scrollTop;
  document.body.classList.remove("overflow-hidden");
});
document.addEventListener("astro:after-swap", () => {
  const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
  if (nav) nav.scrollTop = savedNavScroll;
});
```

**Step 2: Fix CommandPalette.ts — use AbortController**

In `app/src/components/CommandPalette/CommandPalette.ts`, add an AbortController at module scope and pass `{ signal }` to all `addEventListener` calls within `initCommandPalette`. Abort the old controller at the start of each call:

Add at the top of the file (after imports):

```typescript
let cpAC: AbortController | null = null;
```

At the start of `initCommandPalette()`, add:

```typescript
  cpAC?.abort();
  cpAC = new AbortController();
  const { signal } = cpAC;
```

Then add `{ signal }` to every `addEventListener` call inside the function:
- Line 95: `input.addEventListener("input", ..., { signal });`
- Line 98: `collectionSelect.addEventListener("change", ..., { signal });`
- Line 103: `input.addEventListener("keydown", ..., { signal });`
- Line 123: `backdrop?.addEventListener("click", close, { signal });`
- Line 126: `document.addEventListener("keydown", ..., { signal });`
- Line 138-144: The forEach loop: `btn.addEventListener("click", ..., { signal });`
- Line 148-153: `tabletSearchBtn.addEventListener("click", ..., { signal });`

**Step 3: Fix index.astro — use AbortController**

In `app/src/pages/index.astro`, replace lines 126-136:

```typescript
  document.addEventListener("astro:page-load", () => {
    updateGreeting();
    const lw = document.querySelector("live-window");
    if (lw) lw.addEventListener("live-window:clock-update", updateGreeting);

    const timeline = document.querySelector(".home-timeline");
    if (timeline) {
      updateTimelineShadows();
      timeline.addEventListener("scroll", updateTimelineShadows, { passive: true });
    }
  });
```

With:

```typescript
  let homeAC: AbortController | null = null;
  document.addEventListener("astro:page-load", () => {
    homeAC?.abort();
    homeAC = new AbortController();
    const { signal } = homeAC;

    updateGreeting();
    const lw = document.querySelector("live-window");
    if (lw) lw.addEventListener("live-window:clock-update", updateGreeting, { signal });

    const timeline = document.querySelector(".home-timeline");
    if (timeline) {
      updateTimelineShadows();
      timeline.addEventListener("scroll", updateTimelineShadows, { passive: true, signal });
    }
  });
```

**Step 4: Run build to verify no TS errors**

Run: `just app::typecheck`
Expected: No errors.

**Step 5: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.ts app/src/components/CommandPalette/CommandPalette.ts app/src/pages/index.astro
git commit -m "fix: prevent duplicate event listeners on Astro page navigation"
```

---

## Task 10: Add exponential backoff to WebSocket reconnection

**Files:**
- Modify: `app/src/components/Chat/chat-connection.ts` (lines 9, 384-391)

**Step 1: Add backoff constants and state**

Replace line 9:

```typescript
const RECONNECT_DELAY_MS = 3000;
```

With:

```typescript
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 60_000;
const RECONNECT_MAX_ATTEMPTS = 20;
```

Add to the `ChatClientState` interface:

```typescript
  reconnectAttempts: number;
```

And in the initial state object:

```typescript
    reconnectAttempts: 0,
```

**Step 2: Update `scheduleReconnect` with backoff**

Replace lines 384-391:

```typescript
  function scheduleReconnect(): void {
    if (state.idleManager?.isIdle) return;
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  }
```

With:

```typescript
  function scheduleReconnect(): void {
    if (state.idleManager?.isIdle) return;
    if (state.reconnectTimer) return;
    if (state.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) return;

    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, state.reconnectAttempts), RECONNECT_MAX_MS);
    state.reconnectAttempts++;
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null;
      connect();
    }, delay);
  }
```

**Step 3: Reset attempts on successful connection**

In the `open` event handler (line 359-361), add a reset:

```typescript
    state.ws.addEventListener("open", () => {
      state.reconnectAttempts = 0;
      sendJoin();
    });
```

**Step 4: Run typecheck**

Run: `just app::typecheck`
Expected: No errors.

**Step 5: Commit**

```bash
git add app/src/components/Chat/chat-connection.ts
git commit -m "fix: add exponential backoff and max retries to WebSocket reconnection"
```

---

## Task 11: Fix BlindsComponent animation interval leak

**Files:**
- Modify: `app/src/scripts/live-window/components/BlindsComponent.ts`

**Step 1: Store interval ID as class property**

Add a private field after line 27:

```typescript
  private animationInterval: ReturnType<typeof setInterval> | null = null;
```

**Step 2: Update `stepAnimation` to store the interval**

In `stepAnimation` (line 119), change:

```typescript
      const interval = window.setInterval(() => {
```

To:

```typescript
      this.animationInterval = window.setInterval(() => {
```

And update the `clearInterval` call inside (line 140):

```typescript
          clearInterval(interval);
```

To:

```typescript
          clearInterval(this.animationInterval!);
          this.animationInterval = null;
```

**Step 3: Clear interval in `destroy()`**

Replace lines 51-57:

```typescript
  destroy(): void {
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.blindsEl = null;
    this.stringLeftEl = null;
    this.stringRightEl = null;
  }
```

With:

```typescript
  destroy(): void {
    if (this.animationInterval != null) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.blindsEl = null;
    this.stringLeftEl = null;
    this.stringRightEl = null;
  }
```

**Step 4: Run typecheck**

Run: `just app::typecheck`
Expected: No errors.

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/BlindsComponent.ts
git commit -m "fix: clear animation interval on BlindsComponent destroy"
```

---

## Task 12: Run full test suite and typecheck

**Step 1: Run API tests**

Run: `just api::test`
Expected: All pass.

**Step 2: Run App tests**

Run: `just app::test`
Expected: All pass.

**Step 3: Run typechecks**

Run: `just api::typecheck && just app::typecheck`
Expected: No errors.

**Step 4: Run app build**

Run: `just app::build`
Expected: Build succeeds.

**Step 5: Final commit (if any fixes needed)**

Only commit if tests revealed issues requiring fixes.

---

## Phase 3: Structural & Organizational Cleanup

---

## Task 13: Split `api.ts` into focused modules

`api.ts` mixes 6 concerns: auth, CORS, rate limiting, config,
weather proxy, and location proxy. Split into focused files.

**Files:**
- Modify: `api/src/api.ts` (keep CORS utils + WebSocket handler)
- Create: `api/src/auth.ts` (auth handler + rate limiting)
- Create: `api/src/proxy.ts` (weather + location handlers)
- Modify: `api/src/index.ts` (update imports)

**Step 1: Create `api/src/auth.ts`**

Move the auth rate limiting state and functions (lines 5-35) plus
`handleAuth` (lines 84-110) into a new file:

```typescript
import type { Env, AuthRequest } from "./types";
import { ADMIN_USERNAME } from "./config";
import { createSessionToken, timingSafeEqual } from "./session";

// Auth rate limiting: max 10 failed attempts per IP in 5-min window
const AUTH_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_FAILURES = 10;
const authFailures = new Map<string, number[]>();

function isAuthRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - AUTH_RATE_LIMIT_WINDOW_MS;
  let times = authFailures.get(ip);

  if (!times) return false;

  times = times.filter((t) => t >= cutoff);
  if (times.length === 0) {
    authFailures.delete(ip);
    return false;
  }
  authFailures.set(ip, times);

  return times.length >= AUTH_RATE_LIMIT_MAX_FAILURES;
}

function recordAuthFailure(ip: string): void {
  let times = authFailures.get(ip);
  if (!times) {
    times = [];
    authFailures.set(ip, times);
  }
  times.push(Date.now());
}

export async function handleAuth(
  env: Env,
  request: Request,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

  if (isAuthRateLimited(ip)) {
    return jsonResponse(
      { error: "Too many attempts. Try again later." },
      429,
      corsHeaders,
    );
  }

  try {
    const body = (await request.json()) as AuthRequest;

    if (
      typeof body.token === "string" &&
      body.token.length > 0 &&
      (await timingSafeEqual(body.token, env.ADMIN_PASSWORD))
    ) {
      const sessionToken = await createSessionToken(env.SIGNING_SECRET);
      return jsonResponse({ sessionToken }, 200, corsHeaders);
    }

    recordAuthFailure(ip);
    return jsonResponse({}, 401, corsHeaders);
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400, corsHeaders);
  }
}

function jsonResponse(
  body: object,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
```

**Step 2: Create `api/src/proxy.ts`**

Move `handleLocation` (lines 121-158) and `handleWeather`
(lines 160-218) into a new file:

```typescript
import type { Env } from "./types";

const ALLOWED_UNITS = ["metric", "imperial", "standard"];

function jsonResponse(
  body: object,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export async function handleLocation(
  env: Env,
  request: Request,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!env.IPREGISTRY_KEY) {
    return jsonResponse(
      { error: "Location service not configured" },
      503,
      corsHeaders,
    );
  }

  const rawIp = request.headers.get("CF-Connecting-IP") ?? "";
  const ip = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fd|fc)/
    .test(rawIp)
    ? ""
    : rawIp;

  try {
    const res = await fetch(
      `https://api.ipregistry.co/${ip}?key=${env.IPREGISTRY_KEY}&fields=location,time_zone`,
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`[location] IP Registry error ${res.status}: ${body}`);
      return jsonResponse(
        { error: "Upstream location service error" },
        502,
        corsHeaders,
      );
    }

    const data = (await res.json()) as {
      location?: {
        latitude?: number;
        longitude?: number;
        country?: { code?: string };
        city?: string;
      };
      time_zone?: { id?: string };
    };

    return jsonResponse(
      {
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
        country: data.location?.country?.code ?? null,
        name: data.location?.city ?? null,
        timezone: data.time_zone?.id ?? null,
      },
      200,
      corsHeaders,
    );
  } catch {
    return jsonResponse(
      { error: "Location lookup failed" },
      502,
      corsHeaders,
    );
  }
}

export async function handleWeather(
  env: Env,
  request: Request,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!env.OPENWEATHER_KEY) {
    return jsonResponse(
      { error: "Weather service not configured" },
      503,
      corsHeaders,
    );
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const units = url.searchParams.get("units") || "metric";

  if (!lat || !lon) {
    return jsonResponse(
      { error: "lat and lon query params required" },
      400,
      corsHeaders,
    );
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (
    Number.isNaN(latNum) ||
    Number.isNaN(lonNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lonNum < -180 ||
    lonNum > 180
  ) {
    return jsonResponse(
      { error: "lat must be -90..90 and lon must be -180..180" },
      400,
      corsHeaders,
    );
  }

  if (!ALLOWED_UNITS.includes(units)) {
    return jsonResponse(
      { error: `units must be one of: ${ALLOWED_UNITS.join(", ")}` },
      400,
      corsHeaders,
    );
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?` +
        `units=${encodeURIComponent(units)}` +
        `&lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lon)}` +
        `&appid=${env.OPENWEATHER_KEY}`,
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[weather] OpenWeather error ${res.status}: ${body}`,
      );
      return jsonResponse(
        { error: "Upstream weather service error" },
        502,
        corsHeaders,
      );
    }

    const data = (await res.json()) as {
      weather?: Array<{
        main?: string;
        description?: string;
        icon?: string;
      }>;
      main?: { temp?: number };
      sys?: { sunrise?: number; sunset?: number };
    };

    return jsonResponse(
      {
        main: data.weather?.[0]?.main ?? null,
        description: data.weather?.[0]?.description ?? null,
        icon: data.weather?.[0]?.icon ?? null,
        temp: data.main?.temp ?? null,
        sunrise: data.sys?.sunrise ?? null,
        sunset: data.sys?.sunset ?? null,
      },
      200,
      corsHeaders,
    );
  } catch {
    return jsonResponse(
      { error: "Weather lookup failed" },
      502,
      corsHeaders,
    );
  }
}
```

**Step 3: Slim down `api.ts`**

Remove auth, location, weather code from `api.ts`. It should only
contain: `isAllowedOrigin`, `corsHeaders`, `jsonResponse`,
`handleCors`, `handleWebSocket`, `handleConfig`, `handleHealthCheck`.

Also update the handler signatures — `handleAuth`, `handleLocation`,
`handleWeather` now take `corsHeaders` as a parameter instead of
computing them internally.

**Step 4: Update `index.ts` imports**

```typescript
export { ChatRoom } from "./chat-room";
export type * from "./types";

import type { Env } from "./types";
import {
  handleCors,
  handleWebSocket,
  handleConfig,
  handleHealthCheck,
  corsHeaders,
} from "./api";
import { handleAuth } from "./auth";
import { handleLocation } from "./proxy";
import { handleWeather } from "./proxy";
```

Update the route handler to pass `corsHeaders(env, request)` to
`handleAuth`, `handleLocation`, `handleWeather`.

**Step 5: Run tests**

Run: `just api::test`
Expected: All tests pass (no behavior changes).

**Step 6: Commit**

```bash
git add api/src/api.ts api/src/auth.ts api/src/proxy.ts api/src/index.ts
git commit -m "refactor: split api.ts into auth.ts and proxy.ts"
```

---

## Task 14: Extract identity + username resolution from `handleJoin`

`handleJoin` is 86 lines mixing identity resolution, username
generation, and connection setup. Extract the first two into
focused private methods.

**Files:**
- Modify: `api/src/chat-room.ts` (lines 166-252)

**Step 1: Extract `resolveClientIdentity`**

Add a new private method to `ChatRoom`:

```typescript
private async resolveClientIdentity(
  clientId: unknown,
  clientToken: unknown,
): Promise<{ resolvedClientId: string; isNewClient: boolean }> {
  if (
    typeof clientId === "string" &&
    clientId.length > 0 &&
    typeof clientToken === "string" &&
    clientToken.length > 0
  ) {
    const tokenValid = await verifyClientToken(
      clientId,
      clientToken,
      this.env.SIGNING_SECRET,
    );
    if (tokenValid && (await this.storage.hasClient(clientId))) {
      return { resolvedClientId: clientId, isNewClient: false };
    }
  }
  return { resolvedClientId: crypto.randomUUID(), isNewClient: true };
}
```

**Step 2: Extract `resolveUsername`**

Add a new private method:

```typescript
private async resolveUsername(
  resolvedClientId: string,
): Promise<string> {
  const mapping = await this.storage.getClientMapping(resolvedClientId);
  if (mapping) {
    await this.storage.setClientMapping(resolvedClientId, mapping.username);
    return mapping.username;
  }

  let name = generateRandomUsername();
  let retries = 0;
  while (
    await this.storage.isUsernameTaken(
      name,
      resolvedClientId,
      this.connections.values(),
    )
  ) {
    retries++;
    if (retries >= MAX_USERNAME_RETRIES) {
      let suffix = 1;
      const baseName = generateRandomUsername();
      name = `${baseName}-${suffix}`;
      while (
        suffix <= MAX_USERNAME_SUFFIX &&
        await this.storage.isUsernameTaken(
          name,
          resolvedClientId,
          this.connections.values(),
        )
      ) {
        suffix++;
        name = `${baseName}-${suffix}`;
      }
      if (suffix > MAX_USERNAME_SUFFIX) {
        name = `user-${crypto.randomUUID().slice(0, 8)}`;
      }
      break;
    }
    name = generateRandomUsername();
  }
  await this.storage.setClientMapping(resolvedClientId, name);
  return name;
}
```

**Step 3: Simplify `handleJoin`**

Replace the body of `handleJoin` to use the extracted methods:

```typescript
private async handleJoin(
  ws: WebSocket,
  { token, clientId, clientToken }: ClientJoinData,
): Promise<void> {
  let isOwner = false;
  if (typeof token === "string" && token.length > 0) {
    isOwner = await verifySessionToken(token, this.env.SIGNING_SECRET);
  }

  const { resolvedClientId, isNewClient } =
    await this.resolveClientIdentity(clientId, clientToken);

  const resolvedClientToken = isNewClient
    ? await createClientToken(resolvedClientId, this.env.SIGNING_SECRET)
    : undefined;

  const isBlocked =
    !isOwner && this.storage.isBlocked(resolvedClientId);

  const name = isOwner
    ? this.adminUsername
    : await this.resolveUsername(resolvedClientId);

  this.spectators.delete(ws);
  this.connections.set(ws, {
    clientId: resolvedClientId,
    username: name,
    isOwner,
    warnings: 0,
    isBlocked,
  });

  const connInfo = this.connections.get(ws);
  this.send(ws, {
    type: SERVER_MESSAGE_TYPE.JOINED,
    isOwner,
    username: name,
    isBlocked,
    ...(isNewClient
      ? { clientId: resolvedClientId, clientToken: resolvedClientToken }
      : {}),
  });
  if (connInfo) this.sendHistory(ws, connInfo);
  this.broadcastStatus();
}
```

**Step 4: Run tests**

Run: `just api::test`
Expected: All tests pass (pure refactor, no behavior change).

**Step 5: Commit**

```bash
git add api/src/chat-room.ts
git commit -m "refactor: extract resolveClientIdentity and resolveUsername from handleJoin"
```

---

## Task 15: Centralize rate limit + operational constants in `config.ts`

Rate limit constants are scattered across `api.ts`, `chat-room.ts`,
and `session.ts`. Move them all to `config.ts` for discoverability.

**Files:**
- Modify: `api/src/config.ts`
- Modify: `api/src/auth.ts` (after Task 13)
- Modify: `api/src/chat-room.ts`
- Modify: `api/src/session.ts`

**Step 1: Add constants to `config.ts`**

Add at the top of `api/src/config.ts`:

```typescript
// ── Operational Tuning ──────────────────────────────────────────
export const SESSION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const AUTH_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX_FAILURES = 10;
export const CHAT_RATE_LIMIT_WINDOW_MS = 1000;
export const CHAT_RATE_LIMIT_MAX_MESSAGES = 5;
```

Also add a comment linking the two identical 30-day values:

```typescript
// Both intentionally 30 days — messages and username reservations
// expire on the same schedule
export const MESSAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
// ...
export const RESERVATION_DURATION_MS = MESSAGE_RETENTION_MS;
```

**Step 2: Import from config in consuming files**

In `session.ts`, replace `const SESSION_TOKEN_TTL_MS = ...` with
an import from `./config`.

In `auth.ts`, replace the local constants with imports from
`./config`.

In `chat-room.ts`, replace lines 31-32 with imports from `./config`.

**Step 3: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add api/src/config.ts api/src/auth.ts api/src/chat-room.ts api/src/session.ts
git commit -m "refactor: centralize rate limit and TTL constants in config.ts"
```

---

## Task 16: Remove dead code — `lastSaveError`, unused returns, unused types

**Files:**
- Modify: `api/src/chat-storage.ts`
- Modify: `api/src/chat-moderation.ts`
- Modify: `api/src/chat-room.ts`

**Step 1: Remove `_lastSaveError` field and getter**

In `chat-storage.ts`:
- Remove line 21: `private _lastSaveError: string | null = null;`
- Remove lines 28-30: the `lastSaveError` getter
- In every catch block, remove `this._lastSaveError = ...` lines
  (both the error assignment and the `= null` success reset).
  Keep only `console.error(...)` and `return`.

**Step 2: Remove unused `clearAllMessages` return value**

Change `clearAllMessages(): string[]` to `clearAllMessages(): void`.
Remove the `removedIds` tracking. The caller in `chat-room.ts`
(`clearMessages`) already ignores the return and broadcasts
`SERVER_MESSAGE_TYPE.CLEAR` directly.

**Step 3: Remove unused `ModerationResult.categories`**

In `chat-moderation.ts`, simplify the interface:

```typescript
export interface ModerationResult {
  flagged: boolean;
}
```

Update `callModerationAPI` to only return `{ flagged }` instead
of `{ flagged, categories }`.

**Step 4: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add api/src/chat-storage.ts api/src/chat-moderation.ts api/src/chat-room.ts
git commit -m "refactor: remove dead code — lastSaveError, unused returns, unused types"
```

---

## Task 17: Remove unnecessary `async` from ChatStorage methods

5 methods are declared `async` but contain no `await` — the SQL
operations in Durable Objects are synchronous.

**Files:**
- Modify: `api/src/chat-storage.ts`

**Step 1: Remove `async` from sync methods**

Change these method signatures:
- `async getClientMapping(...)` → `getClientMapping(...)`
  (return `ClientMapping | undefined` instead of
  `Promise<ClientMapping | undefined>`)
- `async setClientMapping(...)` → `setClientMapping(...)`
  (return `void` instead of `Promise<void>`)
- `async isUsernameTaken(...)` → `isUsernameTaken(...)`
  (return `boolean` instead of `Promise<boolean>`)
- `async cleanupExpiredClients()` → `cleanupExpiredClients()`
  (return `void` instead of `Promise<void>`)
- `async hasClient(...)` → `hasClient(...)`
  (return `boolean` instead of `Promise<boolean>`)

**Step 2: Update callers in `chat-room.ts`**

Remove `await` from calls to these methods. Since some are already
awaited (e.g., `await this.storage.isUsernameTaken(...)` in
`handleJoin`), removing `await` on a non-Promise is safe — it
just removes the unnecessary microtask scheduling.

Also update the `cleanupExpiredClients` call in `fetch()` — since
it's no longer async, the `.catch()` wrapper is unnecessary:

```typescript
if (now - this.lastCleanupAt > 60_000) {
  this.lastCleanupAt = now;
  try {
    this.storage.cleanupExpiredClients();
  } catch (err) {
    console.error("[clients] cleanup error:", err);
  }
}
```

**Step 3: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add api/src/chat-storage.ts api/src/chat-room.ts
git commit -m "refactor: remove unnecessary async from synchronous ChatStorage methods"
```

---

## Task 18: Remove dual import paths for format utilities

`nav-data.ts` re-exports `isValidDate`, `formatDate`,
`categoryDisplay` from `format-utils.ts`. Some consumers import
from `nav-data`, others from `format-utils`. Remove the re-exports
and standardize.

**Files:**
- Modify: `app/src/lib/nav-data.ts` (line 100)
- Modify: `app/src/components/Card/CompactCard.astro`
- Modify: `app/src/components/Card/GalleryCard.astro`
- Modify: `app/src/components/Card/LinkCard.astro`
- Modify: `app/src/components/Card/StackedCard.astro`
- Modify: `app/src/components/CategoryFilter/CategoryFilter.astro`
- Modify: `app/src/pages/[collection]/[category]/[...page].astro`

**Step 1: Remove re-exports from `nav-data.ts`**

Delete line 100 from `app/src/lib/nav-data.ts`:

```typescript
export { isValidDate, formatDate, categoryDisplay } from "./format-utils";
```

**Step 2: Update imports in consumers**

In each file that imported from `@lib/nav-data`, change to import
from `@lib/format-utils` instead. For example, in
`CompactCard.astro`, if it has:

```typescript
import { isValidDate, formatDate } from "@lib/nav-data";
```

Change to:

```typescript
import { isValidDate, formatDate } from "@lib/format-utils";
```

Do the same for all affected files.

**Step 3: Run typecheck and build**

Run: `just app::typecheck && just app::build`
Expected: No errors.

**Step 4: Commit**

```bash
git add app/src/lib/nav-data.ts app/src/components/ app/src/pages/
git commit -m "refactor: remove format utility re-exports from nav-data"
```

---

## Task 19: Use `getDefaultSunTimes()` in Sun/Moon layers

`SunLayer.ts` and `MoonLayer.ts` inline the `6 AM / 6 PM` fallback
instead of using the existing `getDefaultSunTimes()` from
`sky-gradient.ts`.

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/SunLayer.ts`
- Modify: `app/src/scripts/live-window/components/sky/MoonLayer.ts`

**Step 1: Update SunLayer.ts**

Add import:

```typescript
import { getDefaultSunTimes } from "../../utils/sky-gradient";
```

Replace the inline fallback (line 17):

```typescript
const sr = sunrise ?? new Date(now).setHours(6, 0, 0, 0);
```

With:

```typescript
const defaults = getDefaultSunTimes();
const sr = sunrise ?? defaults.sunrise;
```

And similarly for sunset on the next line.

**Step 2: Update MoonLayer.ts**

Same pattern — import `getDefaultSunTimes` and replace the
inline fallback on line 18-19.

**Step 3: Run tests and typecheck**

Run: `just app::test && just app::typecheck`
Expected: All pass.

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/
git commit -m "refactor: use getDefaultSunTimes() instead of inline fallback"
```

---

## Task 20: Make `SearchItem` extend `NavItem` + remove dead exports

**Files:**
- Modify: `app/src/components/CommandPalette/command-palette-search.ts`
- Modify: `app/src/components/Chat/chat-utils.ts`
- Modify: `app/src/scripts/live-window/api.ts`
- Modify: `app/src/scripts/live-window/utils/sky-gradient.ts`
- Modify: `app/src/scripts/live-window/utils/stars.ts`

**Step 1: Make `SearchItem` extend `NavItem`**

In `command-palette-search.ts`, replace:

```typescript
export interface SearchItem {
  id: string;
  collection: string;
  collectionTitle: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  coverImageSrc?: string;
  publishedOn: string;
  faviconUrl?: string;
}
```

With:

```typescript
import type { NavItem } from "@lib/nav-data";

export type SearchItem = NavItem & { collectionTitle: string };
```

**Step 2: Remove unused `SS_SESSION_TOKEN_KEY` re-export**

In `app/src/components/Chat/chat-utils.ts`, remove line 1:

```typescript
export { SS_SESSION_TOKEN_KEY } from "@lib/constants";
```

**Step 3: Remove unused `tempSymbol` export**

In `app/src/scripts/live-window/api.ts`, remove the
`tempSymbol` function (lines 24-26). It is exported but never
imported anywhere.

**Step 4: Remove unused type re-exports**

In `app/src/scripts/live-window/utils/sky-gradient.ts`, remove:

```typescript
export type { RGB, SkyGradient } from "../types";
```

In `app/src/scripts/live-window/utils/stars.ts`, remove:

```typescript
export type { Star } from "../types";
```

**Step 5: Run tests and typecheck**

Run: `just app::test && just app::typecheck`
Expected: All pass.

**Step 6: Commit**

```bash
git add app/src/components/CommandPalette/command-palette-search.ts \
       app/src/components/Chat/chat-utils.ts \
       app/src/scripts/live-window/api.ts \
       app/src/scripts/live-window/utils/sky-gradient.ts \
       app/src/scripts/live-window/utils/stars.ts
git commit -m "refactor: extend NavItem for SearchItem, remove dead exports"
```

---

## Task 21: Final full verification

**Step 1: Run API tests**

Run: `just api::test`
Expected: All pass.

**Step 2: Run App tests**

Run: `just app::test`
Expected: All pass.

**Step 3: Run typechecks**

Run: `just api::typecheck && just app::typecheck`
Expected: No errors.

**Step 4: Run app build**

Run: `just app::build`
Expected: Build succeeds.
