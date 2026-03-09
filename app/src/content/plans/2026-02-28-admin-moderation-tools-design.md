---
title: Admin Moderation Tools — Design
description: >-
  Add three admin moderation features to the chat: a delete message button, a
  flag/ban button, and a `/blocked` command to list all blocked users.
publishedOn: 2026-03-01T05:06:54.000Z
planType: design
topic: admin-moderation-tools
status: completed
category: chat
---

# Admin Moderation Tools — Design

## Goal

Add three admin moderation features to the chat: a delete message button, a flag/ban button, and a `/blocked` command to list all blocked users.

## Key Decisions

- **Server-side auth on everything**: All actions (delete, flag) require `isOwner` validation on the server. Client-side button hiding is cosmetic only. Unauthorized requests are silently ignored — no error, no hint the action exists.
- **Delete has click-to-confirm UX**: First click shows confirm state, second click deletes.
- **Flag bans first, then asks about message deletion**: Admin sees a system notice with choices: delete all messages, delete just the flagged message, or keep messages.
- **Blocked list stores username + IP**: Migrate storage from `string[]` to structured entries with username and timestamp.
- **All new actions use existing patterns**: `REMOVE` broadcast for deletions, command registry for `/blocked`, system notices for admin feedback.

## Feature 1: Delete Message Button

### Server

- New client message type `DELETE`: `{ type: "delete", data: { id: string } }`
- Handler in `ChatRoom`: validates `isOwner`, removes message from `this.messages` by ID, broadcasts `REMOVE` (existing type) to all clients
- Non-owner `DELETE` requests are silently ignored (no response)
- New public method `handleDeleteMessage(ws, messageId)` exposed for the client message handler

### Client

- Message template gains a delete button (trash icon), hidden by default
- When `isOwner` is true after join, admin controls are revealed on all messages
- Click 1: button enters confirm state (visual change — red/highlighted)
- Click 2: sends `{ type: "delete", data: { id } }` to server
- Message removal happens via the existing `REMOVE` handler (already implemented)

## Feature 2: Flag/Ban Button

### Server

- New client message type `FLAG`: `{ type: "flag", data: { id: string } }`
- Handler in `ChatRoom`: validates `isOwner`, looks up the message by ID to find the username, finds all connections with that username to get the IP
- Adds IP to blockedIps (with username + timestamp), persists
- Sends `BLOCKED` message to the flagged user's socket(s), closes their connections
- Responds to admin with new `FLAGGED` message: `{ type: "flagged", username: string, ip: string, messageId: string }`
- Non-owner `FLAG` requests are silently ignored

- New client message type `DELETE_BY_USER`: `{ type: "delete_by_user", data: { username: string } }`
- Handler: validates `isOwner`, removes all messages from `this.messages` where `msg.username === username`, broadcasts `REMOVE` for each removed message ID

### Client

- Message template gains a flag button (flag icon) next to the delete button, hidden by default
- Shown when `isOwner` is true
- Click shows confirm state (like delete)
- On confirm, sends `{ type: "flag", data: { id } }` to server
- On receiving `FLAGGED` response, shows a system notice:
  ```
  Banned [username] ([ip]).
  Delete their messages? [all] [this one] [none]
  ```
- "all" sends `{ type: "delete_by_user", data: { username } }`
- "this one" sends `{ type: "delete", data: { id: messageId } }`
- "none" dismisses the notice (no action)
- The clickable options are styled spans inside the notice

## Feature 3: `/blocked` Command

### Server

- Register `/blocked` command in the command registry
- New server message type `BLOCKED_LIST`: `{ type: "blocked_list", entries: Array<{ ip: string, username: string, blockedAt: number }> }`
- Handler reads the blocked entries and sends them to the admin socket

### Client

- Handle `blocked_list` message type
- Render as system notice listing each entry:
  ```
  Blocked users:
    [username] — [ip] (blocked [date])
    [username] — [ip] (blocked [date])
  ```

### Storage Migration

Current format: `blockedIps` stored as `string[]` (IPs only).

New format: stored as `Array<{ ip: string, username: string, blockedAt: number }>`.

Migration on load:
- If stored data is `string[]` (old format), convert each IP to `{ ip, username: "unknown", blockedAt: 0 }`
- If stored data is the new format, use directly
- All new blocks store the full entry going forward

## New Client Message Types

```ts
// Added to CLIENT_MESSAGE_TYPE
DELETE: "delete"
FLAG: "flag"
DELETE_BY_USER: "delete_by_user"
```

## New Server Message Types

```ts
// Added to SERVER_MESSAGE_TYPE
FLAGGED: "flagged"
BLOCKED_LIST: "blocked_list"
```

## Files Changed

| File | Change |
|------|--------|
| `api/src/types.ts` | New client types (DELETE, FLAG, DELETE_BY_USER), new server types (FLAGGED, BLOCKED_LIST), updated ClientMessage union |
| `api/src/commands.ts` | Register `/blocked` command |
| `api/src/chat-room.ts` | Handle delete/flag/delete_by_user, migrate blockedIps storage, new public methods |
| `app/src/components/Chat/Chat.astro` | Add delete/flag buttons to message template, styles for confirm state |
| `app/src/components/Chat/chat-client.ts` | Handle new server message types, admin button logic, flagged notice with clickable choices, new client message sending |
