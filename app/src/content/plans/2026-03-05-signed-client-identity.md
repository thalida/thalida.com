---
title: Signed Client Identity Implementation Plan
description: >-
  Replace blind-trust client IDs with HMAC-signed client tokens so the API is
  the source of truth for identity.
publishedOn: 2026-03-06T02:03:16.000Z
planType: implementation
topic: client-identity
category: chat
---

# Signed Client Identity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace blind-trust client IDs with HMAC-signed client tokens so the API is the source of truth for identity.

**Architecture:** The API generates clientIds and signs them with `HMAC(clientId, ADMIN_SECRET)`. Clients store both values in localStorage. On reconnect, the API verifies the signature before trusting the clientId. Unverified or unknown clientIds are treated as new users. The `client_mappings` table is renamed to `clients`.

**Tech Stack:** Cloudflare Workers, Durable Objects SQL API, Web Crypto HMAC (existing in session.ts)

---

### Task 1: Add client token functions to session.ts

**Files:**
- Modify: `api/src/session.ts`

**Step 1: Add `createClientToken`**

Add after the existing `verifySessionToken` function (after line 54):

```typescript
/**
 * Create an HMAC-based client identity token: hex_hmac of the clientId.
 * Permanent — no timestamp, no expiry. Deterministic for a given clientId + secret.
 */
export async function createClientToken(clientId: string, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(clientId));
  return bufToHex(new Uint8Array(sig));
}

/**
 * Verify an HMAC-based client identity token.
 * Returns true if the token matches the clientId.
 * Uses crypto.subtle.verify which is constant-time.
 */
export async function verifyClientToken(
  clientId: string,
  token: string,
  secret: string,
): Promise<boolean> {
  const key = await getHmacKey(secret);
  const tokenBytes = hexToBuf(token);
  if (!tokenBytes) return false;
  return crypto.subtle.verify("HMAC", key, tokenBytes, new TextEncoder().encode(clientId));
}
```

**Step 2: Run typecheck**

Run: `just api::typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add api/src/session.ts
git commit -m "feat: add createClientToken / verifyClientToken to session.ts"
```

---

### Task 2: Update API types

**Files:**
- Modify: `api/src/types.ts:37-40` (ClientJoinData)
- Modify: `api/src/types.ts:147-152` (ServerJoinedMessage)

**Step 1: Add `clientToken` to `ClientJoinData`**

```typescript
export interface ClientJoinData {
  token?: string;
  clientId?: string;
  clientToken?: string;
}
```

**Step 2: Add `clientId` and `clientToken` to `ServerJoinedMessage`**

```typescript
export interface ServerJoinedMessage {
  type: "joined";
  isOwner: boolean;
  username: string;
  isBlocked: boolean;
  clientId?: string;
  clientToken?: string;
}
```

**Step 3: Run typecheck**

Run: `just api::typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add api/src/types.ts
git commit -m "feat: add clientId/clientToken to join wire protocol types"
```

---

### Task 3: Rename `client_mappings` → `clients` in chat-storage.ts

**Files:**
- Modify: `api/src/chat-storage.ts`

**Step 1: Update `ensureSchema()`**

In the `ensureSchema()` method, rename the table and indexes. Also add a migration for existing `client_mappings` tables (in case the SQL version was deployed before this change):

