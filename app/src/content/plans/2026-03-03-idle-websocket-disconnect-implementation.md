---
title: Idle WebSocket Disconnect Implementation Plan
description: >-
  Disconnect idle chat WebSockets after 5 minutes to reduce Cloudflare Durable
  Object duration usage on the free tier.
publishedOn: 2026-03-04T03:18:40.000Z
subcategory: idle-websocket-disconnect
category: chat
tags: [implementation]
---

# Idle WebSocket Disconnect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Disconnect idle chat WebSockets after 5 minutes to reduce Cloudflare Durable Object duration usage on the free tier.

**Architecture:** Extract idle detection logic into a testable module (`chat-idle.ts`) that tracks tab visibility and user interaction, then integrate it into the existing `chat-client.ts` to control connect/disconnect. Client-only changes — no server modifications.

**Tech Stack:** TypeScript, Vitest, browser APIs (visibilitychange, Page Visibility API)

---

### Task 1: Create the idle manager module with tests

**Files:**
- Create: `app/src/components/Chat/chat-idle.ts`
- Create: `app/src/components/Chat/__tests__/chat-idle.test.ts`

**Step 1: Write the failing tests**

File: `app/src/components/Chat/__tests__/chat-idle.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createIdleManager } from "@components/Chat/chat-idle";

describe("createIdleManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllTimers();
  });

  it("calls onIdle after timeout when tab is hidden", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(5000);

    expect(onIdle).toHaveBeenCalledOnce();
    expect(onActive).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("does not call onIdle if tab becomes visible before timeout", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(3000);
    manager.handleVisibilityChange(false); // visible again

    vi.advanceTimersByTime(5000);

    expect(onIdle).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("calls onActive when tab becomes visible while idle", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(5000); // triggers idle
    manager.handleVisibilityChange(false); // visible again

    expect(onActive).toHaveBeenCalledOnce();

    manager.destroy();
  });

  it("calls onActive when user interacts while idle", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(5000); // triggers idle
    manager.handleActivity(); // user interaction

    expect(onActive).toHaveBeenCalledOnce();

    manager.destroy();
  });

  it("does not call onActive on interaction when not idle", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleActivity();

    expect(onActive).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("does not start timer when tab is visible", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(false); // visible
    vi.advanceTimersByTime(10000);

    expect(onIdle).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("resets idle state on reconnect so the cycle can repeat", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    // First cycle: go idle, come back
    manager.handleVisibilityChange(true);
    vi.advanceTimersByTime(5000);
    expect(onIdle).toHaveBeenCalledOnce();

    manager.handleVisibilityChange(false); // triggers onActive
    expect(onActive).toHaveBeenCalledOnce();

    // Second cycle: go idle again
    manager.handleVisibilityChange(true);
    vi.advanceTimersByTime(5000);
    expect(onIdle).toHaveBeenCalledTimes(2);

    manager.destroy();
  });

  it("exposes isIdle state", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    expect(manager.isIdle).toBe(false);

    manager.handleVisibilityChange(true);
    vi.advanceTimersByTime(5000);
    expect(manager.isIdle).toBe(true);

    manager.handleVisibilityChange(false);
    expect(manager.isIdle).toBe(false);

    manager.destroy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `just app::test -- app/src/components/Chat/__tests__/chat-idle.test.ts`
Expected: FAIL — module `chat-idle` does not exist

**Step 3: Write the implementation**

File: `app/src/components/Chat/chat-idle.ts`

```typescript
interface IdleManagerOptions {
  onIdle: () => void;
  onActive: () => void;
  timeoutMs: number;
}

interface IdleManager {
  isIdle: boolean;
  handleVisibilityChange: (hidden: boolean) => void;
  handleActivity: () => void;
  destroy: () => void;
}

