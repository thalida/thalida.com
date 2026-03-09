---
title: Admin Moderation Tools Implementation Plan
description: >-
  Add admin-only delete message button, flag/ban button, and `/blocked` command
  to the chat system.
publishedOn: 2026-03-01T05:06:54.000Z
planType: implementation
topic: admin-moderation-tools
category: chat
---

# Admin Moderation Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin-only delete message button, flag/ban button, and `/blocked` command to the chat system.

**Architecture:** Three new client message types (DELETE, FLAG, DELETE_BY_USER) and two new server message types (FLAGGED, BLOCKED_LIST) extend the existing WebSocket protocol. The blockedIps storage migrates from `string[]` to structured entries with username/timestamp. Admin buttons are added to the message template, hidden for non-admins. All actions are server-validated — unauthorized requests are silently ignored.

**Tech Stack:** TypeScript, Cloudflare Workers/Durable Objects, Vitest, Astro, Tailwind CSS

---

### Task 1: Add all new types

**Files:**
- Modify: `api/src/types.ts`

**Step 1: Add new client message types and data interfaces**

Add `DELETE`, `FLAG`, and `DELETE_BY_USER` to `CLIENT_MESSAGE_TYPE` (after `MESSAGE`):

```ts
export const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  MESSAGE: "message",
  DELETE: "delete",
  FLAG: "flag",
  DELETE_BY_USER: "delete_by_user",
} as const;
```

Add data interfaces after `ClientChatData`:

```ts
export interface ClientDeleteData {
  id: string;
}

export interface ClientFlagData {
  id: string;
}

export interface ClientDeleteByUserData {
  username: string;
}
```

Update the `ClientMessage` union:

```ts
export type ClientMessage =
  | { type: "join"; data: ClientJoinData }
  | { type: "message"; data: ClientChatData }
  | { type: "delete"; data: ClientDeleteData }
  | { type: "flag"; data: ClientFlagData }
  | { type: "delete_by_user"; data: ClientDeleteByUserData };
```

**Step 2: Add new server message types**

Add `FLAGGED` and `BLOCKED_LIST` to `SERVER_MESSAGE_TYPE` (after `HELP`):

```ts
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
} as const;
```

Add interfaces after `ServerHelpMessage`:

```ts
export interface ServerFlaggedMessage {
  type: "flagged";
  username: string;
  ip: string;
  messageId: string;
}

export interface BlockedEntry {
  ip: string;
  username: string;
  blockedAt: number;
}

export interface ServerBlockedListMessage {
  type: "blocked_list";
  entries: BlockedEntry[];
}
```

Update the `ServerMessage` union:

```ts
export type ServerMessage =
  | ServerErrorResponse
  | ServerBroadcast
  | ServerJoinedMessage
  | ServerUnblockedMessage
  | ServerHelpMessage
  | ServerFlaggedMessage
  | ServerBlockedListMessage
  | ChatMessage;
```

**Step 3: Commit**

```bash
git add api/src/types.ts
git commit -m "feat(api): add types for delete, flag, delete_by_user, and blocked_list"
```

---

### Task 2: Migrate blockedIps storage format

**Files:**
- Modify: `api/src/chat-room.ts`

**Step 1: Change the in-memory data structure**

Replace the `blockedIps` field and related methods in `ChatRoom`:

Change:
```ts
private blockedIps: Set<string> = new Set();
```
To:
```ts
private blockedEntries: Map<string, { username: string; blockedAt: number }> = new Map();
```

**Step 2: Update `loadBlockedIps` with migration logic**

Replace the `loadBlockedIps` method:

