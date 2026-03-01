# Chat: clientId-Based Identity

Replace IP-based identity with clientId throughout the chat system. This makes flag, block, delete-by-user, and rename all operate per-browser rather than per-IP, so users on the same network are independent.

## Data Model

### ChatMessage
Add `clientId: string`. Stored on every message so flag/delete/rename can trace back to the originating browser.

### ConnectionInfo
Remove `ip`. The `clientId` field (already optional) becomes required.

### BlockedEntry
Change from `{ ip, username, blockedAt }` to `{ clientId, username, blockedAt }`.

## Server (chat-room.ts)

### Removals
- `ipBySocket` map
- `CF-Connecting-IP` header reads
- `ConnectionInfo.ip`

### blockedEntries
Rekey from IP to clientId. On load, discard any old IP-keyed entries (no migration path).

### handleJoin
- Block check: `blockedEntries.has(clientId)` instead of IP lookup.
- Rename detection: if a connection already exists with the same `clientId` but different username, treat this as a rename:
  1. Update `msg.username` on all `this.messages` where `msg.clientId === clientId`
  2. Broadcast `{ type: "rename", oldUsername, newUsername }` to all clients
  3. Continue normal join flow

### handleFlag
1. Get `clientId` from the flagged message (`message.clientId`)
2. Add `clientId` to `blockedEntries`
3. Find all connections with that `clientId`, send BLOCKED

### handleDeleteByUser
Match `msg.clientId` instead of `msg.username`. Client sends `clientId` (from message data attribute) instead of username.

### handleUnblock
Unblock by clientId instead of IP.

### addWarning
Auto-block by clientId instead of IP.

### buildStatusMessage
Dedup by `clientId` directly (remove `ip:username` fallback).

## Types (types.ts)

- `ChatMessage`: add `clientId: string`
- `ConnectionInfo`: remove `ip`, make `clientId` required
- `BlockedEntry`: `ip` → `clientId`
- `ClientDeleteByUserData`: `{ username }` → `{ clientId }`
- `ClientUnblockData`: `{ ip }` → `{ clientId }`
- Add `RENAME: "rename"` to `SERVER_MESSAGE_TYPE`
- Add `ServerRenameMessage { type: "rename", oldUsername: string, newUsername: string }`
- `ServerFlaggedMessage`: `ip` → `clientId`
- `ServerUnblockedMessage`: `ip` → `clientId`
- Add `ServerRenameMessage` to `ServerMessage` union

## Client (chat-client.ts)

- Store `clientId` from received messages as `data-client-id` on message DOM elements
- Handle `"rename"`: query `[data-chat="username"]` spans, update text where it matches `oldUsername`
- Flag callback: send `clientId` from element's data attribute
- Delete-by-user: send `clientId` instead of username
- Unblock: send `clientId` instead of IP
- Blocked list display: show truncated clientId instead of IP