export function createIdleManager(options: IdleManagerOptions): IdleManager {
  const { onIdle, onActive, timeoutMs } = options;
  let idle = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearIdleTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function startIdleTimer(): void {
    clearIdleTimer();
    timer = setTimeout(() => {
      timer = null;
      idle = true;
      onIdle();
    }, timeoutMs);
  }

  function wake(): void {
    if (idle) {
      idle = false;
      onActive();
    }
  }

  const manager: IdleManager = {
    get isIdle() {
      return idle;
    },

    handleVisibilityChange(hidden: boolean) {
      if (hidden) {
        startIdleTimer();
      } else {
        clearIdleTimer();
        wake();
      }
    },

    handleActivity() {
      wake();
    },

    destroy() {
      clearIdleTimer();
    },
  };

  return manager;
}
```

**Step 4: Run tests to verify they pass**

Run: `just app::test -- app/src/components/Chat/__tests__/chat-idle.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add app/src/components/Chat/chat-idle.ts app/src/components/Chat/__tests__/chat-idle.test.ts
git commit -m "feat(chat): add idle detection manager with tests"
```

---

### Task 2: Integrate idle manager into chat-client.ts

**Files:**
- Modify: `app/src/components/Chat/chat-client.ts`

**Step 1: Add import and constant**

At the top of `chat-client.ts`, add the import after the existing imports (line 2):

```typescript
import { createIdleManager } from "@components/Chat/chat-idle";
```

Add the timeout constant after `RECONNECT_DELAY_MS` (line 4):

```typescript
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
```

**Step 2: Add the idle manager variable**

After the `reconnectTimer` declaration (line 82), add:

```typescript
let idleManager: ReturnType<typeof createIdleManager> | null = null;
```

**Step 3: Modify `scheduleReconnect()` to skip reconnect when idle**

Change `scheduleReconnect()` (lines 304-310) from:

```typescript
function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}
```

To:

```typescript
function scheduleReconnect(): void {
  if (idleManager?.isIdle) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}
```

**Step 4: Initialize idle manager and attach DOM listeners**

Replace the initialization block at the bottom (lines 433-436) from:

```typescript
fetchConfig().then(() => {
  loadIdentity();
  connect();
});
```

To:

```typescript
fetchConfig().then(() => {
  loadIdentity();
  connect();

  idleManager = createIdleManager({
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      ws?.close();
    },
    onActive() {
      connect();
    },
  });

  document.addEventListener("visibilitychange", () => {
    idleManager?.handleVisibilityChange(document.hidden);
  });

  const chatEl = document.querySelector('[data-chat="panel"]');
  if (chatEl) {
    for (const event of ["mousemove", "keydown", "touchstart"] as const) {
      chatEl.addEventListener(event, () => idleManager?.handleActivity(), { passive: true });
    }
  }
});
```

**Step 5: Run all tests to verify nothing is broken**

Run: `just app::test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add app/src/components/Chat/chat-client.ts
git commit -m "feat(chat): disconnect WebSocket after 5 min idle, reconnect on activity"
```

---

### Task 3: Verify the chat panel data attribute exists

**Files:**
- Check: `app/src/components/Chat/Chat.astro`

**Step 1: Verify `data-chat="panel"` exists on the chat container**

Search `Chat.astro` for `data-chat="panel"`. If it doesn't exist, add it to the outermost chat container element.

**Step 2: Run the full test suite**

Run: `just app::test`
Expected: All tests PASS

**Step 3: Commit (only if Chat.astro was modified)**

```bash
git add app/src/components/Chat/Chat.astro
git commit -m "fix(chat): add panel data attribute for idle detection listeners"
```

---

### Task 4: Build verification

**Step 1: Run the app build**

Run: `just app::build`
Expected: Build succeeds with no TypeScript errors

**Step 2: Commit the design doc**

```bash
git add docs/plans/2026-03-03-idle-websocket-disconnect-design.md docs/plans/2026-03-03-idle-websocket-disconnect-implementation.md
git commit -m "docs: add idle websocket disconnect design and implementation plan"
```