```ts
private async loadBlockedIps(): Promise<void> {
  if (this.blockedIpsLoaded) return;
  const stored = await this.state.storage.get<unknown>(BLOCKED_IPS_KEY);
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      if (typeof entry === "string") {
        // Old format: plain IP strings
        this.blockedEntries.set(entry, { username: "unknown", blockedAt: 0 });
      } else if (entry && typeof entry === "object" && "ip" in entry) {
        // New format: { ip, username, blockedAt }
        const e = entry as { ip: string; username: string; blockedAt: number };
        this.blockedEntries.set(e.ip, { username: e.username, blockedAt: e.blockedAt });
      }
    }
  }
  this.blockedIpsLoaded = true;
}
```

**Step 3: Update `persistBlockedIps`**

```ts
private async persistBlockedIps(): Promise<void> {
  const entries = [...this.blockedEntries.entries()].map(([ip, info]) => ({
    ip,
    username: info.username,
    blockedAt: info.blockedAt,
  }));
  await this.state.storage.put(BLOCKED_IPS_KEY, entries);
}
```

**Step 4: Update all references from `this.blockedIps` to `this.blockedEntries`**

In `fetch()` method, change:
```ts
if (this.blockedIps.has(ip)) {
```
To:
```ts
if (this.blockedEntries.has(ip)) {
```

In `addWarning()`, change:
```ts
this.blockedIps.add(info.ip);
```
To:
```ts
this.blockedEntries.set(info.ip, { username: info.username, blockedAt: Date.now() });
```

In `handleUnblock()`, change:
```ts
this.blockedIps.delete(ip);
```
To:
```ts
this.blockedEntries.delete(ip);
```

**Step 5: Add `BlockedEntry` to the imports from types**

Add `BlockedEntry` to the type imports at the top of `chat-room.ts`.

**Step 6: Run tests to verify migration doesn't break existing behavior**

Run: `just api::test`
Expected: All existing tests pass (the test environment starts fresh each time, no persisted data to migrate).

**Step 7: Commit**

```bash
git add api/src/chat-room.ts
git commit -m "feat(api): migrate blockedIps storage to structured entries with username and timestamp"
```

---

### Task 3: Server — Admin delete message

**Files:**
- Modify: `api/src/chat-room.ts`
- Modify: `api/src/__tests__/chat-room.test.ts`

**Step 1: Write failing tests for delete**

Add a new describe block `"admin delete"` in the test file after the `"admin commands"` block:

```ts
describe("admin delete", () => {
  it("admin can delete a message by ID", async () => {
    const { ws: userWs, msgs: userMsgs } = await connectAndJoin("chatter");
    const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
      token: "test-admin-secret",
    });

    userMsgs.length = 0;
    adminMsgs.length = 0;

    send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "delete me" } });
    await flush();

    const chatMsg = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
    expect(chatMsg).toBeDefined();
    const msgId = chatMsg!.type === SERVER_MESSAGE_TYPE.MESSAGE ? (chatMsg as any).id : undefined;
    expect(msgId).toBeDefined();

    adminMsgs.length = 0;
    userMsgs.length = 0;

    send(adminWs, { type: "delete", data: { id: msgId } });
    await flush();

    const remove1 = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
    const remove2 = userMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
    expect(remove1).toMatchObject({ type: SERVER_MESSAGE_TYPE.REMOVE, id: msgId });
    expect(remove2).toMatchObject({ type: SERVER_MESSAGE_TYPE.REMOVE, id: msgId });

    userWs.close();
    adminWs.close();
  });

  it("non-admin delete request is silently ignored", async () => {
    const { ws: ws1, msgs: msgs1 } = await connectAndJoin("sender");
    const { ws: ws2, msgs: msgs2 } = await connectAndJoin("hacker");

    msgs1.length = 0;
    msgs2.length = 0;

    send(ws1, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "stay here" } });
    await flush();

    const chatMsg = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
    const msgId = chatMsg!.type === SERVER_MESSAGE_TYPE.MESSAGE ? (chatMsg as any).id : undefined;

    msgs1.length = 0;
    msgs2.length = 0;

    send(ws2, { type: "delete", data: { id: msgId } });
    await flush();

    // No REMOVE broadcast should happen
    const remove = msgs1.find((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
    expect(remove).toBeUndefined();

    ws1.close();
    ws2.close();
  });

  it("delete of nonexistent message ID is silently ignored", async () => {
    const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
      token: "test-admin-secret",
    });

    adminMsgs.length = 0;

    send(adminWs, { type: "delete", data: { id: "nonexistent-id" } });
    await flush();

    const remove = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
    expect(remove).toBeUndefined();

    adminWs.close();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just api::test`
