# Idle Blinds Design

## Summary

Lower the LiveWindow blinds when chat goes idle; raise them when the user becomes active again. On initial load, the blinds open via the same `openBlinds()` path (replacing the current one-shot `runAnimation` logic).

## Event Flow

1. **Chat dispatches events** — `chat-connection.ts` fires `chat:idle` and `chat:active` custom events on `document` from the existing idle manager's `onIdle` / `onActive` callbacks.
2. **Homepage script listens** — `index.astro`'s script block listens for `chat:idle` and `chat:active` on `document`, calls `closeBlinds()` / `openBlinds()` on the `<live-window>` element.
3. **LiveWindow delegates** — `LiveWindowElement` exposes public `closeBlinds()` and `openBlinds()` methods that delegate to `BlindsComponent`.

## BlindsComponent Changes

### New public API

- `openBlinds()` — runs the existing two-step open animation (rotate slats open, then collapse upward). Called on initial load and when chat becomes active.
- `closeBlinds()` — smooth simultaneous animation: `numBlindsCollapsed → 0` (uncollapse all slats) and `blindsOpenDeg → 20` (rotate flat/closed). All slats move at once.
- Track `isOpen` boolean to prevent redundant animations and cancel in-flight animations when direction changes.

### Cleanup

- Remove the `animationStarted` flag and the `update()` trigger. The initial load path in `LiveWindow.startUpdates()` calls `openBlinds()` directly instead.
- `runAnimation()` becomes the internal implementation of `openBlinds()`.
- The `stepAnimation` helper stays — both open and close use it.

## Files Modified

1. `app/src/components/Chat/chat-connection.ts` — dispatch `chat:idle` / `chat:active` custom events on `document`
2. `app/src/scripts/live-window/components/BlindsComponent.ts` — add `openBlinds()` / `closeBlinds()`, remove `animationStarted` flag, track `isOpen` state
3. `app/src/scripts/live-window/LiveWindow.ts` — expose public `closeBlinds()` / `openBlinds()`, call `openBlinds()` in `startUpdates()`
4. `app/src/pages/index.astro` — listen for `chat:idle` / `chat:active`, call methods on `<live-window>`
