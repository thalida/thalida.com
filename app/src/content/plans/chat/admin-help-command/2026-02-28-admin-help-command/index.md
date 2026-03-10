---
title: Admin /help Command Implementation Plan
description: Add an admin-only `/help` command and a command registry that
  auto-generates the help output.
publishedOn: 2026-03-01T05:06:54.000Z
tags:
  - implementation
---

# Admin /help Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin-only `/help` command and a command registry that auto-generates the help output.

**Architecture:** Server-side command registry in `api/src/commands.ts`. Only `isOwner` connections trigger command dispatch — non-admin `/` messages pass through as regular chat text. A new `HELP` server message type carries command metadata to the client, rendered as a system notice.

**Tech Stack:** TypeScript, Cloudflare Workers/Durable Objects, Vitest

---

### Task 1: Add types for the command registry and HELP message

**Files:**
- Modify: `api/src/types.ts`

**Step 1: Add `HELP` to `SERVER_MESSAGE_TYPE`**

In `api/src/types.ts`, add `HELP: "help"` to the `SERVER_MESSAGE_TYPE` object (after `UNBLOCKED`):

```ts
export const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  HELP: "help",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  MESSAGE: "message",
} as const;
```

**Step 2: Add `ServerHelpMessage` interface**

After the `ServerUnblockedMessage` interface, add:

```ts
export interface ServerHelpMessage {
  type: "help";
  commands: Array<{ name: string; description: string }>;
}
```

**Step 3: Add `ServerHelpMessage` to the `ServerMessage` union**

```ts
export type ServerMessage =
  | ServerErrorResponse
  | ServerBroadcast
  | ServerJoinedMessage
  | ServerUnblockedMessage
  | ServerHelpMessage
  | ChatMessage;
```

**Step 4: Commit**

```bash
git add api/src/types.ts
git commit -m "feat(api): add HELP server message type for command registry"
```

---

### Task 2: Create the command registry

**Files:**
- Create: `api/src/commands.ts`

**Step 1: Write the command registry**

Create `api/src/commands.ts`:

```ts
import type { ChatRoom } from "./chat-room";
import { SERVER_MESSAGE_TYPE } from "./types";

interface Command {
  name: string;
  description: string;
  handler: (ws: WebSocket, args: string, chatRoom: ChatRoom) => void;
}

const commands: Command[] = [];

function register(command: Command): void {
  commands.push(command);
}

register({
  name: "help",
  description: "Show this help message",
  handler: (ws, _args, chatRoom) => {
    chatRoom.sendToSocket(ws, {
      type: SERVER_MESSAGE_TYPE.HELP,
      commands: commands.map(({ name, description }) => ({ name, description })),
    });
  },
});

register({
  name: "unblock",
  description: "Unblock a user by IP address — /unblock <ip>",
  handler: (ws, args, chatRoom) => {
    chatRoom.handleUnblockCommand(ws, args);
  },
});

export function dispatch(text: string, ws: WebSocket, chatRoom: ChatRoom): boolean {
  const match = text.match(/^\/(\S+)\s*(.*)$/);
  if (!match) return false;

  const [, name, args] = match;
  const command = commands.find((c) => c.name === name);
  if (!command) return false;

  command.handler(ws, args.trim(), chatRoom);
  return true;
}
```

**Step 2: Commit**

```bash
git add api/src/commands.ts
git commit -m "feat(api): add command registry with /help and /unblock"
```

---

### Task 3: Refactor ChatRoom to use the command registry

**Files:**
- Modify: `api/src/chat-room.ts`

**Step 1: Add public methods for command access**

The command registry needs to call `send()` and `handleUnblock()` on `ChatRoom`. Add two public methods and import `dispatch`:

At the top, add import:
```ts
import { dispatch } from "./commands";
```

Add two public methods to the `ChatRoom` class (before the `// ── Connection Helpers` section):

```ts
  // ── Command Interface ──────────────────────────────────────────────

  sendToSocket(ws: WebSocket, message: ServerMessage): void {
    this.send(ws, message);
  }

  handleUnblockCommand(ws: WebSocket, ip: string): void {
    this.handleUnblock(ws, ip);
  }
```

**Step 2: Replace hardcoded `/unblock` dispatch with registry**

In `handleChatMessage`, replace the `/unblock` regex block:

```ts
    const unblockMatch = text.match(/^\/unblock\s+(.+)$/);
    if (unblockMatch) {
      this.handleUnblock(ws, unblockMatch[1].trim());
      return;
    }
```

With registry dispatch (only for owner):

```ts
    if (info.isOwner && text.startsWith("/")) {
      if (dispatch(text, ws, this)) return;
    }
```

**Step 3: Commit**

```bash
git add api/src/chat-room.ts
git commit -m "feat(api): wire command registry into ChatRoom dispatch"
```

---

### Task 4: Write tests for the command registry

**Files:**
- Modify: `api/src/__tests__/chat-room.test.ts`

**Step 1: Add `/help` test — admin receives help with command list**

Add to the "IP blocking" describe block (or create a new "admin commands" describe block after it):

