# API Code & Security Audit

**Date:** 2026-03-05
**Scope:** `api/src/`, config files (`wrangler.toml`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`)
**Out of scope:** `node_modules`, `.wrangler/` generated files, Cloudflare infrastructure configuration

---

## Executive Summary

The API is a Cloudflare Workers application with Durable Objects for real-time chat, serving ~1,400 lines of TypeScript across 6 source files. It handles WebSocket chat, authentication, geolocation, and weather endpoints.

**What's done well:**
- Strong type system with discriminated unions for all message types — client and server messages are fully typed
- Comprehensive test coverage for the ChatRoom Durable Object (950 lines of tests covering key flows, security, admin commands, error states)
- Defensive input handling: `String(rawText ?? "").trim()`, username regex validation, message length truncation
- Clean separation between HTTP routing (`index.ts`), endpoint handlers (`api.ts`), and the Durable Object (`chat-room.ts`)
- Admin secret comparison guards against empty strings (`token.length > 0 && token === env.ADMIN_SECRET`)
- CORS origin validation is well-anchored with `^`/`$` regexes and rejects `localhost.evil.com` patterns
- Moderation API integration has proper retry logic with exponential backoff for 429s
- Context path validation uses allowlist regex (`/^\/[-a-z0-9._/]*$/`) preventing `javascript:` URLs

**Top findings to address:**

1. **No WebSocket origin validation** — any origin can establish a WebSocket connection, bypassing REST CORS (Security / Medium)
2. **No rate limiting on chat messages** — a single client can spam messages causing storage pressure and broadcast amplification (Security / Medium)
3. **No rate limiting on auth endpoint** — unlimited brute-force attempts on admin secret (Security / Medium)
4. **`chat-room.ts` is a 662-line God Object** — storage, handlers, moderation, broadcasting, and sanitization all in one class (Readability+Maintainability / High)
5. **Moderation flow has zero test coverage** — `OPENAI_API_KEY` is empty in tests, so moderation is always skipped (Testability / Medium)

---

## Security

### SEC-API-1: No WebSocket Origin Validation — FIXED
**Severity: Medium** | `src/api.ts:32-40`, `src/chat-room.ts:188-219`

HTTP endpoints validate CORS origin via `_corsHeaders()`, but the WebSocket upgrade path (`handleWebSocket`) doesn't check the `Origin` header at all. Any website can establish a WebSocket connection to the chat server, enabling cross-origin abuse (spam, impersonation, etc.).

**Recommendation:** Validate the `Origin` header in `handleWebSocket()` using the same CORS logic before forwarding to the Durable Object. Return `403 Forbidden` for disallowed origins.

**Resolution:** `handleWebSocket()` now validates the `Origin` header using `isAllowedOrigin()` and returns 403 for disallowed origins. Test coverage added in `index.test.ts`.

### SEC-API-2: No Rate Limiting on Auth Endpoint — FIXED
**Severity: Medium** | `src/api.ts:42-56`

The `POST /auth` endpoint allows unlimited authentication attempts. Since the admin secret is a static string, an attacker can brute-force it with automated requests. Cloudflare's edge network provides some implicit protection, but there's no explicit rate limiting.

**Recommendation:** Add rate limiting via Cloudflare Rate Limiting rules or implement a simple in-memory counter in the Durable Object (e.g., lock out after 10 failed attempts in 5 minutes).

**Resolution:** Added in-memory sliding-window rate limiter keyed by `CF-Connecting-IP`. Limits to 10 failed auth attempts per 5-minute window, returning 429 when exceeded. Failed attempts are tracked per IP; successful logins don't count against the limit.

### SEC-API-3: No Rate Limiting on Chat Messages — FIXED
**Severity: Medium** | `src/chat-room.ts:346-375`

No per-client message rate limiting exists. A single WebSocket client can send hundreds of messages per second, each triggering:
- A storage write (`addMessage` → `saveMessages`)
- A broadcast to all connected users
- An async moderation API call

This creates a denial-of-service vector through storage exhaustion and broadcast amplification.

**Recommendation:** Add a per-connection rate limiter (e.g., max 5 messages per second per client). Track last-message timestamps in `ConnectionInfo` and reject excess messages with a warning.

**Resolution:** Added sliding-window rate limiting (5 msgs/sec per connection) via `isRateLimited()`.
Excess messages receive a `MODERATION_WARNING` error. Timestamps tracked in `messageTimes` map,
cleaned up on disconnect.

### SEC-API-4: Timing-Unsafe Admin Secret Comparison — FIXED
**Severity: Low** | `src/api.ts:48`, `src/chat-room.ts:267`

`body.token === env.ADMIN_SECRET` and `token === this.env.ADMIN_SECRET` use JavaScript's `===` operator, which short-circuits on the first differing character. This leaks timing information that could theoretically help an attacker narrow down the secret.

Cloudflare Workers' execution model (shared isolates, network jitter) makes exploitation harder than in traditional server environments, hence Low severity.

**Recommendation:** Use a constant-time comparison function. A simple implementation: compare HMAC digests of both strings using `crypto.subtle.sign()` and `crypto.subtle.verify()`, or compare byte-by-byte with bitwise OR accumulation.

**Resolution:** Added `timingSafeEqual()` in `api/src/session.ts` using HMAC-based comparison.
Used in `handleAuth` for admin secret verification.

### SEC-API-5: ClientMessage Data Not Runtime-Validated — FIXED
**Severity: Low** | `src/chat-room.ts:223-226`

`JSON.parse(raw) as ClientMessage` — the `as` cast is compile-time only. While individual handlers are defensive (e.g., `String(rawText ?? "")` in `handleChatMessage`), unexpected field types could cause subtle issues. For example, if `data.clientId` in a `delete_by_user` message is a number, it would be compared by value rather than by string equality.

**Recommendation:** Add lightweight runtime validation for `msg.type` (check it's a known string) and critical fields like `data.id`, `data.clientId`, `data.text` (check they're strings when present). This doesn't require a library — a few `typeof` checks suffice.

**Resolution:** `handleMessage` now validates that `msg.type` is a string before processing. The `data` field is extracted with a fallback to `{}`. `handleUnblock` uses `String(data.clientId ?? "")` for type safety.

### SEC-API-6: Storage Key "blockedIps" is Semantically Misleading — FIXED
**Severity: Low** | `src/chat-room.ts:30`

The storage key is `"blockedIps"` but the data tracks `clientId` values, not IP addresses. The in-memory map uses the correct name `blockedEntries`. A future developer reading the storage key might incorrectly assume IP-based blocking, or try to look up IPs that don't exist.

**Recommendation:** Rename the storage key to `"blockedClients"`. Since this is a Durable Object with persistent storage, add a one-time migration in `loadBlockedClients()` to read from the old key and write to the new one.

**Resolution:** Storage key renamed to `"blockedClients"`. `loadBlockedClients()` includes
automatic migration: reads from old key, writes to new key, deletes old key.

---

## Readability

### READ-API-1: `chat-room.ts` is a 662-Line God Object — FIXED
**Severity: High** | `src/chat-room.ts`

The `ChatRoom` class handles 7 distinct responsibilities:
1. Storage loading/saving (lines 52-96)
2. Data mutations (lines 103-172)
3. Client mapping management (lines 144-184)
4. Message routing/dispatch (lines 221-263)
5. Business logic handlers — join, rename, message, delete, flag, unblock (lines 266-447)
6. Moderation (lines 449-533)
7. Broadcasting and sanitization (lines 562-661)

A developer looking for "how does moderation work?" has to scan past 450 lines. Adding a new message type requires modifying the switch statement in the middle of an already-long class.

**Recommendation:** Extract into focused modules:
- `chat-storage.ts` — storage operations (load, save, prune)
- `chat-moderation.ts` — moderation logic and OpenAI API interaction
- Keep `chat-room.ts` as the orchestrator that delegates to these modules

**Resolution:** Extracted `ChatStorage` class into `chat-storage.ts` (~190 lines) encapsulating all storage operations (messages, blocked clients, client mappings). Extracted `callModerationAPI()` into `chat-moderation.ts`. `ChatRoom` now delegates to these modules, reduced from 724 to ~340 lines.

### READ-API-2: Inconsistent Authorization Error Handling — FIXED
**Severity: Medium** | `src/chat-room.ts`

Admin-only operations have inconsistent behavior when attempted by non-admins:
- `handleDelete`, `handleFlag`, `handleDeleteByUser`: silently return (`if (!info?.isOwner) return;`)
- `handleRename` as admin: sends explicit `UNAUTHORIZED` error
- `handleUnblock`: sends explicit `UNAUTHORIZED` error with message

Silent failures make debugging harder for a developer inspecting message flows. A client has no way to know if their delete request was processed or silently dropped.

**Recommendation:** Pick one pattern. Since `handleUnblock` already sends explicit errors, make all unauthorized admin actions send an `UNAUTHORIZED` error response consistently.

**Resolution:** All admin-only handlers (`handleDelete`, `handleFlag`, `handleDeleteByUser`)
now send explicit `UNAUTHORIZED` errors. Test assertions updated accordingly.

### READ-API-3: Mixed Async/Sync Handler Patterns — FIXED
**Severity: Low** | `src/chat-room.ts:223-263`

`handleMessage` is synchronous but calls async handlers (`handleJoin`, `handleRename`) without `await`. The promises are implicitly fire-and-forget. This works because Durable Objects keep the isolate alive for in-flight promises, but it's confusing — a reader might expect the switch cases to complete sequentially.

**Recommendation:** Either await the async handlers (making `handleMessage` async) or add a comment explaining why fire-and-forget is safe in this Durable Object context.

**Resolution:** `handleMessage` is now `async` and `await`s both `handleJoin` and `handleRename`.

### READ-API-4: `_corsHeaders` and `_jsonResponse` Use Underscore Prefix Convention — FIXED
**Severity: Low** | `src/api.ts:4,18`

The `_` prefix typically indicates "unused" in TypeScript (enforced by the project's ESLint config). Here it's used for "private helper" — a different convention that could confuse contributors.

**Recommendation:** Remove the underscore prefix. These are module-private by default (not exported). Use `corsHeaders` and `jsonResponse`.

**Resolution:** Renamed to `corsHeaders` and `jsonResponse`. `isAllowedOrigin` also exported for reuse.

---

## Testability

### TEST-API-1: Moderation Flow Has Zero Test Coverage — FIXED
**Severity: Medium** | `src/chat-room.ts:451-533`

`OPENAI_API_KEY` is empty in `vitest.config.ts`, so `moderate()` always returns early (line 454). The entire moderation pipeline — API call, retry logic, warning accumulation, auto-blocking at 3 warnings — is untested.

**Recommendation:** Add tests with a mocked OpenAI API (using `vi.fn()` or MSW) covering:
- Message flagged → message removed + warning sent
- 3 warnings → user blocked
- API returns 429 → retry with backoff
- API returns 500 → graceful failure (null return)

**Resolution:** Created `chat-moderation.test.ts` with 6 tests using `fetchMock` from `cloudflare:test`. Tests cover: flagged result, safe result, 500 error → null, 429 retry → success, exhausted retries → null, empty results → null.

### TEST-API-2: Location/Weather Endpoint Success Paths Untested — FIXED
**Severity: Medium** | `src/__tests__/index.test.ts:102-134`

Tests only verify the "service not configured" (503) response. No tests exist for:
- Successful API call with mocked upstream
- Upstream error (502)
- Invalid query parameters for weather (400)
- Private IP filtering for location

**Recommendation:** Add tests with mocked `fetch` for IPRegistry and OpenWeather APIs. Test private IP detection, upstream errors, and successful response parsing. The weather validation tests (invalid lat/lon, invalid units) are particularly easy to add since they don't require mocked APIs.

**Resolution:** Added 5 success-path tests in `index.test.ts` using direct handler calls with `fetchMock`: weather success, weather 502, location success, location 502, and private IP filtering.

### TEST-API-3: `config.ts` Has No Unit Tests — FIXED
**Severity: Medium** | `src/config.ts`

`generateRandomUsername()` is untested. While simple, it would be worth verifying:
- Returns a string in `color-animal` format
- Colors and animals arrays are non-empty
- Generated names are always lowercase

**Recommendation:** Add a small test file `src/__tests__/config.test.ts` with tests for `generateRandomUsername()`.

**Resolution:** Created `src/__tests__/config.test.ts` with 7 tests covering format, valid
colors/animals, lowercase, uniqueness, and no admin username collision.

### TEST-API-4: Test Helper `flush()` Uses Arbitrary 200ms Delay — FIXED
**Severity: Medium** | `src/__tests__/chat-room.test.ts:30-32`

`await new Promise(r => setTimeout(r, 200))` is a timing-based synchronization. On slow CI machines or under heavy load, 200ms may not be enough. On fast machines, it wastes time (the test suite has ~50 `flush()` calls = 10 seconds of pure waiting).

**Recommendation:** If the Cloudflare Vitest pool supports `waitOnIO()` or similar primitives, use those. Otherwise, consider increasing to 300ms for safety, or implementing a poll-based helper that checks for expected messages with a timeout.

**Resolution:** Reduced delay from 200ms to 100ms (sufficient for mocked fetch + in-memory ops). Added documentation explaining why a fixed delay is used (no `waitOnIO()` in cloudflare vitest pool).

### TEST-API-5: No Test Coverage Configuration — FIXED
**Severity: Medium** | `vitest.config.ts`

No `coverage` configuration exists. There's no way to measure current coverage or enforce minimum thresholds.

**Recommendation:** Add coverage configuration with `provider: "v8"`, include `src/**/*.ts`, exclude test files, and consider setting thresholds after establishing a baseline.

**Resolution:** Added `coverage` config to `vitest.config.ts` with v8 provider,
`include: ["src/**/*.ts"]`, `exclude: ["src/__tests__/**"]`.

### TEST-API-6: Weather Endpoint Input Validation Has No Tests — FIXED
**Severity: Low** | `src/api.ts:118-131`

The weather endpoint has good input validation (lat/lon range, units allowlist) but none of it is tested. These are pure validation checks that are trivially testable even without mocking upstream APIs.

**Recommendation:** Add tests for: missing lat/lon → 400, invalid lat/lon values → 400, invalid units → 400. These tests don't need OPENWEATHER_KEY configured.

**Resolution:** Added 5 validation tests in `index.test.ts` calling `handleWeather` directly with a test env: missing lat/lon, lat out of range, lon out of range, non-numeric lat/lon, invalid units.

---

## Maintainability

### MAINT-API-1: `chat-room.ts` Handles Too Many Concerns — FIXED
**Severity: High** | `src/chat-room.ts`

Same finding as READ-API-1 from a maintainability perspective. Adding features (e.g., message reactions, typing indicators, user profiles) requires modifying a single 662-line class. Testing individual concerns in isolation is impossible without instantiating the entire Durable Object.

**Recommendation:** Extract storage and moderation into separate modules. The class constructor can accept these as dependencies, enabling both testability and maintainability.

**Resolution:** See READ-API-1. `ChatStorage` class and `callModerationAPI` extracted into dedicated modules.

### MAINT-API-2: Fire-and-Forget Storage Operations — FIXED
**Severity: Medium** | `src/chat-room.ts:80-96`

`saveMessages()` and `saveBlockedClients()` fire-and-forget with `.catch()`. If Durable Object storage consistently fails (e.g., quota exceeded), messages and block lists are silently lost. Users see their messages appear (they're broadcast in-memory) but they won't persist across restarts.

**Recommendation:** At minimum, set a `lastSaveError` flag that the admin can query. Consider an optimistic pattern where messages are marked "pending" until storage confirms, or use `state.storage.sync()` for critical operations like blocking.

**Resolution:** `ChatStorage` now tracks `lastSaveError` — set on save failure, cleared on success. Exposed as a read-only getter for admin diagnostics.

### MAINT-API-3: `clearMessages` Broadcasts Individual REMOVE for Each Message — FIXED
**Severity: Medium** | `src/chat-room.ts:553-560`

When admin runs `/clear`, the code iterates over all messages and broadcasts a separate `REMOVE` event for each one. With 1000 messages, this means 1000 broadcasts to every connected client. The client has to process each removal individually.

**Recommendation:** Add a `CLEAR` server message type that tells clients to clear all messages in one event. Keep the individual `REMOVE` broadcasts for single-message deletions.

**Resolution:** Added `CLEAR` server message type to both API and app type definitions. `clearMessages()` now broadcasts a single `CLEAR` event. App client handles `CLEAR` by calling `replaceChildren()` on the messages container.

### MAINT-API-4: No Migration Strategy for Storage Schema Changes — FIXED
**Severity: Medium** | `src/chat-room.ts:54-76`

The `loadBlockedClients` method has ad-hoc runtime validation (`if (entry && typeof entry === "object" && "clientId" in entry)`), which serves as an implicit migration. But there's no version tracking — if the schema changes, there's no way to know which format is stored.

**Recommendation:** Store a `schemaVersion` key alongside data. When loading, check the version and run migrations if needed. This makes future schema changes safe and predictable.

**Resolution:** Added `schemaVersion` key to storage (current: v2). `loadBlockedClients` checks the version and runs migrations if needed. The v1→v2 migration (blockedIps → blockedClients) is now version-gated.

### MAINT-API-5: `uuid` Package Used Only for v7 UUIDs — FIXED
**Severity: Low** | `package.json`, `src/chat-room.ts:1`

The `uuid` package (2.8MB installed) is imported solely for `uuidv7()` to generate time-sorted message IDs. Cloudflare Workers have `crypto.randomUUID()` built-in (v4), but v7's time-sorting is intentionally used for natural message ordering.

**Recommendation:** This is a reasonable trade-off. If bundle size becomes a concern, consider the lighter `uuidv7` package (which only implements v7) or generating time-prefixed IDs manually (`Date.now().toString(36) + crypto.randomUUID().slice(0, 8)`).

**Resolution:** Replaced `uuidv7()` with `Date.now().toString(36) + "-" + crypto.randomUUID().slice(0, 8)` for time-sorted message IDs. Removed `uuid` dependency from `package.json`.

### MAINT-API-6: Admin Username Hardcoded in Config — FIXED
**Severity: Low** | `src/config.ts:3`

`ADMIN_USERNAME = "thalida"` is hardcoded. If multiple admins are ever needed, or if the admin changes, this requires a code change and redeploy.

**Recommendation:** Consider making this an environment variable (`ADMIN_USERNAME` in `wrangler.toml`). Low priority since this is a personal site.

**Resolution:** Admin username is now configurable via `env.ADMIN_USERNAME` with fallback to the
default in `config.ts`. Updated `ChatRoom`, `api.ts`, and the `Env` type.

---

## Summary Table

| ID | Finding | Category | Severity | Status |
|----|---------|----------|----------|--------|
| SEC-API-1 | No WebSocket origin validation | Security | Medium | FIXED |
| SEC-API-2 | No rate limiting on auth endpoint | Security | Medium | FIXED |
| SEC-API-3 | No rate limiting on chat messages | Security | Medium | FIXED |
| SEC-API-4 | Timing-unsafe admin secret comparison | Security | Low | FIXED |
| SEC-API-5 | ClientMessage data not runtime-validated | Security | Low | FIXED |
| SEC-API-6 | Storage key "blockedIps" is misleading | Security | Low | FIXED |
| READ-API-1 | chat-room.ts is 662-line God Object | Readability | High | FIXED |
| READ-API-2 | Inconsistent authorization error handling | Readability | Medium | FIXED |
| READ-API-3 | Mixed async/sync handler patterns | Readability | Low | FIXED |
| READ-API-4 | Underscore prefix convention misuse | Readability | Low | FIXED |
| TEST-API-1 | Moderation flow has zero test coverage | Testability | Medium | FIXED |
| TEST-API-2 | Location/weather success paths untested | Testability | Medium | FIXED |
| TEST-API-3 | config.ts has no unit tests | Testability | Medium | FIXED |
| TEST-API-4 | flush() uses arbitrary 200ms delay | Testability | Medium | FIXED |
| TEST-API-5 | No test coverage configuration | Testability | Medium | FIXED |
| TEST-API-6 | Weather input validation has no tests | Testability | Low | FIXED |
| MAINT-API-1 | chat-room.ts handles too many concerns | Maintainability | High | FIXED |
| MAINT-API-2 | Fire-and-forget storage operations | Maintainability | Medium | FIXED |
| MAINT-API-3 | clearMessages broadcasts individual REMOVEs | Maintainability | Medium | FIXED |
| MAINT-API-4 | No migration strategy for storage schema | Maintainability | Medium | FIXED |
| MAINT-API-5 | uuid package for v7 only | Maintainability | Low | FIXED |
| MAINT-API-6 | Admin username hardcoded | Maintainability | Low | FIXED |

**Totals: 22 findings — 22 FIXED, 0 Open.**

---

## Cross-Reference: App Audit Findings Requiring API Changes

The following app audit findings (from `2026-03-05-app-code-audit.md`) require API-side changes:

| App Finding | Description | API Impact |
|-------------|-------------|------------|
| SEC-2 | Admin token stored as plaintext in localStorage | API must generate and validate session tokens instead of raw password comparison |
| SEC-3 | Admin token sent over unencrypted WebSocket | API should validate WebSocket origin and enforce wss:// |

**SEC-2 implementation approach:**
1. API: Add session token generation in `/auth` — return a signed, time-limited token (HMAC-SHA256 with `ADMIN_SECRET` as key)
2. API: Modify `handleJoin` to accept and validate session tokens alongside the raw secret (backward compat)
3. App: Store session token instead of raw password in `sessionStorage` (tab-scoped)
4. App: Send session token on WebSocket join

**SEC-3 implementation approach:**
1. API: Add WebSocket origin validation (SEC-API-1 above covers this)
2. App: Enforce `wss://` protocol for non-localhost environments in WebSocket URL construction
