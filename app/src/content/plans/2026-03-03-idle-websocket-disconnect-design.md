---
title: Idle WebSocket Disconnect Design
description: >-
  The ChatRoom Durable Object accumulates wall-clock duration as long as any
  WebSocket is connected. Idle browser tabs keep connections open indefinitely,
  which exceeded the Cloudflare free tier limit (2,147,483,647 ms/day).
publishedOn: 2026-03-04T03:18:40.000Z
subcategory: idle-websocket-disconnect
category: chat
tags: [design]
---

# Idle WebSocket Disconnect Design

## Problem

The ChatRoom Durable Object accumulates wall-clock duration as long as any WebSocket is connected. Idle browser tabs keep connections open indefinitely, which exceeded the Cloudflare free tier limit (2,147,483,647 ms/day).

## Solution

Client-driven idle detection: the client tracks user activity and closes the WebSocket after 5 minutes of inactivity (tab hidden + no interaction). Reconnects instantly when the user returns.

## Approach

**Client-only changes** in `app/src/components/Chat/chat-client.ts`. No server or protocol changes needed — the server already handles close/reconnect correctly.

### New State

- `isIdle: boolean` — whether the client intentionally disconnected due to inactivity
- `idleTimer: ReturnType<typeof setTimeout> | null` — the 5-minute countdown

### Activity Signals

- `document.visibilitychange` — tab hidden/visible
- `mousemove`, `keydown`, `touchstart` on the chat container — user interaction

### Idle Lifecycle

```
Tab visible, connected      -> no timer running
Tab hidden                  -> start 5-min idle timer
  User returns before 5m    -> cancel timer, stay connected
  Timer expires             -> ws.close(), isIdle = true
Tab visible / user interacts -> if isIdle, connect() immediately
```

### Changes to Reconnect Behavior

- `scheduleReconnect()`: skip the automatic 3-second reconnect loop when `isIdle` is true (no point reconnecting in a hidden tab)
- Reconnection only triggered by activity detection (visibility change or user interaction)
- Existing reconnect-on-error/close behavior unchanged for network failures

### Reconnect Experience

1. Activity detected -> `connect()` called
2. WebSocket opens -> `sendJoin()` with stored `clientId`
3. Server responds with `joined` (same username) + `history` + `status`
4. User sees messages restored, same username, no disruption

### Constants

- `IDLE_TIMEOUT_MS = 5 * 60 * 1000` (5 minutes)

## What Stays the Same

- No new message types or protocol changes
- Server code untouched
- `clientId` persistence in localStorage unchanged
- Username reservation system unchanged