```ts
  describe("admin commands", () => {
    it("admin /help returns help message with command list", async () => {
      const { ws, msgs } = await connectAndJoin("thalida", { token: "test-admin-secret" });
      msgs.length = 0;

      send(ws, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "/help" } });
      await flush();

      const help = msgs.find((m) => m.type === SERVER_MESSAGE_TYPE.HELP);
      expect(help).toBeDefined();
      if (help && help.type === SERVER_MESSAGE_TYPE.HELP) {
        expect(help.commands.length).toBeGreaterThanOrEqual(2);
        const names = help.commands.map((c) => c.name);
        expect(names).toContain("help");
        expect(names).toContain("unblock");
      }

      ws.close();
    });

    it("/help is not broadcast to other users", async () => {
      const { ws: adminWs } = await connectAndJoin("thalida", {
        token: "test-admin-secret",
        ip: "10.0.0.1",
      });
      const { ws: otherWs, msgs: otherMsgs } = await connectAndJoin("viewer", { ip: "10.0.0.2" });
      otherMsgs.length = 0;

      send(adminWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "/help" } });
      await flush();

      const anyMsg = otherMsgs.filter(
        (m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE || m.type === SERVER_MESSAGE_TYPE.HELP,
      );
      expect(anyMsg).toHaveLength(0);

      adminWs.close();
      otherWs.close();
    });

    it("non-admin /help sends as regular chat message", async () => {
      const { ws: ws1, msgs: msgs1 } = await connectAndJoin("regular");
      const { ws: ws2, msgs: msgs2 } = await connectAndJoin("observer");

      msgs1.length = 0;
      msgs2.length = 0;

      send(ws1, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "/help" } });
      await flush();

      const msg = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
      expect(msg).toMatchObject({ type: SERVER_MESSAGE_TYPE.MESSAGE, username: "regular", text: "/help" });

      ws1.close();
      ws2.close();
    });

    it("non-admin /unblock sends as regular chat message", async () => {
      const { ws, msgs } = await connectAndJoin("regular-user", { ip: "10.0.0.2" });
      const { ws: ws2, msgs: msgs2 } = await connectAndJoin("watcher", { ip: "10.0.0.3" });

      msgs.length = 0;
      msgs2.length = 0;

      send(ws, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "/unblock 10.0.0.50" } });
      await flush();

      const msg = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
      expect(msg).toMatchObject({
        type: SERVER_MESSAGE_TYPE.MESSAGE,
        username: "regular-user",
        text: "/unblock 10.0.0.50",
      });

      ws.close();
      ws2.close();
    });

    it("admin unknown /command sends as regular chat message", async () => {
      const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin("thalida", {
        token: "test-admin-secret",
      });
      const { ws: otherWs, msgs: otherMsgs } = await connectAndJoin("viewer");

      adminMsgs.length = 0;
      otherMsgs.length = 0;

      send(adminWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "/nonexistent" } });
      await flush();

      const msg = otherMsgs.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
      expect(msg).toMatchObject({
        type: SERVER_MESSAGE_TYPE.MESSAGE,
        username: "thalida",
        text: "/nonexistent",
      });

      adminWs.close();
      otherWs.close();
    });
  });
```

**Step 2: Update the existing non-owner `/unblock` test**

The existing test "non-owner /unblock command returns unauthorized error" now expects the message to be sent as regular text instead of returning an error. Replace the test body in the "IP blocking" describe block:

```ts
    it("non-owner /unblock command sends as regular chat message", async () => {
      const { ws, msgs } = await connectAndJoin("regular-user", { ip: "10.0.0.2" });
      const { ws: ws2, msgs: msgs2 } = await connectAndJoin("watcher", { ip: "10.0.0.3" });

      msgs.length = 0;
      msgs2.length = 0;

      send(ws, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "/unblock 10.0.0.50" } });
      await flush();

      const chatMsg = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.MESSAGE);
      expect(chatMsg).toMatchObject({
        type: SERVER_MESSAGE_TYPE.MESSAGE,
        username: "regular-user",
        text: "/unblock 10.0.0.50",
      });

      ws.close();
      ws2.close();
    });
```

**Step 3: Run the tests**

Run: `just api::test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add api/src/__tests__/chat-room.test.ts
git commit -m "test(api): add tests for admin command registry and /help"
```

---

### Task 5: Handle the `help` message type on the client

**Files:**
- Modify: `app/src/components/Chat/chat-client.ts`

**Step 1: Add `HELP` to the client's `SERVER_MESSAGE_TYPE`**

```ts
const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  HELP: "help",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  MESSAGE: "message",
} as const;
```

**Step 2: Add `help` to the `ServerMessage` type**

Add to the `ServerMessage` union:

```ts
  | { type: "help"; commands: Array<{ name: string; description: string }> }
```

**Step 3: Add handler in the message event listener**

After the `unblocked` handler, add:

```ts
    } else if (data.type === SERVER_MESSAGE_TYPE.HELP) {
      const lines = data.commands.map((c) => `  /${c.name} — ${c.description}`);
      appendNotice(`Available commands:\n${lines.join("\n")}`);
    }
```

**Step 4: Commit**

```bash
git add app/src/components/Chat/chat-client.ts
git commit -m "feat(app): handle HELP message type in chat client"
```

---

### Task 6: Verify end-to-end and run all tests

**Step 1: Run API tests**

Run: `just api::test`
Expected: All tests pass including new admin command tests.

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