Expected: New tests fail (delete message type not handled yet).

**Step 3: Implement delete handler in ChatRoom**

In `handleMessage`, add a new case to the switch:

```ts
case CLIENT_MESSAGE_TYPE.DELETE:
  this.handleDelete(ws, msg.data);
  break;
```

Add the handler method after `handleUnblock`:

```ts
private handleDelete(ws: WebSocket, { id }: ClientDeleteData): void {
  const info = this.connections.get(ws);
  if (!info?.isOwner) return;

  const idx = this.messages.findIndex((m) => m.id === id);
  if (idx === -1) return;

  this.messages.splice(idx, 1);
  this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id });
}
```

Add `ClientDeleteData` to the imports from `./types`. Also update the `ClientMessage` type reference if needed — the switch/case should already work with the updated union type.

**Step 4: Add public method for command interface**

```ts
handleDeleteMessage(ws: WebSocket, messageId: string): void {
  this.handleDelete(ws, { id: messageId });
}
```

**Step 5: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add api/src/chat-room.ts api/src/__tests__/chat-room.test.ts
git commit -m "feat(api): add admin delete message handler with tests"
```

---

### Task 4: Server — Admin flag/ban

**Files:**
- Modify: `api/src/chat-room.ts`
- Modify: `api/src/__tests__/chat-room.test.ts`

**Step 1: Write failing tests for flag**

Add a new describe block `"admin flag"` after `"admin delete"`:

```ts
describe("admin flag", () => {
  it("admin can flag a user, which blocks their IP and responds with FLAGGED", async () => {
    const { ws: userWs, msgs: userMsgs } = await connectAndJoin("bad-user", { ip: "10.0.0.99" });
    const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
      token: "test-admin-secret",
      ip: "10.0.0.1",
    });

    userMsgs.length = 0;
    adminMsgs.length = 0;

    send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "offensive content" } });
    await flush();

    const chatMsg = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
    const msgId = chatMsg!.type === SERVER_MESSAGE_TYPE.MESSAGE ? (chatMsg as any).id : undefined;

    adminMsgs.length = 0;
    userMsgs.length = 0;

    send(adminWs, { type: "flag", data: { id: msgId } });
    await flush();

    // Admin receives FLAGGED response
    const flagged = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.FLAGGED);
    expect(flagged).toMatchObject({
      type: SERVER_MESSAGE_TYPE.FLAGGED,
      username: "bad-user",
      ip: "10.0.0.99",
      messageId: msgId,
    });

    // User receives BLOCKED
    const blocked = userMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.BLOCKED);
    expect(blocked).toBeDefined();

    adminWs.close();
    userWs.close();
  });

  it("non-admin flag request is silently ignored", async () => {
    const { ws: ws1, msgs: msgs1 } = await connectAndJoin("target", { ip: "10.0.0.10" });
    const { ws: ws2, msgs: msgs2 } = await connectAndJoin("hacker", { ip: "10.0.0.11" });

    msgs1.length = 0;
    msgs2.length = 0;

    send(ws1, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "normal message" } });
    await flush();

    const chatMsg = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
    const msgId = chatMsg!.type === SERVER_MESSAGE_TYPE.MESSAGE ? (chatMsg as any).id : undefined;

    msgs1.length = 0;
    msgs2.length = 0;

    send(ws2, { type: "flag", data: { id: msgId } });
    await flush();

    // No FLAGGED or BLOCKED messages should appear
    const flagged = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.FLAGGED);
    expect(flagged).toBeUndefined();
    const blocked = msgs1.find((m) => m.type === SERVER_MESSAGE_TYPE.BLOCKED);
    expect(blocked).toBeUndefined();

    ws1.close();
    ws2.close();
  });

  it("flagging nonexistent message ID is silently ignored", async () => {
    const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
      token: "test-admin-secret",
    });

    adminMsgs.length = 0;

    send(adminWs, { type: "flag", data: { id: "nonexistent-id" } });
    await flush();

    const flagged = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.FLAGGED);
    expect(flagged).toBeUndefined();

    adminWs.close();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just api::test`

**Step 3: Implement flag handler**

In `handleMessage`, add a case:

```ts
case CLIENT_MESSAGE_TYPE.FLAG:
  this.handleFlag(ws, msg.data);
  break;
