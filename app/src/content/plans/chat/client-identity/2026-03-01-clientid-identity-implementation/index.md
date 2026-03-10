---
title: clientId-Based Identity Implementation Plan
description: Replace IP-based identity with clientId throughout the chat system
  so flag, block, delete-by-user, and rename operate per-browser, and users on
  the same network are independent.
publishedOn: 2026-03-01T05:26:02.000Z
tags:
  - implementation
---

# clientId-Based Identity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace IP-based identity with clientId throughout the chat system so flag, block, delete-by-user, and rename operate per-browser, and users on the same network are independent.

**Architecture:** Store `clientId` on every `ChatMessage`. Rekey `blockedEntries` from IP to clientId. Remove all IP plumbing (`ipBySocket`, `CF-Connecting-IP`, `ConnectionInfo.ip`). Add a `rename` server message type broadcast when a user changes their username, so all clients update old messages in real time.

**Tech Stack:** TypeScript, Cloudflare Durable Objects (API), Astro + vanilla TS (frontend), Vitest (tests)

---

### Task 1: Update types (types.ts)

**Files:**
- Modify: `api/src/types.ts`

**Step 1: Add clientId to ChatMessage**

```typescript
// In ChatMessage interface (line 7-14), add clientId:
export interface ChatMessage {
  type: "message";
  id: string;
  clientId: string;
  username: string;
  text: string;
  timestamp: number;
  context?: MessageContext;
}
```

**Step 2: Remove ip from ConnectionInfo, make clientId required**

```typescript
// Replace ConnectionInfo (line 16-23) with:
export interface ConnectionInfo {
  clientId: string;
  username: string;
  isOwner: boolean;
  warnings: number;
  isBlocked: boolean;
}
```

**Step 3: Change ClientDeleteByUserData from username to clientId**

```typescript
// Replace ClientDeleteByUserData (line 57-59) with:
export interface ClientDeleteByUserData {
  clientId: string;
}
```

**Step 4: Change ClientUnblockData from ip to clientId**

```typescript
// Replace ClientUnblockData (line 61-63) with:
export interface ClientUnblockData {
  clientId: string;
}
```

**Step 5: Add RENAME to SERVER_MESSAGE_TYPE**

```typescript
// Add to SERVER_MESSAGE_TYPE object (after MESSAGE):
  RENAME: "rename",
```

**Step 6: Add ServerRenameMessage interface**

```typescript
// After ServerFlaggedMessage (around line 164-169), add:
export interface ServerRenameMessage {
  type: "rename";
  oldUsername: string;
  newUsername: string;
}
```

**Step 7: Update ServerFlaggedMessage — ip → clientId**

```typescript
export interface ServerFlaggedMessage {
  type: "flagged";
  username: string;
  clientId: string;
  messageId: string;
}
```

**Step 8: Update BlockedEntry — ip → clientId**

```typescript
export interface BlockedEntry {
  clientId: string;
  username: string;
  blockedAt: number;
}
```

**Step 9: Update ServerUnblockedMessage — ip → clientId**

```typescript
export interface ServerUnblockedMessage {
  type: "unblocked";
  clientId: string;
}
```

**Step 10: Add ServerRenameMessage to ServerMessage union**

```typescript
// In the ServerMessage union type, add:
  | ServerRenameMessage
```

**Step 11: Run typecheck to see what breaks**

Run: `just api::typecheck`
Expected: Type errors in `chat-room.ts` and `commands.ts` (this is expected — we fix those next)

**Step 12: Commit**

```bash
git add api/src/types.ts
git commit -m "refactor(types): replace IP with clientId, add rename message type"
```

---

### Task 2: Update server (chat-room.ts)

**Files:**
- Modify: `api/src/chat-room.ts`

**Step 1: Remove ipBySocket map and rekey blockedEntries**

Replace the class properties (lines 37-42):