```typescript
private ensureSchema(): void {
    if (this.schemaReady) return;

    this.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        username TEXT NOT NULL,
        text TEXT NOT NULL,
        context_path TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages (client_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

      CREATE TABLE IF NOT EXISTS blocked_clients (
        client_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE IF NOT EXISTS clients (
        client_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_clients_username ON clients (username);
      CREATE INDEX IF NOT EXISTS idx_clients_last_seen_at ON clients (last_seen_at);
    `);

    // Migrate from old table name if it exists
    try {
      const cursor = this.storage.sql.exec<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='client_mappings'`,
      );
      for (const _row of cursor) {
        this.storage.sql.exec(`INSERT OR IGNORE INTO clients SELECT * FROM client_mappings`);
        this.storage.sql.exec(`DROP TABLE client_mappings`);
      }
    } catch {
      // Table doesn't exist, nothing to migrate
    }

    this.schemaReady = true;
  }
```

**Step 2: Update KV migration**

In `migrateFromKV()`, change the client mappings INSERT to reference `clients` instead of `client_mappings`:

```typescript
    // ── client mappings ──
    const legacyClients = await this.storage.list<ClientMapping>({ prefix: LEGACY_CLIENT_PREFIX });
    for (const [key, value] of legacyClients) {
      const clientId = key.slice(LEGACY_CLIENT_PREFIX.length);
      this.storage.sql.exec(
        `INSERT OR REPLACE INTO clients (client_id, username, last_seen_at) VALUES (?, ?, ?)`,
        clientId,
        value.username,
        new Date(value.lastSeen).toISOString(),
      );
    }
```

**Step 3: Update all SQL queries**

Replace every `client_mappings` reference with `clients` in these methods:
- `getClientMapping()` — `SELECT ... FROM clients WHERE ...`
- `setClientMapping()` — `INSERT OR REPLACE INTO clients ...`
- `isUsernameTaken()` — `SELECT ... FROM clients WHERE ...`
- `cleanupExpiredClients()` — `DELETE FROM clients WHERE ...`

Also add a new method:

```typescript
  async hasClient(clientId: string): Promise<boolean> {
    const cursor = this.storage.sql.exec<{ found: number }>(
      `SELECT 1 AS found FROM clients WHERE client_id = ? LIMIT 1`,
      clientId,
    );
    for (const _row of cursor) {
      return true;
    }
    return false;
  }
```

**Step 4: Run typecheck and tests**

Run: `just api::typecheck && just api::test`
Expected: Both PASS (table rename is internal, public API unchanged)

**Step 5: Commit**

```bash
git add api/src/chat-storage.ts
git commit -m "refactor: rename client_mappings table to clients, add hasClient()"
```

---

### Task 4: Update handleJoin in chat-room.ts

**Files:**
- Modify: `api/src/chat-room.ts:1-2` (imports)
- Modify: `api/src/chat-room.ts:165-206` (handleJoin)

**Step 1: Add import**

Add `createClientToken` and `verifyClientToken` to the import from `"./session"`:

```typescript
import { verifySessionToken, createClientToken, verifyClientToken } from "./session";
```

**Step 2: Rewrite `handleJoin`**

```typescript
  private async handleJoin(
    ws: WebSocket,
    { token, clientId, clientToken }: ClientJoinData,
  ): Promise<void> {
    // Verify admin via session token (HMAC-based, constant-time verification)
    let isOwner = false;
    if (typeof token === "string" && token.length > 0) {
      isOwner = await verifySessionToken(token, this.env.ADMIN_SECRET);
    }

    // Resolve client identity:
    // - If clientId + clientToken provided and valid → returning user
    // - Otherwise → new user, server generates identity
    let resolvedClientId: string;
    let isNewClient = true;

    if (
      typeof clientId === "string" && clientId.length > 0 &&
      typeof clientToken === "string" && clientToken.length > 0
    ) {
      const tokenValid = await verifyClientToken(clientId, clientToken, this.env.ADMIN_SECRET);
      if (tokenValid && await this.storage.hasClient(clientId)) {
        resolvedClientId = clientId;
        isNewClient = false;
      } else {
        resolvedClientId = crypto.randomUUID();
      }
    } else {
      resolvedClientId = crypto.randomUUID();
    }

    const resolvedClientToken = isNewClient
      ? await createClientToken(resolvedClientId, this.env.ADMIN_SECRET)
      : undefined;

    const isBlocked = !isOwner && this.storage.isBlocked(resolvedClientId);

    let name: string;
    if (isOwner) {
      name = this.adminUsername;
    } else {
      const mapping = await this.storage.getClientMapping(resolvedClientId);
      if (mapping) {
        name = mapping.username;
        await this.storage.setClientMapping(resolvedClientId, name); // update lastSeen
      } else {
        name = generateRandomUsername();
        while (await this.storage.isUsernameTaken(name, resolvedClientId, this.connections.values())) {
          name = generateRandomUsername();
        }
        await this.storage.setClientMapping(resolvedClientId, name);
      }
    }

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
      // Only return credentials on first visit (new clients)
      ...(isNewClient ? { clientId: resolvedClientId, clientToken: resolvedClientToken } : {}),
    });
    if (connInfo) this.sendHistory(ws, connInfo);
    this.broadcastStatus();
  }
```

**Step 3: Run typecheck**

Run: `just api::typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add api/src/chat-room.ts
git commit -m "feat: verify signed client tokens in handleJoin"
```

---

### Task 5: Update existing tests

**Files:**
- Modify: `api/src/__tests__/chat-room.test.ts`

The key change: tests that rely on sending a `clientId` and having it trusted must now capture the server-returned `clientId` + `clientToken` from the JOINED response, then use both for reconnection.

**Step 1: Update `connectAndJoin` helper to return `clientId` and `clientToken`**

```typescript
async function connectAndJoin(options?: {
  token?: string;
  clientId?: string;
  clientToken?: string;
  username?: string;
}): Promise<{ ws: WebSocket; msgs: ServerMessage[]; username: string; clientId: string; clientToken: string }> {
  const ws = await openWs();
  const msgs = collect(ws);
  await flush();

  const data: Record<string, unknown> = {};

  // If clientId + clientToken provided (reconnect), send both
  if (options?.clientId && options?.clientToken) {
    data.clientId = options.clientId;
    data.clientToken = options.clientToken;
  }

  // If a raw admin password is provided, exchange it for a session token first
  if (options?.token) {
    const sessionToken = await getSessionToken(options.token);
    if (sessionToken) data.token = sessionToken;
    else data.token = options.token; // pass through for invalid-token tests
  }

  send(ws, { type: CLIENT_MESSAGE_TYPE.JOIN, data });
  await flush();

  // Extract server-assigned values from JOINED response
  const joined = msgs.find((m) => m.type === SERVER_MESSAGE_TYPE.JOINED) as
    | { type: "joined"; isOwner: boolean; username: string; isBlocked: boolean; clientId?: string; clientToken?: string }
    | undefined;
  let username = "";
  let clientId = options?.clientId ?? "";
  let clientToken = options?.clientToken ?? "";

  if (joined) {
    username = joined.username;
    // New clients get clientId + clientToken back from server
    if (joined.clientId) clientId = joined.clientId;
    if (joined.clientToken) clientToken = joined.clientToken;
  }

  // If a specific username was requested (and we're not admin), send a rename
  if (options?.username && username !== options.username) {
    send(ws, { type: CLIENT_MESSAGE_TYPE.RENAME, data: { username: options.username } });
    await flush();
    const joinedIdx = joined ? msgs.indexOf(joined as ServerMessage) : -1;
    const renameJoined = msgs.find((m, i) => m.type === SERVER_MESSAGE_TYPE.JOINED && i > joinedIdx);
    if (renameJoined && "username" in renameJoined) {
      username = (renameJoined as { username: string }).username;
    }
  }

  return { ws, msgs, username, clientId, clientToken };
}
```

**Step 2: Update tests that reconnect with clientId**

In "reconnecting with same clientId returns same username":
```typescript
    it("reconnecting with same clientId returns same username", async () => {
      const { ws: ws1, username: firstUsername, clientId, clientToken } = await connectAndJoin();
      ws1.close();
      await flush();

      const { ws: ws2, username: secondUsername } = await connectAndJoin({ clientId, clientToken });
      expect(secondUsername).toBe(firstUsername);
      ws2.close();
    });
```

In "admin login does not change client mapping, logout restores original name":
```typescript
    it("admin login does not change client mapping, logout restores original name", async () => {
      // First join as regular user
      const { ws: ws1, username: originalName, clientId, clientToken } = await connectAndJoin();
      ws1.close();
      await flush();

      // Login as admin with same clientId
      const { ws: ws2, msgs: msgs2 } = await connectAndJoin({
        token: "test-admin-secret",
        clientId,
        clientToken,
      });
      const adminJoined = msgs2.find((m) => m.type === SERVER_MESSAGE_TYPE.JOINED);
      expect(adminJoined).toMatchObject({ username: "thalida", isOwner: true });
      ws2.close();
      await flush();

      // Logout (reconnect without token)
      const { ws: ws3, msgs: msgs3 } = await connectAndJoin({ clientId, clientToken });
      const logoutJoined = msgs3.find((m) => m.type === SERVER_MESSAGE_TYPE.JOINED);
      expect(logoutJoined).toMatchObject({ username: originalName, isOwner: false });
      ws3.close();
    });
```

**Step 3: Update tests that use explicit clientId for admin operations**

In "admin can delete all messages from a client":
```typescript
    it("admin can delete all messages from a client", async () => {
      const { ws: userWs, clientId } = await connectAndJoin({ username: "bulk-poster" });
      const { ws: adminWs, msgs: adminMsgs } = await connectAndJoin({
        token: "test-admin-secret",
      });

      send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 1" } });
      send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 2" } });
      send(userWs, { type: CLIENT_MESSAGE_TYPE.MESSAGE, data: { text: "spam 3" } });
      await flush();

      adminMsgs.length = 0;

      send(adminWs, { type: "delete_by_user", data: { clientId } });
      await flush();

      const removes = adminMsgs.filter((m) => m.type === SERVER_MESSAGE_TYPE.REMOVE);
      expect(removes).toHaveLength(3);

      userWs.close();
      adminWs.close();
    });
```

Other tests that used `clientId: cid` (e.g., rename tests, flag-after-rename) should be updated similarly — capture clientId from `connectAndJoin()` return value instead of passing a pre-generated UUID.

**Step 4: Add a new test for client token verification**

```typescript
    it("unverified clientId is ignored, server generates new identity", async () => {
      const { ws: ws1, username: firstName } = await connectAndJoin();
      ws1.close();
      await flush();

      // Send a fake clientId without a valid token — should get a new identity
      const { ws: ws2, username: secondName, clientId: newClientId } = await connectAndJoin({
        clientId: "fake-id",
        clientToken: "fake-token",
      });

      // Should get a different identity since the token was invalid
      expect(newClientId).not.toBe("fake-id");

      ws2.close();
    });
```

**Step 5: Run tests**

Run: `just api::test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add api/src/__tests__/chat-room.test.ts
git commit -m "test: update tests for signed client token verification"
```

---

### Task 6: Update frontend types

**Files:**
- Modify: `app/src/components/Chat/chat-types.ts:44` (joined type)

**Step 1: Add clientId and clientToken to joined server message**

Update the joined union member:
```typescript
  | { type: "joined"; isOwner: boolean; username: string; isBlocked: boolean; clientId?: string; clientToken?: string }
```

**Step 2: Commit**

```bash
git add app/src/components/Chat/chat-types.ts
git commit -m "feat: add clientId/clientToken to frontend joined type"
```

---

### Task 7: Update frontend connection code

**Files:**
- Modify: `app/src/components/Chat/chat-connection.ts`

**Step 1: Add client token storage key constant**

At line 11, next to `LS_CLIENT_ID_KEY`:
```typescript
const LS_CLIENT_TOKEN_KEY = "chat_client_token";
```

**Step 2: Update `loadIdentity()`**

Remove client-side UUID generation. Only load from localStorage (server is now the source of truth):

```typescript
  function loadIdentity(): void {
    state.clientId = localStorage.getItem(LS_CLIENT_ID_KEY);
    state.clientToken = localStorage.getItem(LS_CLIENT_TOKEN_KEY);
  }
```

**Step 3: Add `clientToken` to state interface**

```typescript
interface ChatClientState {
  ws: WebSocket | null;
  username: string | null;
  clientId: string | null;
  clientToken: string | null;
  adminUsername: string | null;
  isOwner: boolean;
  pendingRename: boolean;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  idleManager: ReturnType<typeof createIdleManager> | null;
}
```

Add `clientToken: null` to the initial state object.

**Step 4: Update `sendJoin()`**

Send clientToken alongside clientId:

```typescript
  function sendJoin(): void {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    const token = getSessionToken();
    const data: Record<string, string> = {};
    if (state.clientId) data.clientId = state.clientId;
    if (state.clientToken) data.clientToken = state.clientToken;
    if (token) data.token = token;
    state.ws.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPE.JOIN, data }));
  }
```

**Step 5: Update JOINED handler to store server-returned credentials**

```typescript
    [SERVER_MESSAGE_TYPE.JOINED](data) {
      if (data.type !== "joined") return;
      state.isOwner = data.isOwner;
      state.username = data.username;
      els.usernameInput.value = data.username;

      // Store server-issued identity credentials (only present on first visit)
      if (data.clientId) {
        state.clientId = data.clientId;
        localStorage.setItem(LS_CLIENT_ID_KEY, data.clientId);
      }
      if (data.clientToken) {
        state.clientToken = data.clientToken;
        localStorage.setItem(LS_CLIENT_TOKEN_KEY, data.clientToken);
      }

      updateAdminUI();
      setBlocked(data.isBlocked);
    },
```

**Step 6: Run app typecheck and build**

Run: `just app::typecheck && just app::build`
Expected: Both PASS

**Step 7: Commit**

```bash
git add app/src/components/Chat/chat-connection.ts
git commit -m "feat: store and send signed client token on frontend"
```

---

### Task 8: Final verification

**Step 1: Run all tests**

Run: `just api::typecheck && just api::test && just app::typecheck && just app::build`
Expected: ALL PASS

**Step 2: Manual smoke test (optional)**

1. `just api::serve` + `just app::serve`
2. Open browser, connect to chat — should get assigned a username
3. Check localStorage: `chat_client_id` and `chat_client_token` should be set
4. Refresh page — should reconnect with same username
5. Open devtools console, modify `chat_client_id` to garbage, refresh — should get new identity
6. Admin login/logout should preserve underlying identity