```

Add the handler after `handleDelete`:

```ts
private handleFlag(ws: WebSocket, { id }: ClientFlagData): void {
  const info = this.connections.get(ws);
  if (!info?.isOwner) return;

  const message = this.messages.find((m) => m.id === id);
  if (!message) return;

  const targetUsername = message.username;

  // Find the target's IP from their connection
  let targetIp: string | undefined;
  for (const [, connInfo] of this.connections) {
    if (connInfo.username === targetUsername && !connInfo.isOwner) {
      targetIp = connInfo.ip;
      break;
    }
  }

  if (!targetIp) return;

  // Block the IP
  this.blockedEntries.set(targetIp, { username: targetUsername, blockedAt: Date.now() });
  this.persistBlockedIps().catch((err) => {
    console.error("[flag] failed to persist blocked IP:", err);
  });

  // Send BLOCKED to all of the target's sockets and close them
  for (const [targetWs, connInfo] of this.connections) {
    if (connInfo.ip === targetIp && !connInfo.isOwner) {
      this.sendBlocked(
        targetWs,
        SERVER_ERROR_CODE.MODERATION_BLOCKED,
        "You have been blocked by the admin.",
      );
      connInfo.isBlocked = true;
    }
  }

  // Respond to admin
  this.send(ws, {
    type: SERVER_MESSAGE_TYPE.FLAGGED,
    username: targetUsername,
    ip: targetIp,
    messageId: id,
  });
}
```

Add `ClientFlagData` to the imports from `./types`.

**Step 4: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add api/src/chat-room.ts api/src/__tests__/chat-room.test.ts
git commit -m "feat(api): add admin flag/ban handler with tests"
```

---

### Task 5: Server — Delete messages by username

**Files:**
- Modify: `api/src/chat-room.ts`
- Modify: `api/src/__tests__/chat-room.test.ts`

**Step 1: Write failing tests**

Add to the `"admin delete"` describe block:

```ts
it("admin can delete all messages from a username", async () => {
  const { ws: userWs } = await connectAndJoin("spammer");
  const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
    token: "test-admin-secret",
  });

  // Send multiple messages
  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 1" } });
  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 2" } });
  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 3" } });
  await flush();

  adminMsgs.length = 0;

  send(adminWs, { type: "delete_by_user", data: { username: "spammer" } });
  await flush();

  // Should receive REMOVE for each deleted message
  const removes = adminMsgs.filter((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
  expect(removes).toHaveLength(3);

  userWs.close();
  adminWs.close();
});

it("non-admin delete_by_user is silently ignored", async () => {
  const { ws: ws1 } = await connectAndJoin("poster");
  const { ws: ws2, msgs: msgs2 } = await connectAndJoin("hacker");

  send(ws1, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "keep this" } });
  await flush();

  msgs2.length = 0;

  send(ws2, { type: "delete_by_user", data: { username: "poster" } });
  await flush();

  const removes = msgs2.filter((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
  expect(removes).toHaveLength(0);

  ws1.close();
  ws2.close();
});
```

**Step 2: Run tests to verify they fail**

Run: `just api::test`