```typescript
// Remove: private ipBySocket: Map<WebSocket, string> = new Map();
// Change blockedEntries key from IP string to clientId string:
private blockedEntries: Map<string, { username: string; blockedAt: number }> = new Map();
```

(blockedEntries type stays the same, just the key semantics change from IP to clientId.)

**Step 2: Update loadBlockedIps → loadBlockedClients**

Rename method and update to handle clientId-keyed entries. Drop old IP-keyed entries (no migration path):

```typescript
private async loadBlockedClients(): Promise<void> {
  if (this.blockedIpsLoaded) return;
  const stored = await this.state.storage.get<unknown>(BLOCKED_IPS_KEY);
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      if (entry && typeof entry === "object" && "clientId" in entry) {
        const e = entry as { clientId: string; username: string; blockedAt: number };
        this.blockedEntries.set(e.clientId, { username: e.username, blockedAt: e.blockedAt });
      }
      // Old IP-keyed entries (plain strings or {ip,...}) are silently dropped
    }
  }
  this.blockedIpsLoaded = true;
}
```

**Step 3: Update persistBlockedIps → persistBlockedClients**

```typescript
private async persistBlockedClients(): Promise<void> {
  const entries = [...this.blockedEntries.entries()].map(([clientId, info]) => ({
    clientId,
    username: info.username,
    blockedAt: info.blockedAt,
  }));
  await this.state.storage.put(BLOCKED_IPS_KEY, entries);
}
```

(Keep using the same storage key `BLOCKED_IPS_KEY` to avoid needing a migration — the old data is simply dropped on next load.)

**Step 4: Update fetch() — remove IP handling**

Remove the `CF-Connecting-IP` header read and `ipBySocket` set. The connection starts as a spectator with no identity until join:

```typescript
async fetch(request: Request): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  await this.loadBlockedClients();
  this.cleanupExpiredReservations().catch((err) => {
    console.error("[reservations] cleanup error:", err);
  });

  const [client, server] = Object.values(new WebSocketPair());

  server.accept();

  this.spectators.add(server);
  this.sendStatus(server);

  server.addEventListener("message", (event) => {
    this.handleMessage(server, event.data);
  });

  server.addEventListener("close", () => {
    this.removeConnection(server);
  });

  server.addEventListener("error", () => {
    this.removeConnection(server);
  });

  return new Response(null, { status: 101, webSocket: client });
}
```

**Step 5: Update handleJoin — clientId-based blocking and rename support**

