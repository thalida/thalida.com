# Chat: Auto Page Context Design

**Date:** 2026-02-28

## Problem

The chat currently has a user-facing dropdown letting visitors choose between "page" and "general" context when sending a message. This is unnecessary UI complexity. The right behavior is to silently attach the current page path to every message automatically.

## Design

### Context shape

Simplify `MessageContext` to just a path:

```ts
interface MessageContext {
  path: string; // e.g. "/", "/projects", "/projects/post/my-project"
}
```

### Client (`chat-client.ts`)

- Remove: `contextEl`, `contextSelect`, `currentContext`, `readPageContext`, `updatePlaceholder`, `astro:after-swap` listener
- `sendMessage()` always attaches `{ context: { path: window.location.pathname } }`
- `window.location.pathname` already excludes query params and hash
- `appendMessage()`: context link `href` and text both use `msg.context.path`

### Server (`chat-room.ts`)

- On message receipt, validate `context.path` against `^\/[a-z0-9\-._/]*$`
- If invalid: drop context silently (store/broadcast message without it)
- If valid: store and broadcast as-is

### UI (`Chat.astro`)

- Remove the `<span id="js-chat-context">` block (select dropdown + label)
- No other UI changes — placeholder stays "Type a message..."

### Layout (`BaseLayout.astro`)

- Remove the `<meta name="page-context">` tag (no longer needed)

## Files Changed

| File | Change |
|------|--------|
| `app/src/components/Chat/Chat.astro` | Remove context select span |
| `app/src/components/Chat/chat-client.ts` | Remove context UI logic, always send pathname |
| `api/src/types.ts` | Simplify `MessageContext` to `{ path: string }` |
| `api/src/chat-room.ts` | Validate path on receipt, drop if invalid |
| `app/src/layouts/BaseLayout/BaseLayout.astro` | Remove page-context meta tag |