**Step 3: Implement delete_by_user handler**

In `handleMessage`, add a case:

```ts
case CLIENT_MESSAGE_TYPE.DELETE_BY_USER:
  this.handleDeleteByUser(ws, msg.data);
  break;
```

Add the handler:

```ts
private handleDeleteByUser(ws: WebSocket, { username: targetUsername }: ClientDeleteByUserData): void {
  const info = this.connections.get(ws);
  if (!info?.isOwner) return;

  const toRemove = this.messages.filter((m) => m.username === targetUsername);
  this.messages = this.messages.filter((m) => m.username !== targetUsername);

  for (const msg of toRemove) {
    this.broadcast({ type: SERVER_MESSAGE_TYPE.REMOVE, id: msg.id });
  }
}
```

Add `ClientDeleteByUserData` to the imports from `./types`.

**Step 4: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add api/src/chat-room.ts api/src/__tests__/chat-room.test.ts
git commit -m "feat(api): add admin delete-by-user handler with tests"
```

---

### Task 6: Server — `/blocked` command

**Files:**
- Modify: `api/src/commands.ts`
- Modify: `api/src/chat-room.ts`
- Modify: `api/src/__tests__/chat-room.test.ts`

**Step 1: Write failing test**

Add to the `"admin commands"` describe block:

```ts
it("admin /blocked returns list of blocked entries", async () => {
  // First, create a blocked user by having admin flag someone
  const { ws: userWs, msgs: userMsgs } = await connectAndJoin("troublemaker", { ip: "10.0.0.77" });
  const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
    token: "test-admin-secret",
    ip: "10.0.0.1",
  });

  send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "bad stuff" } });
  await flush();

  const chatMsg = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
  const msgId = chatMsg!.type === SERVER_MESSAGE_TYPE.MESSAGE ? (chatMsg as any).id : undefined;

  send(adminWs, { type: "flag", data: { id: msgId } });
  await flush();

  adminMsgs.length = 0;

  // Now ask for the blocked list
  send(adminWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "/blocked" } });
  await flush();

  const list = adminMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.BLOCKED_LIST);
  expect(list).toBeDefined();
  if (list && list.type === SERVER_MESSAGE_TYPE.BLOCKED_LIST) {
    expect(list.entries.length).toBeGreaterThanOrEqual(1);
    const entry = list.entries.find((e) => e.ip === "10.0.0.77");
    expect(entry).toBeDefined();
    expect(entry!.username).toBe("troublemaker");
    expect(entry!.blockedAt).toBeGreaterThan(0);
  }

  adminWs.close();
  userWs.close();
});
```

**Step 2: Run tests to verify it fails**

Run: `just api::test`

**Step 3: Add public method to ChatRoom for getting blocked entries**

Add to the Command Interface section of `chat-room.ts`:

```ts
getBlockedEntries(): BlockedEntry[] {
  return [...this.blockedEntries.entries()].map(([ip, info]) => ({
    ip,
    username: info.username,
    blockedAt: info.blockedAt,
  }));
}
```

**Step 4: Register `/blocked` command**

In `api/src/commands.ts`, add after the `/unblock` registration:

```ts
register({
  name: "blocked",
  description: "List all blocked users and IPs",
  handler: (ws, _args, chatRoom) => {
    chatRoom.sendToSocket(ws, {
      type: SERVER_MESSAGE_TYPE.BLOCKED_LIST,
      entries: chatRoom.getBlockedEntries(),
    });
  },
});
```

**Step 5: Run tests**

Run: `just api::test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add api/src/commands.ts api/src/chat-room.ts api/src/__tests__/chat-room.test.ts
git commit -m "feat(api): add /blocked command to list blocked users"
```

---

### Task 7: Client — Add admin control buttons to message template

**Files:**
- Modify: `app/src/components/Chat/Chat.astro`

**Step 1: Add delete and flag buttons to the message template**

Replace the message template in `Chat.astro`:

```html
<template id="chat-msg-tpl">
  <div class="group mb-2" data-msg-id="">
    <div class="flex items-baseline gap-1.5 text-xs leading-tight">
      <span data-chat="username" class="font-semibold text-teal data-admin:text-neon"></span>
      <span class="ml-auto flex items-baseline gap-1.5 whitespace-nowrap">
        <span data-chat="admin-controls" hidden class="inline-flex gap-1">
          <button data-chat="delete-btn" class="text-muted hover:text-red-400 transition-colors" type="button" title="Delete message">
            <i class="fa-solid fa-trash-can fa-xs" aria-hidden="true"></i>
          </button>
          <button data-chat="flag-btn" class="text-muted hover:text-orange-400 transition-colors" type="button" title="Flag & ban user">
            <i class="fa-solid fa-flag fa-xs" aria-hidden="true"></i>
          </button>
        </span>
        <a data-chat="page" hidden class="text-text font-medium underline hover:text-teal" href=""></a>
        <span data-chat="sep" hidden class="opacity-40">·</span>
        <span data-chat="time" class="opacity-40"></span>
      </span>
    </div>
    <div data-chat="text"></div>
  </div>
