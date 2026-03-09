---
title: Signed Client Identity
description: >-
  Client identity (clientId) is currently generated on the frontend and trusted
  blindly by the API. A malicious user can send any clientId to impersonate
  another user.
publishedOn: 2026-03-06T02:00:45.000Z
subcategory: client-identity
category: chat
tags: [design]
---

# Signed Client Identity

## Problem

Client identity (clientId) is currently generated on the frontend and trusted blindly by the API. A malicious user can send any clientId to impersonate another user.

## Solution

Use HMAC-signed client tokens. The API generates the clientId, signs it with `ADMIN_SECRET`, and returns both to the client. On reconnect, the API verifies the signature before trusting the clientId.

## Token Model

Two independent tokens, two purposes:

- **clientToken** — permanent HMAC signature of clientId. Proves ownership of a client identity. Stored in localStorage.
- **sessionToken** — temporary (24h) HMAC-signed admin credential. Stored in sessionStorage. Layered on top of client identity.

The clientToken uses deterministic HMAC: `HMAC(clientId, ADMIN_SECRET)`. No expiry, no DB column — the server verifies by recomputing.

## Data Model

Rename `client_mappings` → `clients`:

```sql
CREATE TABLE IF NOT EXISTS clients (
  client_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

No schema change beyond the rename — the token is stateless (HMAC-derived, not stored).

## Wire Protocol

### JOIN request

```json
{
  "type": "join",
  "data": {
    "clientId": "abc-123",
    "clientToken": "hex-hmac...",
    "token": "admin-session-token..."
  }
}
```

### JOINED response

```json
{
  "type": "joined",
  "isOwner": false,
  "username": "red-fox",
  "isBlocked": false,
  "clientId": "abc-123",
  "clientToken": "hex-hmac..."
}
```

`clientId` and `clientToken` are returned on first visit (when server generates them). On reconnect with valid credentials, they are omitted.

## Flow

| Scenario | Behavior |
|---|---|
| First visit (no clientId) | Generate clientId + HMAC token, create `clients` row, return both |
| Reconnect (valid clientId + clientToken) | Verify HMAC, look up username, return it |
| Forged clientId (invalid/missing token) | Ignore, treat as first visit |
| Admin login | Verify clientToken (identity) + sessionToken (privilege) |
| Admin logout | Drop sessionToken, send clientId + clientToken, restore regular username |

## Files Changed

| File | Change |
|---|---|
| `api/src/session.ts` | Add `createClientToken` / `verifyClientToken` |
| `api/src/chat-storage.ts` | Rename table → `clients`, update SQL |
| `api/src/chat-room.ts` | Verify clientToken in handleJoin, generate on first visit |
| `api/src/types.ts` | Add `clientId?` / `clientToken?` to join types |
| `app/.../chat-connection.ts` | Store clientToken, send on reconnect |
| `app/.../chat-types.ts` | Add clientId/clientToken to joined type |

## Files NOT Changed

- Admin login/logout pages (sessionToken flow unchanged)
- Message schema, blocked_clients schema
- Moderation, commands, config
