---
title: App Code & Security Audit
description: >-
  The app is well-architected for its purpose — an Astro 5 SSG personal site
  with a real-time chat feature and an interactive live-window web component.
  The codebase demonstrates strong engineering in several areas:
publishedOn: 2026-03-05T21:22:33.000Z
subcategory: app-code-audit
category: code-quality
tags: [implementation]
---

# App Code & Security Audit

**Date:** 2026-03-05
**Scope:** `app/src/`, config files (`astro.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `tsconfig.json`)
**Out of scope:** API worker, `node_modules`, `.astro/` generated files, content markdown prose

---

## Executive Summary

The app is well-architected for its purpose — an Astro 5 SSG personal site with a real-time chat feature and an interactive live-window web component. The codebase demonstrates strong engineering in several areas:

**What's done well:**
- Chat messages use `.textContent` (not `innerHTML`) for all user-supplied text — inherently XSS-safe
- The live-window module has excellent separation of concerns: pure utilities, typed state, clean component interfaces
- Environment variables correctly use Astro's `PUBLIC_` prefix — no secrets are leaked client-side
- Username validation includes explicit XSS payload test cases
- Test names describe behavior, not implementation — strong testing culture
- Content rendering is all build-time SSG — minimal client-side attack surface

**Top 5 findings to address:**

1. **No Content Security Policy headers** — any XSS vector gets unrestricted access (Security / Medium)
2. **`chat-client.ts` is a 465-line monolith** with module-level side effects, untestable and hard to navigate (Readability+Testability+Maintainability / High)
3. **Page templates are heavily duplicated** — `[...page].astro` and `[category]/[...page].astro` share ~90% of their code (Maintainability / High)
4. **WebSocket messages parsed without error handling or validation** — malformed JSON crashes the chat client (Security+Maintainability / Medium-High)
5. **Multiple untested pure functions** — `remark-extract-recipe.mjs`, `card-utils.ts`, `link-metadata.ts` have zero test coverage despite being trivially testable (Testability / High)

---

## Security

### SEC-1: No Content Security Policy (CSP) Headers
**Severity: Medium** | `src/layouts/BaseLayout/BaseLayout.astro`, `public/` (no `_headers` file)

No CSP header is configured anywhere. The site loads external resources (Google Fonts, Font Awesome from cdnjs, Spotify embed iframe). Without CSP, any XSS vulnerability would have unrestricted script execution and data exfiltration capability — including access to the admin token in localStorage.

**Recommendation:** Create a `public/_headers` file for Cloudflare Pages with `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy`. Start with `Content-Security-Policy-Report-Only` to validate before enforcing. Note: `is:inline` scripts in `login.astro`/`logout.astro` will require `'unsafe-inline'` or switching to external scripts.

### SEC-2: Admin Token Stored as Plaintext in localStorage — FIXED
**Severity: Medium** | `src/pages/login.astro:68`, `src/components/Chat/chat-client.ts:97-99`

The raw admin password is stored in localStorage indefinitely. Any XSS, browser extension, or shared device access exposes the credential. No expiration mechanism exists.

**Recommendation:** Have the `/auth` API return a short-lived session token (JWT or opaque) instead of trusting the raw password. Consider `sessionStorage` to scope the credential to the tab. Add a TTL mechanism.

**Resolution:** API `/auth` now returns an HMAC-SHA256 session token (24h TTL) instead of echoing the raw password. App stores the token in `sessionStorage` (tab-scoped, clears on close). Login/logout pages clear legacy `localStorage` tokens. See `api/src/session.ts`, `app/src/pages/login.astro`, `app/src/components/Chat/chat-connection.ts`.

### SEC-3: Admin Token Sent Over Potentially Unencrypted WebSocket — FIXED
**Severity: Medium** | `src/components/Chat/chat-client.ts:72-74,190-198`, `src/components/Chat/Chat.astro:2-3`

The WebSocket fallback is `ws://` (not `wss://`). The token is sent in the message body on every reconnection rather than during the handshake. Production likely uses `wss://` via the `PUBLIC_API_BASE_URL`, but there is no enforcement.

**Recommendation:** Enforce `wss://` for non-localhost environments. Consider authenticating during the WebSocket upgrade handshake.

**Resolution:** App now enforces `wss://` for non-localhost WebSocket connections.
API validates `Origin` header on WebSocket upgrades, rejecting disallowed origins with 403.
See `app/src/components/Chat/chat-connection.ts`, `api/src/api.ts:handleWebSocket`.

### SEC-4: WebSocket Messages Parsed Without Validation
**Severity: Medium** | `src/components/Chat/chat-client.ts:212`

`JSON.parse(event.data) as ServerMessage` — the `as` is compile-time only. No runtime validation of message structure. Malformed JSON will crash the chat client.

**Recommendation:** Wrap in try/catch. Add runtime validation that `data.type` is a known value before dispatching. A lightweight schema validator (Zod is already an Astro dependency) could enforce the full message shape.

### SEC-5: CSS Selector Injection via Message ID
**Severity: Low** | `src/components/Chat/chat-client.ts:250`

Server-provided `data.id` is used directly in `querySelector(\`[data-msg-id="${data.id}"]\`)`. Crafted IDs with CSS selector syntax could cause unexpected element selection.

**Recommendation:** Use `CSS.escape(data.id)` in the selector.

### SEC-6: Open Redirect via Chat Context Path
**Severity: Low** | `src/components/Chat/chat-client.ts:142-149`

`msg.context.path` from the server is set as an `href` without validation. A compromised server could send `javascript:` or external URLs.

**Recommendation:** Validate that `msg.context.path` starts with `/` before setting as `href`.

### SEC-7: External CDN Without Subresource Integrity
**Severity: Low** | `src/layouts/BaseLayout/BaseLayout.astro:54-65`

Font Awesome is loaded from `cdnjs.cloudflare.com` without an `integrity` attribute.

**Recommendation:** Add `integrity` attribute with the correct SRI hash, or self-host the Font Awesome CSS/fonts.

### SEC-8: Unsandboxed Spotify Iframe
**Severity: Low** | `src/components/SpotifyPlayer/SpotifyPlayer.astro:7-20`

The Spotify embed has a broad `allow` attribute but no `sandbox` attribute.

**Recommendation:** Add `sandbox="allow-scripts allow-same-origin allow-popups"`.

### SEC-9: API Response Data Used Without Validation
**Severity: Low** | `src/scripts/live-window/api.ts:54-71,83-101`

`fetchLocation` and `fetchWeather` use `res.json()` results directly without type or range validation.

**Recommendation:** Validate API responses against expected shapes before use.

### SEC-10: innerHTML Used to Clear Chat Messages
**Severity: Low** | `src/components/Chat/chat-client.ts:221`

`messagesEl.innerHTML = ""` — functionally safe (constant string) but sets a precedent.

**Recommendation:** Replace with `messagesEl.replaceChildren()`.

---

## Readability

### READ-1: `chat-client.ts` Message Handler is a 90-line if/else-if Chain
**Severity: High** | `src/components/Chat/chat-client.ts:211-296`

14 chained `else if` blocks comparing `data.type` to constants with inline logic. Hard to locate a specific message type handler, and adding new types extends an already long chain.

**Recommendation:** Refactor to a dispatch map:
```ts
const handlers: Record<string, (data: ServerMessage) => void> = {
  [SERVER_MESSAGE_TYPE.JOINED]: handleJoined,
  [SERVER_MESSAGE_TYPE.HISTORY]: handleHistory,
  // ...
};
```

### READ-2: `chat-client.ts` Uses 7 Module-Level Mutable Variables
**Severity: Medium** | `src/components/Chat/chat-client.ts:78-85`

`ws`, `username`, `clientId`, `adminUsername`, `isOwner`, `pendingRename`, `reconnectTimer` — all `let` at module scope. Any function can read or mutate them, making data flow hard to trace.

**Recommendation:** Group into a single state object or encapsulate in a `createChatClient()` factory.

### READ-3: `CommandPalette.ts` is 333 Lines With No Modular Structure
**Severity: Medium** | `src/components/CommandPalette/CommandPalette.ts`

One function (`initCommandPalette`) wrapping 13+ nested inner functions. Hard to scan.

**Recommendation:** Extract data/rendering logic into a separate module. Move duplicated format functions to shared utilities.

### READ-4: `nav-data.ts` Mixes Data Fetching, Display Formatting, and Navigation Config
**Severity: Medium** | `src/lib/nav-data.ts`

Types, navigation constants, async data-fetching, and display formatting helpers all in one file. A reader looking for "how to format a category name" has to open a file named `nav-data` and scroll past data-fetching logic.

**Recommendation:** Split formatting helpers (`isValidDate`, `formatDate`, `categoryDisplay`) into `src/lib/format-utils.ts`.

### READ-5: `BlindsComponent` Uses `as unknown as Record<string, number>` Double-Cast
**Severity: Medium** | `src/scripts/live-window/components/BlindsComponent.ts:124,127`

Bypasses TypeScript's type system to access properties by string key. A junior would not understand why this is needed.

**Recommendation:** Use typed accessor methods or `keyof BlindsState` indexing — the double cast through `unknown` is unnecessary.

### READ-6: `slot` Function Name is Overloaded and Cryptic
**Severity: Medium** | `src/components/Chat/chat-client.ts:132`, `src/components/CommandPalette/CommandPalette.ts:198`

Both files define `slot = (name) => root.querySelector(...)`. The name "slot" collides with Astro/Web Component terminology.

**Recommendation:** Rename to `el`, `query`, or `selectChild`.

### READ-7: Magic Numbers Without Comments in Sky/Stars/Weather Code
**Severity: Medium** | Multiple files

- `PHASE_OPACITY` in `stars.ts:65-73` — bare numeric phase indices with no labels
- `ICON_WEATHER_MAP` in `WeatherLayer.ts:3-20` — opaque OpenWeatherMap icon codes
- `charW = 6.8`, `h = 34` in `card-utils.ts:25-26` — SVG sizing magic numbers
- `% 16` in `stars.ts:82` — total sky phases as magic number

**Recommendation:** Add inline comments explaining what each value means. Import `SKY_PHASES.length` instead of hardcoding `16`.

### READ-8: Duplicated Logic Across Files
**Severity: Medium** | Multiple files

- `categoryDisplay` / `formatCategory` — identical logic in `nav-data.ts:113-116` and `CommandPalette.ts:172-177`
- `formatDate` / `formatDateClient` — identical in `nav-data.ts:109-111` and `CommandPalette.ts:179-181`
- `tempSymbol` exported in `api.ts:24-26` but inlined in `InfoPanelComponent.ts:73`
- Phase-finding logic duplicated between `sky-gradient.ts:287-308` and `phase.ts:35-55`
- Sunrise/sunset fallback defaults in `sky-gradient.ts:167-174` vs `SunLayer.ts:17-18` and `MoonLayer.ts:18-19`

**Recommendation:** Extract shared utilities to isomorphic modules. Use `getDefaultSunTimes()` everywhere.

### READ-9: Inconsistent Hardcoded Colors
**Severity: Low** | `Chat.astro:133-138`, `astro.config.mjs:31-43`, `index.astro:143`

Hardcoded hex values (`#f87171`, `#facc15`, `#0d1f2d`, `#e74c3c`) instead of theme tokens. Some match CSS variables but aren't referenced from a shared source.

**Recommendation:** Use `var(--color-*)` where possible. Add comments cross-referencing theme tokens where CSS variables can't be used (e.g., JS config).

---

## Testability

### TEST-1: Multiple Pure Functions Have Zero Test Coverage
**Severity: High** | Multiple files

| File | Pure Functions | Priority |
|------|---------------|----------|
| `src/plugins/remark-extract-recipe.mjs` | `flattenIngredients`, `extractSteps`, `nodeText` | High |
| `src/components/Card/card-utils.ts` | `pickColor`, `tileSvg` | Medium |
| `src/lib/link-metadata.ts` | `getFaviconUrl`, `parseMetadata` | Medium |
| `src/lib/nav-data.ts` | `isValidDate`, `formatDate`, `categoryDisplay` | Medium |
| `src/scripts/live-window/api.ts` | `isSameDate`, `tempSymbol` | Medium |

**Recommendation:** Write tests for these — they are pure, side-effect-free, and trivially testable.

### TEST-2: `chat-client.ts` is Completely Untestable
**Severity: High** | `src/components/Chat/chat-client.ts`

The module executes DOM queries (lines 87-96), adds event listeners (lines 355-368), and initiates network requests (lines 437-465) as top-level statements on import. No function is exported. The entire file is a side-effect-only module.

**Recommendation:** Refactor to an `initChat(options)` pattern that accepts a container element and WebSocket constructor, returns control methods. The pure sub-modules (`chat-utils`, `chat-render`, `chat-idle`) are already well separated — the orchestration layer needs the same treatment.

### TEST-3: `fetchLocation` and `fetchWeather` Async Functions are Untested
**Severity: Medium** | `src/scripts/live-window/api.ts:48-102`

The API test file only tests pure helpers (`resolveUnits`, `shouldFetchLocation`, `shouldFetchWeather`). The async fetch functions with conditional logic and error handling have zero coverage.

**Recommendation:** Add tests with mocked `fetch` covering success, non-OK response, network error, null lat/lng, and rate-limit short-circuit.

### TEST-4: `chat-logic.test.ts` is Mislocated and Misnamed
**Severity: Medium** | `src/scripts/__tests__/chat-logic.test.ts`

Tests `chat-utils.ts` but lives in `src/scripts/__tests__/` instead of `src/components/Chat/__tests__/`, and is named `chat-logic` instead of `chat-utils`.

**Recommendation:** Move to `src/components/Chat/__tests__/chat-utils.test.ts`.

### TEST-5: `makeState()` Test Helper Duplicated Across 7 Files
**Severity: Medium** | Multiple test files in `src/scripts/live-window/__tests__/`

Each component test defines its own `makeState()` factory with slight variations. Changes to `LiveWindowState` require updating 7+ files.

**Recommendation:** Extract a shared `createTestState(overrides?)` factory into `__tests__/helpers.ts`. The source already has `createDefaultState()` in `state.ts` which could serve as the foundation.

### TEST-6: No Coverage Configuration
**Severity: Medium** | `vitest.config.ts`

No `coverage` configuration exists. No way to measure or enforce minimum coverage thresholds.

**Recommendation:** Add coverage configuration with `provider: "v8"`, appropriate `include`/`exclude`, and consider setting thresholds after establishing a baseline.

### TEST-7: Vitest/TSConfig Path Alias Mismatch
**Severity: Medium** | `vitest.config.ts:7-16` vs `tsconfig.json:6-14`

Vitest aliases use different wildcard semantics than tsconfig. Works today due to Vite's flexible resolver, but can cause confusing breakages.

**Recommendation:** Use `vite-tsconfig-paths` plugin to automatically mirror tsconfig paths, or align the aliases manually.

### TEST-8: Manual localStorage Mock Bypasses jsdom
**Severity: Medium** | `src/scripts/live-window/__tests__/state.test.ts:5-16`

Custom `localStorageMock` overrides `globalThis.localStorage` via `Object.defineProperty`, missing `clear()`, `length`, and `key()` methods.

**Recommendation:** Use jsdom's built-in `localStorage` and `localStorage.clear()` in `beforeEach`, or use `vi.stubGlobal()`.

### TEST-9: Weak Assertion in Clock Test
**Severity: Low** | `src/scripts/live-window/__tests__/components/ClockComponent.test.ts:111`

"Falls back to local time" only asserts `expect(hourEl.textContent).toBeTruthy()` — could match any string.

**Recommendation:** Set a fake system time and assert the specific expected hour value.

### TEST-10: Missing Edge Cases in `truncateMiddle` and `formatMessageTime`
**Severity: Low** | `src/components/Chat/__tests__/chat-render.test.ts`

`truncateMiddle` doesn't test `maxLen=0` or negative values. `formatMessageTime` doesn't test the exact 24-hour boundary.

**Recommendation:** Add boundary/edge case tests.

---

## Maintainability

### MAINT-1: Page Template Duplication
**Severity: High** | `src/pages/[collection]/[...page].astro`, `src/pages/[collection]/[category]/[...page].astro`

These two files share ~90% of their code: same `PAGE_SIZE`, same 9-line inline type literal, same destructuring, same template. The only differences are category filtering and title string.

**Recommendation:** Extract shared type into a named type. Extract `PAGE_SIZE` to a shared constant. Consider a single page template with optional category param.

### MAINT-2: WebSocket JSON.parse Has No Error Handling
**Severity: High** | `src/components/Chat/chat-client.ts:212`

Malformed JSON from the server will throw an unhandled exception that crashes the entire chat client.

**Recommendation:** Wrap in try/catch with a warning log and early return.

### MAINT-3: `LS_ADMIN_TOKEN_KEY` Defined in Three Locations
**Severity: Medium** | `src/components/Chat/chat-utils.ts:1`, `src/pages/login.astro:5`, `src/pages/logout.astro:3`

The string `"admin_token"` is redeclared in three files.

**Recommendation:** Create a shared `src/lib/constants.ts` with the single source of truth. Astro pages can pass it via `define:vars`.

### MAINT-4: Hardcoded `routable` Collection Set
**Severity: Medium** | `src/pages/[collection]/post/[...id].astro:11`

`new Set(["projects", "guides", "gallery", "recipes", "versions"])` must be manually kept in sync with `COLLECTION_NAMES`.

**Recommendation:** Derive: `new Set(COLLECTION_NAMES.filter(name => name !== "links"))`.

### MAINT-5: Nine Unsafe `querySelector` Casts at Module Scope
**Severity: Medium** | `src/components/Chat/chat-client.ts:87-110`

All cast with `as HTMLInputElement` etc. If any element is missing, these become silent `null` values that throw later.

**Recommendation:** Add a null guard that bails out early if the chat panel isn't in the DOM, or use a helper that throws a descriptive error.

### MAINT-6: GradientLayer Writes to Shared Mutable State
**Severity: Medium** | `src/scripts/live-window/components/sky/GradientLayer.ts:15`

`state.ref.currentGradient = gradient` — creates an invisible ordering dependency between components.

**Recommendation:** Document the dependency explicitly in `types.ts`, or have `SkyComponent` compute and pass the gradient to children.

### MAINT-7: Silent Error Swallowing in State Persistence
**Severity: Medium** | `src/scripts/live-window/state.ts:48-50,57-59`

Empty catch blocks with `/* ignore */`. No logging when localStorage operations fail.

**Recommendation:** Add `console.debug` to log failures even when gracefully falling back.

### MAINT-8: Inconsistent API Base URL Fallbacks
**Severity: Low** | `src/pages/login.astro:4`, `src/components/Chat/Chat.astro:2`, `src/components/Chat/chat-client.ts:73`, `src/pages/index.astro:8`

Some default to `"http://localhost:8787"`, one defaults to `""`, `chat-client.ts` defaults to `"ws://localhost:8787/ws"`.

**Recommendation:** Centralize in `site-config.ts`.

### MAINT-9: `allTags` Computed But Never Consumed
**Severity: Low** | `src/lib/nav-data.ts:27,96`

`NavCollection.allTags` is computed for every collection but never read by any consumer.

**Recommendation:** Remove or start using it.

### MAINT-10: Dead Code — Unused CSS Classes and Exports
**Severity: Low** | Multiple files

- `.chat-delete-confirm` / `.chat-flag-confirm` in `Chat.astro:133-138` — never applied
- `.home-timeline__item--current` in `index.astro:170-173` — never applied
- `login-error` class in `login.astro:27` — never defined in CSS
- `generateRandomUsername` / `COLORS` / `ANIMALS` in `chat-utils.ts` — never called from production code
- `relativeLuminance` / `contrastRatio` / `getReadableColor` in `color.ts:31-118` — only imported in tests
- `DEFAULT_STATE` alias in `state.ts:12-13` — backward compat alias that should be cleaned up
- `subtitle` and `rating` schema fields in `content.config.ts:99,109` — defined but never rendered

**Recommendation:** Remove dead code. If color utilities are kept for future use, add a comment.

### MAINT-11: `live-window-test.astro` Shipped to Production
**Severity: Medium** | `src/pages/live-window-test.astro`

Development/testing page with 8 live-window instances. Built and deployed, accessible at `/live-window-test/`.

**Recommendation:** Move out of `src/pages/`, add `noindex`, or gate behind an environment check.

### MAINT-12: Build-Only Dependencies Listed as Runtime
**Severity: Low** | `package.json`

`he` and `yaml` are listed as `dependencies` but only run during build. Should be `devDependencies`.

**Recommendation:** Move to `devDependencies`.

---

## Summary Table

| ID | Finding | Category | Severity | Status |
|----|---------|----------|----------|--------|
| SEC-1 | No CSP headers | Security | Medium | FIXED |
| SEC-2 | Admin token plaintext in localStorage | Security | Medium | FIXED |
| SEC-3 | Token over unencrypted WebSocket | Security | Medium | FIXED |
| SEC-4 | WebSocket messages parsed without validation | Security | Medium | FIXED |
| SEC-5 | CSS selector injection via message ID | Security | Low | FIXED |
| SEC-6 | Open redirect via chat context path | Security | Low | FIXED |
| SEC-7 | No SRI on external CDN | Security | Low | FIXED |
| SEC-8 | Unsandboxed Spotify iframe | Security | Low | FIXED |
| SEC-9 | Unvalidated API responses | Security | Low | FIXED |
| SEC-10 | innerHTML used to clear messages | Security | Low | FIXED |
| READ-1 | 90-line if/else-if message handler | Readability | High | FIXED |
| READ-2 | 7 module-level mutable variables | Readability | Medium | FIXED |
| READ-3 | CommandPalette.ts 333 lines, no modules | Readability | Medium | FIXED |
| READ-4 | nav-data.ts mixes 4 concerns | Readability | Medium | FIXED |
| READ-5 | Double-cast in BlindsComponent | Readability | Medium | FIXED |
| READ-6 | `slot` function name is misleading | Readability | Medium | FIXED |
| READ-7 | Magic numbers without comments | Readability | Medium | FIXED |
| READ-8 | Duplicated logic across files | Readability | Medium | FIXED |
| READ-9 | Inconsistent hardcoded colors | Readability | Low | FIXED |
| TEST-1 | Pure functions with zero test coverage | Testability | High | FIXED |
| TEST-2 | chat-client.ts completely untestable | Testability | High | FIXED |
| TEST-3 | Async fetch functions untested | Testability | Medium | FIXED |
| TEST-4 | Mislocated/misnamed test file | Testability | Medium | FIXED |
| TEST-5 | makeState() duplicated across 7 tests | Testability | Medium | FIXED |
| TEST-6 | No coverage configuration | Testability | Medium | FIXED |
| TEST-7 | Vitest/TSConfig alias mismatch | Testability | Medium | FIXED |
| TEST-8 | Manual localStorage mock | Testability | Medium | FIXED |
| TEST-9 | Weak assertion in clock test | Testability | Low | FIXED |
| TEST-10 | Missing edge cases | Testability | Low | FIXED |
| MAINT-1 | Page template duplication | Maintainability | High | FIXED |
| MAINT-2 | No error handling for JSON.parse | Maintainability | High | FIXED |
| MAINT-3 | LS_ADMIN_TOKEN_KEY in 3 locations | Maintainability | Medium | FIXED |
| MAINT-4 | Hardcoded routable collection set | Maintainability | Medium | FIXED |
| MAINT-5 | Unsafe querySelector casts | Maintainability | Medium | FIXED |
| MAINT-6 | Shared mutable state in GradientLayer | Maintainability | Medium | FIXED |
| MAINT-7 | Silent error swallowing | Maintainability | Medium | FIXED |
| MAINT-8 | Inconsistent API URL fallbacks | Maintainability | Low | FIXED |
| MAINT-9 | allTags computed but unused | Maintainability | Low | FIXED |
| MAINT-10 | Dead code (CSS, exports, schema fields) | Maintainability | Low | FIXED |
| MAINT-11 | Test page shipped to production | Maintainability | Medium | FIXED |
| MAINT-12 | Build deps listed as runtime | Maintainability | Low | FIXED |

**Totals: 41 findings — 41 FIXED, 0 Open.**