</template>
```

**Step 2: Add styles for confirm states**

Add to the `<style>` block:

```css
[data-chat="delete-btn"][data-confirm] {
  color: var(--color-red-400, #f87171);
}
[data-chat="flag-btn"][data-confirm] {
  color: var(--color-orange-400, #fb923c);
}
```

**Step 3: Commit**

```bash
git add app/src/components/Chat/Chat.astro
git commit -m "feat(app): add admin delete and flag buttons to message template"
```

---

### Task 8: Client — Wire up admin controls and new message handlers

**Files:**
- Modify: `app/src/components/Chat/chat-client.ts`

**Step 1: Add new client message types**

Update the client's `CLIENT_MESSAGE_TYPE`:

```ts
const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  MESSAGE: "message",
  DELETE: "delete",
  FLAG: "flag",
  DELETE_BY_USER: "delete_by_user",
} as const;
```

**Step 2: Add new server message types**

Update the client's `SERVER_MESSAGE_TYPE`:

```ts
const SERVER_MESSAGE_TYPE = {
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
} as const;
```

**Step 3: Add new types to the `ServerMessage` union**

Add these variants:

```ts
  | { type: "flagged"; username: string; ip: string; messageId: string }
  | { type: "blocked_list"; entries: Array<{ ip: string; username: string; blockedAt: number }> }
```

**Step 4: Update `appendMessage` to show admin controls and wire button handlers**

After the line `slot("text").textContent = msg.text;` (and before `messagesEl.appendChild(frag);`), add:

```ts
  if (isOwner && !isAdmin) {
    const controls = slot("admin-controls");
    controls.hidden = false;

    const deleteBtn = slot("delete-btn") as HTMLButtonElement;
    const flagBtn = slot("flag-btn") as HTMLButtonElement;

    deleteBtn.addEventListener("click", () => {
      if (deleteBtn.dataset.confirm !== undefined) {
        wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: msg.id } });
        delete deleteBtn.dataset.confirm;
      } else {
        deleteBtn.dataset.confirm = "";
        setTimeout(() => delete deleteBtn.dataset.confirm, 3000);
      }
    });

    flagBtn.addEventListener("click", () => {
      if (flagBtn.dataset.confirm !== undefined) {
        wsSend({ type: CLIENT_MESSAGE_TYPE.FLAG, data: { id: msg.id } });
        delete flagBtn.dataset.confirm;
      } else {
        flagBtn.dataset.confirm = "";
        setTimeout(() => delete flagBtn.dataset.confirm, 3000);
      }
    });
  }
