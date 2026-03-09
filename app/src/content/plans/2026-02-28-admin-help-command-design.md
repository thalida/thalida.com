---
title: Admin /help Command — Design
description: >-
  Add an admin-only `/help` slash command to the chat that shows available
  commands as a system notice. Build a command registry so `/help`
  auto-generates from registered commands.
publishedOn: 2026-03-01T05:06:54.000Z
subcategory: admin-help-command
category: chat
tags: [design]
---

# Admin /help Command — Design

## Goal

Add an admin-only `/help` slash command to the chat that shows available commands as a system notice. Build a command registry so `/help` auto-generates from registered commands.

## Key Decisions

- **Admin-only dispatch**: Only `isOwner` connections trigger command handling. Non-admin users typing `/help` or any `/command` have their message sent as regular chat text — no error, no hint that commands exist.
- **Server-side registry**: Commands are registered in a central registry. `/help` iterates the registry to build its output.
- **System notice display**: The help output renders as a styled system notice in the chat, visible only to the admin (not broadcast).
- **New `HELP` server message type**: Carries an array of `{ name, description }` so the client can render it cleanly.

## Architecture

### Command Registry (`api/src/commands.ts`)

```ts
interface Command {
  name: string;
  description: string;
  handler: (ws: WebSocket, args: string, chatRoom: ChatRoom) => void;
}
```

- Exports a `commands` array and a `dispatch(text, ws, chatRoom)` function.
- `dispatch` is only called when `isOwner` is true.
- Built-in commands: `/help`, `/unblock <ip>`.

### Dispatch Flow

In `handleChatMessage`:

1. If `info.isOwner` and text starts with `/` → call `dispatch(text, ws, chatRoom)`
2. If dispatch returns `true` (command matched) → return early
3. Otherwise → treat as normal message

### Server Message Type

New `HELP` type added to `SERVER_MESSAGE_TYPE` and `ServerMessage` union:

```ts
interface ServerHelpMessage {
  type: "help";
  commands: Array<{ name: string; description: string }>;
}
```

### Client Handling

In `chat-client.ts`, handle `help` message type by calling `appendNotice()` with formatted command list.

## Files Changed

| File | Change |
|------|--------|
| `api/src/commands.ts` | New — command registry with `/help` and `/unblock` |
| `api/src/chat-room.ts` | Replace hardcoded `/unblock` regex with registry dispatch |
| `api/src/types.ts` | Add `HELP` message type + `ServerHelpMessage` |
| `app/src/components/Chat/chat-client.ts` | Handle `help` messages, render as notice |

## Example Output

When admin types `/help`:

```
Available commands:
  /help — Show this help message
  /unblock <ip> — Unblock a user by IP address
```