```typescript
private async handleJoin(ws: WebSocket, { username, token, clientId }: ClientJoinData): Promise<void> {
  const isOwner = typeof token === "string" && token.length > 0 && token === this.env.ADMIN_SECRET;

  const resolvedClientId = clientId ?? crypto.randomUUID();
  const isBlocked = !isOwner && this.blockedEntries.has(resolvedClientId);

  const name = isOwner
    ? ADMIN_USERNAME
    : String(username ?? "")
        .trim()
        .toLowerCase();

  const usernamePattern = new RegExp(`^[a-z0-9_\\-.]{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`);
  if (!usernamePattern.test(name)) {
    this.sendError(
      ws,
      SERVER_ERROR_CODE.INVALID_USERNAME,
      `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters: lowercase letters, numbers, hyphens, underscores, or dots.`,
    );
    return;
  }

  if (name.includes(ADMIN_USERNAME) && !isOwner) {
    this.sendError(ws, SERVER_ERROR_CODE.RESERVED_USERNAME, "That name contains a reserved word.");
    return;
  }

  for (const [existingWs, info] of this.connections) {
    if (info.username === name && existingWs !== ws && !(isOwner && info.isOwner)) {
      if (resolvedClientId && info.clientId === resolvedClientId) continue;
      this.sendError(ws, SERVER_ERROR_CODE.TAKEN_USERNAME, "That name is already taken.");
      return;
    }
  }

  if (!isOwner && resolvedClientId) {
    const reservation = await this.getReservation(name);
    if (reservation) {
      const expired = Date.now() - reservation.lastSeen > RESERVATION_DURATION_MS;
      if (reservation.clientId === resolvedClientId && expired) {
        this.sendError(ws, SERVER_ERROR_CODE.EXPIRED_USERNAME, "Your reserved username has expired.");
        return;
      }
      if (reservation.clientId !== resolvedClientId && !expired) {
        this.sendError(ws, SERVER_ERROR_CODE.TAKEN_USERNAME, "That name is already taken.");
        return;
      }
    }
    await this.upsertReservation(name, resolvedClientId);
  }

  // Detect rename: same clientId, different username
  const existingConn = this.connections.get(ws);
  const oldUsername = existingConn?.clientId === resolvedClientId ? existingConn.username : undefined;
  const isRename = oldUsername != null && oldUsername !== name;

  if (isRename) {
    // Update all stored messages from this clientId
    for (const msg of this.messages) {
      if (msg.clientId === resolvedClientId) {
        msg.username = name;
      }
    }
    // Broadcast rename to all clients
    this.broadcast({ type: SERVER_MESSAGE_TYPE.RENAME, oldUsername: oldUsername!, newUsername: name });
  }

  this.spectators.delete(ws);
  this.connections.set(ws, {
    clientId: resolvedClientId,
    username: name,
    isOwner,
    warnings: 0,
    isBlocked,
  });

  this.send(ws, { type: SERVER_MESSAGE_TYPE.JOINED, isOwner, username: name, isBlocked });
  this.send(ws, { type: SERVER_MESSAGE_TYPE.HISTORY, messages: this.messages });
  this.broadcastStatus();
}
```

**Step 6: Update handleChatMessage — store clientId on message**

```typescript
private handleChatMessage(ws: WebSocket, { text: rawText, context }: ClientChatData): void {
  const info = this.connections.get(ws);
  if (!info) return;

  const text = String(rawText ?? "")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
  if (!text) return;

  if (info.isOwner && text.startsWith("/")) {
    if (dispatch(text, ws, this)) return;
  }

  const message: ChatMessage = {
    type: SERVER_MESSAGE_TYPE.MESSAGE,
    id: uuidv7(),
    clientId: info.clientId,
    username: info.username,
    text,
    timestamp: Date.now(),
    ...(context?.path && /^\/[-a-z0-9._/]*$/.test(context.path) ? { context } : {}),
  };

  this.messages.push(message);
  if (this.messages.length > MAX_MESSAGES) {
    this.messages.shift();
  }

  this.broadcast(message);

  this.moderate(message, ws).catch((err) => {
    console.error("[moderation] unexpected error:", err);
  });
}
```

**Step 7: Update handleFlag — find target by clientId from message**

```typescript
private handleFlag(ws: WebSocket, { id }: ClientFlagData): void {
  const info = this.connections.get(ws);
  if (!info?.isOwner) return;

  const message = this.messages.find((m) => m.id === id);
  if (!message) return;

  const targetClientId = message.clientId;
  if (!targetClientId) return;

  // Block the clientId
  this.blockedEntries.set(targetClientId, { username: message.username, blockedAt: Date.now() });
  this.persistBlockedClients().catch((err) => {
    console.error("[flag] failed to persist blocked client:", err);
  });

  // Send BLOCKED to all of the target's sockets
  for (const [targetWs, connInfo] of this.connections) {
    if (connInfo.clientId === targetClientId && !connInfo.isOwner) {
      this.sendBlocked(targetWs);
      connInfo.isBlocked = true;
    }
  }

  // Respond to admin
  this.send(ws, {
    type: SERVER_MESSAGE_TYPE.FLAGGED,
    username: message.username,
    clientId: targetClientId,
    messageId: id,
  });
}
```

**Step 8: Update handleDeleteByUser — match by clientId**

```typescript
private handleDeleteByUser(ws: WebSocket, { clientId: targetClientId }: ClientDeleteByUserData): void {
  const info = this.connections.get(ws);
  if (!info?.isOwner) return;

  const toRemove = this.messages.filter((m) => m.clientId === targetClientId);
  this.messages = this.messages.filter((m) => m.clientId !== targetClientId);

  for (const msg of toRemove) {
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id: msg.id });
  }
}
```

**Step 9: Update handleUnblock — clientId instead of IP**

```typescript
private handleUnblock(ws: WebSocket, clientId: string): void {
  const info = this.connections.get(ws);
  if (!info?.isOwner) {
    this.sendError(ws, SERVER_ERROR_CODE.UNAUTHORIZED, "Only the owner can unblock users.");
    return;
  }

  this.blockedEntries.delete(clientId);
  this.persistBlockedClients().catch((err) => {
    console.error("[unblock] failed to persist unblock:", err);
  });
  this.send(ws, { type: SERVER_MESSAGE_TYPE.UNBLOCKED, clientId });

  for (const [sock, connInfo] of this.connections) {
    if (connInfo.clientId === clientId && connInfo.isBlocked) {
      connInfo.isBlocked = false;
      this.send(sock, {
        type: SERVER_MESSAGE_TYPE.JOINED,
        isOwner: false,
        username: connInfo.username,
        isBlocked: false,
      });
      this.send(sock, {
        type: SERVER_MESSAGE_TYPE.WARNING,
        code: SERVER_ERROR_CODE.UNBLOCKED,
        message: "You have been unblocked.",
      });
    }
  }
}
```

**Step 10: Update addWarning — block by clientId**

```typescript
private addWarning(ws: WebSocket): void {
  const info = this.connections.get(ws);
  if (!info) return;

  info.warnings++;

  if (info.warnings >= MAX_WARNINGS) {
    info.isBlocked = true;
    this.blockedEntries.set(info.clientId, { username: info.username, blockedAt: Date.now() });
    this.persistBlockedClients().catch((err) => {
      console.error("[block] failed to persist blocked client:", err);
    });
    this.sendBlocked(ws);
  } else {
    const remaining = MAX_WARNINGS - info.warnings;
    this.sendWarning(
      ws,
      SERVER_ERROR_CODE.MODERATION_WARNING,
      `Your message was removed for violating community guidelines. ${remaining} warning${remaining !== 1 ? "s" : ""} remaining before you are blocked.`,
    );
  }
}
```

**Step 11: Update getBlockedEntries — return clientId**

```typescript
getBlockedEntries(): BlockedEntry[] {
  return [...this.blockedEntries.entries()].map(([clientId, info]) => ({
    clientId,
    username: info.username,
    blockedAt: info.blockedAt,
  }));
}
```

**Step 12: Update removeConnection — remove ipBySocket cleanup**

```typescript
private removeConnection(ws: WebSocket): void {
  this.spectators.delete(ws);
  this.connections.delete(ws);
  this.broadcastStatus();
}
```

**Step 13: Update buildStatusMessage — dedup by clientId**

```typescript
private buildStatusMessage(): ServerMessage {
  let isOwnerOnline = false;
  const uniqueClients = new Set<string>();
  for (const info of this.connections.values()) {
    if (info.isOwner) isOwnerOnline = true;
    uniqueClients.add(info.clientId);
  }
  return { type: SERVER_MESSAGE_TYPE.STATUS, isOwnerOnline, userCount: uniqueClients.size };
}
```

**Step 14: Update commands.ts description**

In `api/src/commands.ts` line 29, change the description:

```typescript
description: "List all blocked users",
```

**Step 15: Run typecheck**

Run: `just api::typecheck`
Expected: PASS (no type errors)

**Step 16: Commit**

```bash
git add api/src/chat-room.ts api/src/commands.ts
git commit -m "refactor(api): replace IP with clientId for blocking, add rename support"
```

---

### Task 3: Update client (chat-client.ts)

**Files:**
- Modify: `app/src/components/Chat/chat-client.ts`

**Step 1: Update ServerMessage type — add rename, change ip → clientId**

```typescript
type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | {
      type: "message";
      id: string;
      clientId: string;
      username: string;
      text: string;
      timestamp: number;
      context?: MessageContext;
    }
  | { type: "joined"; isOwner: boolean; username: string; isBlocked: boolean }
  | { type: "status"; isOwnerOnline: boolean; userCount: number }
  | { type: "error"; code: string; message: string }
  | { type: "remove"; id: string }
  | { type: "warning"; code: string; message: string }
  | { type: "blocked"; code: string; message: string }
  | { type: "unblocked"; clientId: string }
  | { type: "help"; commands: Array<{ name: string; description: string }> }
  | { type: "flagged"; username: string; clientId: string; messageId: string }
  | { type: "blocked_list"; entries: Array<{ clientId: string; username: string; blockedAt: number }> }
  | { type: "rename"; oldUsername: string; newUsername: string };
```

**Step 2: Add clientId to ChatMessage interface**

```typescript
interface ChatMessage {
  id: string;
  clientId: string;
  username: string;
  text: string;
  timestamp: number;
  context?: MessageContext;
}
```

**Step 3: Add RENAME to CLIENT_MESSAGE_TYPE constants (server message type)**

```typescript
// Add to SERVER_MESSAGE_TYPE:
  RENAME: "rename",
```

**Step 4: Update ClientModAction — clientId instead of username/ip**

```typescript
type ClientModAction =
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.FLAG; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE_BY_USER; data: { clientId: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.UNBLOCK; data: { clientId: string } };
```

**Step 5: Update appendMessage — store clientId as data attribute**

In the `appendMessage` function, after `root.dataset.msgId = String(msg.id);` add:

```typescript
root.dataset.clientId = msg.clientId;
```

**Step 6: Update flag callback — use clientId from message**

In the flag button click handler, change the `FLAGGED` response handler to use `clientId`. The flag action itself already sends message `id` (unchanged). The change is in the `FLAGGED` response handler later.

**Step 7: Update appendMessage — pass clientId in message object**

In the `SERVER_MESSAGE_TYPE.MESSAGE` handler, include `clientId`:

```typescript
appendMessage({
  id: data.id,
  clientId: data.clientId,
  username: data.username,
  text: data.text,
  timestamp: data.timestamp,
  context: data.context,
});
```

**Step 8: Handle rename message**

Add a new handler in the message event listener:

```typescript
} else if (data.type === SERVER_MESSAGE_TYPE.RENAME) {
  const usernameEls = messagesEl.querySelectorAll<HTMLElement>('[data-chat="username"]');
  for (const el of usernameEls) {
    if (el.textContent === data.oldUsername) {
      el.textContent = data.newUsername;
    }
  }
```

**Step 9: Update FLAGGED handler — use clientId for delete-by-user**

```typescript
} else if (data.type === SERVER_MESSAGE_TYPE.FLAGGED) {
  appendSystemMessage(`Banned ${data.username}.\nDelete their messages?`, [
    {
      label: "all",
      action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE_BY_USER, data: { clientId: data.clientId } }),
    },
    { label: "this one", action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: data.messageId } }) },
    { label: "none", action: () => {} },
  ]);
```

**Step 10: Update UNBLOCKED handler — show clientId**

```typescript
} else if (data.type === SERVER_MESSAGE_TYPE.UNBLOCKED) {
  appendSystemMessage(`Unblocked user: ${data.clientId.slice(0, 8)}…`);
```

**Step 11: Update BLOCKED_LIST handler — use clientId**

```typescript
} else if (data.type === SERVER_MESSAGE_TYPE.BLOCKED_LIST) {
  if (data.entries.length === 0) {
    appendSystemMessage("No blocked users.");
  } else {
    appendSystemMessage(`Blocked users (${data.entries.length}):`);
    for (const e of data.entries) {
      const date = e.blockedAt > 0 ? new Date(e.blockedAt).toLocaleDateString() : "unknown date";
      appendSystemMessage(`  ${e.username} — ${e.clientId.slice(0, 8)}… (blocked ${date})`, [
        {
          label: "unblock",
          action: () => {
            wsSend({ type: CLIENT_MESSAGE_TYPE.UNBLOCK, data: { clientId: e.clientId } });
          },
        },
      ]);
    }
  }
```

**Step 12: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 13: Commit**

```bash
git add app/src/components/Chat/chat-client.ts
git commit -m "refactor(chat): update client to use clientId for identity and handle rename"
```

---

### Task 4: Update API tests

**Files:**
- Modify: `api/src/__tests__/chat-room.test.ts`

**Step 1: Update openWs helper — remove ip parameter**

```typescript
async function openWs(): Promise<WebSocket> {
  const resp = await SELF.fetch("https://fake-host/ws", {
    headers: { Upgrade: "websocket" },
  });
  const ws = resp.webSocket;
  if (!ws) throw new Error("No WebSocket returned");
  ws.accept();
  return ws;
}
```

**Step 2: Update connectAndJoin — remove ip option, add clientId**

```typescript
async function connectAndJoin(
  username: string,
  options?: { token?: string; clientId?: string },
): Promise<{ ws: WebSocket; msgs: ServerMessage[] }> {
  const ws = await openWs();
  const msgs = collect(ws);
  await flush();

  const data: Record<string, unknown> = { username, clientId: options?.clientId ?? crypto.randomUUID() };
  if (options?.token) data.token = options.token;
  send(ws, { type: CLIENT_MESSAGE_TYPE.JOIN, data });
  await flush();
  return { ws, msgs };
}
```

**Step 3: Remove all `ip:` options from test calls**

Search for `ip:` in test file and remove those options from `connectAndJoin` and `openWs` calls. Affected tests:
- "admin can unblock" — remove `ip` options
- "/help is not broadcast" — remove `ip` options
- "admin /blocked" — remove `ip` option, assert `clientId` instead of `ip` on blocked entry
- "admin can flag" — remove `ip` options, assert `clientId` instead of `ip` on flagged response
- "non-admin flag" — remove `ip` options
- "reserved word" tests — no `ip` to remove (already fine)

**Step 4: Rename "IP blocking" describe to "Blocking"**

**Step 5: Update "admin can unblock" test — use clientId**

```typescript
describe("Blocking", () => {
  it("admin can unblock a client via unblock message", async () => {
    const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
      token: "test-admin-secret",
    });
    adminMsgs.length = 0;

    send(adminWs, { type: CLIENT_MESSAGE_TYPE.UNBLOCK, data: { clientId: "some-client-id" } });
    await flush();

    const unblocked = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.UNBLOCKED);
    expect(unblocked).toMatchObject({ type: SERVER_MESSAGE_TYPE.UNBLOCKED, clientId: "some-client-id" });

    adminWs.close();
  });
});
```

**Step 6: Update "admin /blocked" test — assert clientId on entry**

Update the assertion from `e.ip === "10.0.0.77"` to checking that the entry has a `clientId` property and username matches:

```typescript
const entry = list.entries.find((e) => e.username === "troublemaker");
expect(entry).toBeDefined();
if (entry) {
  expect(entry.clientId).toBeDefined();
  expect(entry.blockedAt).toBeGreaterThan(0);
}
```

**Step 7: Update "admin can flag" test — assert clientId instead of ip**

```typescript
const flagged = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.FLAGGED);
expect(flagged).toMatchObject({
  type: SERVER_MESSAGE_TYPE.FLAGGED,
  username: "bad-user",
  clientId: expect.any(String),
  messageId: msgId,
});
```

**Step 8: Update "admin can delete all messages" test — send clientId**

Get the clientId from the message and use it for delete_by_user:

```typescript
it("admin can delete all messages from a client", async () => {
  const cid = crypto.randomUUID();
  const { ws: userWs } = await connectAndJoin("bulk-poster", { clientId: cid });
  const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
    token: "test-admin-secret",
  });

  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 1" } });
  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 2" } });
  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 3" } });
  await flush();

  adminMsgs.length = 0;

  send(adminWs, { type: "delete_by_user", data: { clientId: cid } });
  await flush();

  const removes = adminMsgs.filter((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
  expect(removes).toHaveLength(3);

  userWs.close();
  adminWs.close();
});
```

**Step 9: Update "non-admin delete_by_user" test — send clientId**

```typescript
send(ws2, { type: "delete_by_user", data: { clientId: "some-fake-id" } });
```

**Step 10: Add new test — rename broadcasts to all clients**

```typescript
it("re-joining with new username broadcasts rename and updates history", async () => {
  const cid = crypto.randomUUID();
  const { ws: ws1, msgs: msgs1 } = await connectAndJoin("old-name", { clientId: cid });
  const { ws: ws2, msgs: msgs2 } = await connectAndJoin("observer");

  // Send a message as old-name
  send(ws1, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "hello" } });
  await flush();

  msgs1.length = 0;
  msgs2.length = 0;

  // Re-join with new username, same clientId
  send(ws1, { type: CLIENT_MESSAGE_TYPE.JOIN, data: { username: "new-name", clientId: cid } });
  await flush();

  // Observer should receive rename
  const rename = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.RENAME);
  expect(rename).toMatchObject({
    type: SERVER_MESSAGE_TYPE.RENAME,
    oldUsername: "old-name",
    newUsername: "new-name",
  });

  // New user connecting should see updated history
  const { ws: ws3, msgs: msgs3 } = await connectAndJoin("late-joiner");
  const history = msgs3.find((m) => m.type === SERVER_MESSAGE_TYPE.HISTORY);
  if (history && history.type === SERVER_MESSAGE_TYPE.HISTORY) {
    const fromRenamed = history.messages.filter((m) => m.username === "new-name");
    expect(fromRenamed.length).toBeGreaterThanOrEqual(1);
    const fromOld = history.messages.filter((m) => m.username === "old-name");
    expect(fromOld).toHaveLength(0);
  }

  ws1.close();
  ws2.close();
  ws3.close();
});
```

**Step 11: Add new test — flag works after user renames**

```typescript
it("flag works after user has renamed", async () => {
  const cid = crypto.randomUUID();
  const { ws: userWs, msgs: userMsgs } = await connectAndJoin("original", { clientId: cid });
  const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
    token: "test-admin-secret",
  });

  // Send a message, then rename
  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "bad content" } });
  await flush();

  const chatMsg = adminMsgs.find((m): m is ChatMessage => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
  const msgId = chatMsg?.id;

  // Rename
  send(userWs, { type: CLIENT_MESSAGE_TYPE.JOIN, data: { username: "renamed", clientId: cid } });
  await flush();

  adminMsgs.length = 0;
  userMsgs.length = 0;

  // Flag the old message — should still work
  send(adminWs, { type: "flag", data: { id: msgId } });
  await flush();

  const flagged = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.FLAGGED);
  expect(flagged).toBeDefined();

  const blocked = userMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.BLOCKED);
  expect(blocked).toBeDefined();

  adminWs.close();
  userWs.close();
});
```

**Step 12: Run all API tests**

Run: `just api::test`
Expected: All tests PASS

**Step 13: Commit**

```bash
git add api/src/__tests__/chat-room.test.ts
git commit -m "test(api): update chat tests for clientId-based identity and rename"
```

---

### Task 5: Run full test suite and typecheck

**Files:** None (verification only)

**Step 1: Run API typecheck**

Run: `just api::typecheck`
Expected: PASS

**Step 2: Run app typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 3: Run all tests**

Run: `just test`
Expected: All tests PASS

**Step 4: Run app build**

Run: `just app::build`
Expected: Build succeeds

**Step 5: Commit any remaining fixes if needed**