```

Note: `isOwner` here refers to the module-level `isOwner` variable (whether the current user is the admin). `isAdmin` checks if the message author is the admin (so admin can't delete/flag their own messages). This logic already exists at line 113: `const isAdmin = adminUsername != null && msg.username === adminUsername;`.

**Step 5: Extract a `wsSend` helper**

Add a helper function near the top of the file (after the existing helpers like `sendJoin`):

```ts
function wsSend(data: Record<string, unknown>): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(data));
}
```

Update `sendMessage` to use this helper too if desired, but not required.

**Step 6: Add `FLAGGED` handler with clickable choices**

In the message event listener, after the `HELP` handler, add:

```ts
    } else if (data.type === SERVER_MESSAGE_TYPE.FLAGGED) {
      const notice = appendInteractiveNotice(
        `Banned ${data.username} (${data.ip}).\nDelete their messages?`,
        [
          { label: "all", action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE_BY_USER, data: { username: data.username } }) },
          { label: "this one", action: () => wsSend({ type: CLIENT_MESSAGE_TYPE.DELETE, data: { id: data.messageId } }) },
          { label: "none", action: () => {} },
        ],
      );
    } else if (data.type === SERVER_MESSAGE_TYPE.BLOCKED_LIST) {
      if (data.entries.length === 0) {
        appendNotice("No blocked users.");
      } else {
        const lines = data.entries.map((e) => {
          const date = e.blockedAt > 0 ? new Date(e.blockedAt).toLocaleDateString() : "unknown date";
          return `  ${e.username} — ${e.ip} (blocked ${date})`;
        });
        appendNotice(`Blocked users:\n${lines.join("\n")}`);
      }
    }
```

**Step 7: Add `appendInteractiveNotice` function**

Add this function after `appendNotice`:

```ts
function appendInteractiveNotice(
  text: string,
  actions: Array<{ label: string; action: () => void }>,
): HTMLElement {
  const frag = noticeTpl.content.cloneNode(true) as DocumentFragment;
  const root = frag.firstElementChild as HTMLElement;
  root.textContent = "";

  const textNode = document.createTextNode(text + "  ");
  root.appendChild(textNode);

  actions.forEach((a, i) => {
    if (i > 0) root.appendChild(document.createTextNode(" · "));
    const span = document.createElement("span");
    span.textContent = `[${a.label}]`;
    span.className = "cursor-pointer underline hover:text-teal not-italic";
    span.addEventListener("click", () => {
      a.action();
      root.textContent = `${text} — ${a.label}`;
    });
    root.appendChild(span);
  });

  messagesEl.appendChild(frag);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return root;
}
```

**Step 8: Update `updateAdminUI` to also show controls on existing messages**

After the `isOwner` check updates the admin links and username input, add logic to reveal admin controls on all existing messages:

```ts
  const allControls = messagesEl.querySelectorAll('[data-chat="admin-controls"]');
  for (const el of allControls) {
    (el as HTMLElement).hidden = !isOwner;
  }
```

Wait — this won't work because the buttons need event listeners. Instead, keep the approach where `appendMessage` conditionally shows controls at render time. When the admin reconnects, the `HISTORY` handler re-renders all messages via `appendMessage`, which will correctly show/hide controls based on the new `isOwner` state. No extra work needed.

Remove this step — the `HISTORY` handler already calls `appendMessage` for each message, which checks `isOwner`.

**Step 8 (actual): Commit**

```bash
git add app/src/components/Chat/chat-client.ts
git commit -m "feat(app): wire admin delete/flag buttons and handle FLAGGED/BLOCKED_LIST messages"
```

---

### Task 9: Verify end-to-end

**Step 1: Run API tests**

Run: `just api::test`
Expected: All tests pass.

**Step 2: Run API typecheck**

Run: `just api::typecheck`
Expected: No type errors.

**Step 3: Run app typecheck**

Run: `just app::typecheck`
Expected: No type errors.

**Step 4: Run app build**

Run: `just app::build`
Expected: Build succeeds.

**Step 5: Final commit (if any fixups needed)**

Only if previous steps required changes.
